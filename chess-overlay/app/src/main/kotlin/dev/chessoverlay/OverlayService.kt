package dev.chessoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import dev.chessoverlay.core.BoardRect
import dev.chessoverlay.core.CastlingTracker
import dev.chessoverlay.core.ChessVision
import dev.chessoverlay.core.FrameSignature
import dev.chessoverlay.core.Orientation
import dev.chessoverlay.core.Pixels
import dev.chessoverlay.core.Side
import dev.chessoverlay.core.Templates
import dev.chessoverlay.core.TurnTracker
import dev.chessoverlay.core.VisionResult
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * A draggable button over every app. Tap it to open a small menu: turn auto-hints ON/OFF, choose which
 * side you are playing (default: whoever is at the bottom of the board), or quit. Long-press the button,
 * or tap the notification, to quit.
 *
 * While ON, a loop watches the board a few times a second. When something moves it removes the old
 * arrow, waits for the board to stop changing, reads the position, works out whose turn it is, and
 * - if it is the player's turn (the side at the bottom) - asks Stockfish and draws the new arrow.
 */
class OverlayService : Service() {
    private lateinit var wm: WindowManager
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadScheduledExecutor()

    private var projection: MediaProjection? = null
    private var capturer: ScreenCapturer? = null
    private var button: TextView? = null
    private var buttonBg: GradientDrawable? = null
    private var hintView: HintOverlayView? = null

    private var vision: ChessVision? = null
    private var engine: StockfishEngine? = null

    @Volatile private var auto = false
    @Volatile private var menuOpen = false          // loop is paused while the menu covers the screen
    @Volatile private var mySide: Side? = null      // null = Auto: the side at the bottom of the board
    @Volatile private var lastBottom: Side? = null  // what Auto currently resolves to, for the menu label
    private var menu: View? = null
    private var buttonLp: WindowManager.LayoutParams? = null

    // ---- state below is only touched on the worker thread ----
    private class Hint(val rect: BoardRect, val orientation: Orientation, val uci: String, val score: String?)

    private var rect: BoardRect? = null
    private var prevSample: IntArray? = null
    private var dirty = false
    private var lastChangeAt = 0L
    private var lastAttemptAt = 0L
    private var failCount = 0
    private var lastPlacement: String? = null
    private var lastHint: Hint? = null
    private var castling = CastlingTracker()
    private var turns = TurnTracker()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null || intent.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (capturer != null) return START_NOT_STICKY

        startAsForeground()

        val code = intent.getIntExtra(EXTRA_CODE, 0)
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(EXTRA_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION") intent.getParcelableExtra(EXTRA_DATA)
        }
        if (data == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        wm = getSystemService(WindowManager::class.java)
        mySide = when (getSharedPreferences("prefs", MODE_PRIVATE).getString("side", "auto")) {
            "white" -> Side.WHITE
            "black" -> Side.BLACK
            else -> null
        }
        val mpm = getSystemService(MediaProjectionManager::class.java)
        val proj = mpm.getMediaProjection(code, data)
        // Android 14 requires a callback to be registered before creating the virtual display.
        proj.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() { main.post { stopSelf() } }
        }, main)
        projection = proj

        val bounds = wm.maximumWindowMetrics.bounds
        capturer = ScreenCapturer(proj, bounds.width(), bounds.height(), resources.displayMetrics.densityDpi)
        vision = ChessVision(loadTemplates())

        addHintLayer(bounds.width(), bounds.height())
        addButton()
        worker.scheduleWithFixedDelay({ pollSafely() }, 500, POLL_MS, TimeUnit.MILLISECONDS)
        return START_NOT_STICKY
    }

    // ---- overlay windows ------------------------------------------------------------------

    private fun addHintLayer(w: Int, h: Int) {
        val view = HintOverlayView(this)
        val lp = WindowManager.LayoutParams(
            w, h,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        }
        wm.addView(view, lp)
        hintView = view
    }

    private fun addButton() {
        val d = resources.displayMetrics.density
        val size = (56 * d).toInt()
        val bg = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setStroke((2 * d).toInt(), Color.WHITE)
        }
        buttonBg = bg
        val btn = TextView(this).apply {
            text = "♞"
            textSize = 26f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = bg
        }
        val lp = WindowManager.LayoutParams(
            size, size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (12 * d).toInt()
            y = (160 * d).toInt()
        }

        buttonLp = lp
        val slop = ViewConfiguration.get(this).scaledTouchSlop
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0
        var dragged = false
        val longPress = Runnable { if (!dragged) stopSelf() }
        btn.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX; downY = e.rawY; startX = lp.x; startY = lp.y; dragged = false
                    main.postDelayed(longPress, 1200)
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!dragged && Math.hypot((e.rawX - downX).toDouble(), (e.rawY - downY).toDouble()) > slop) {
                        dragged = true
                        main.removeCallbacks(longPress)
                    }
                    if (dragged) {
                        lp.x = startX + (e.rawX - downX).toInt()
                        lp.y = startY + (e.rawY - downY).toInt()
                        wm.updateViewLayout(btn, lp)
                    }
                }
                MotionEvent.ACTION_UP -> {
                    main.removeCallbacks(longPress)
                    if (!dragged) toggleMenu()
                }
                MotionEvent.ACTION_CANCEL -> main.removeCallbacks(longPress)
            }
            true
        }
        wm.addView(btn, lp)
        button = btn
        setButton("♞", on = false)
    }

    /** ON = green, OFF = grey. Text: ♞ ready, … waiting for the opponent / thinking, ! couldn't read the board. */
    private fun setButton(text: String, on: Boolean) {
        main.post {
            button?.text = text
            buttonBg?.setColor(if (on) Color.argb(230, 46, 160, 90) else Color.argb(200, 90, 100, 105))
        }
    }

    // ---- menu -----------------------------------------------------------------------------

    private fun toggleMenu() {
        if (menu != null) dismissMenu() else showMenu()
    }

    private fun showMenu() {
        val d = resources.displayMetrics.density
        fun px(v: Int) = (v * d).toInt()
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable().apply {
                cornerRadius = 14 * d
                setColor(Color.argb(242, 24, 32, 38))
                setStroke(px(1), Color.argb(120, 255, 255, 255))
            }
            setPadding(px(6), px(6), px(6), px(6))
        }
        fun title(label: String) = panel.addView(TextView(this).apply {
            text = label; textSize = 13f; setTextColor(Color.argb(170, 255, 255, 255))
            setPadding(px(14), px(10), px(14), px(2))
        })
        fun row(label: String, selected: Boolean = false, action: () -> Unit) = panel.addView(TextView(this).apply {
            text = label; textSize = 16f
            setTextColor(if (selected) Color.rgb(120, 230, 150) else Color.WHITE)
            setPadding(px(14), px(11), px(14), px(11))
            setOnClickListener { dismissMenu(); action() }
        })

        row(if (auto) "■   Turn hints OFF" else "▶   Turn hints ON") { toggleAuto() }
        title("I AM PLAYING")
        val bottom = lastBottom?.let { " (bottom = ${if (it == Side.WHITE) "white" else "black"})" } ?: ""
        row((if (mySide == null) "✓  " else "     ") + "Auto: side at the bottom$bottom", mySide == null) { setSide(null) }
        row((if (mySide == Side.WHITE) "✓  " else "     ") + "White", mySide == Side.WHITE) { setSide(Side.WHITE) }
        row((if (mySide == Side.BLACK) "✓  " else "     ") + "Black", mySide == Side.BLACK) { setSide(Side.BLACK) }
        row("✕   Quit") { stopSelf() }
        // Tapping anywhere outside the menu closes it.
        panel.setOnTouchListener { _, e ->
            if (e.action == MotionEvent.ACTION_OUTSIDE) { dismissMenu(); true } else false
        }

        val bounds = wm.maximumWindowMetrics.bounds
        val width = px(270)
        val btn = buttonLp ?: return
        val gap = px(8)
        val x = if (btn.x + px(56) + gap + width <= bounds.width()) btn.x + px(56) + gap
                else (btn.x - gap - width).coerceAtLeast(0)
        val y = btn.y.coerceAtMost(bounds.height() - px(340)).coerceAtLeast(0)
        val lp = WindowManager.LayoutParams(
            width, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.TOP or Gravity.START; this.x = x; this.y = y }
        menuOpen = true     // pause the watcher: the menu may cover the board
        wm.addView(panel, lp)
        menu = panel
    }

    private fun dismissMenu() {
        menu?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        menu = null
        menuOpen = false
    }

    private fun setSide(side: Side?) {
        mySide = side
        getSharedPreferences("prefs", MODE_PRIVATE).edit()
            .putString("side", when (side) { Side.WHITE -> "white"; Side.BLACK -> "black"; null -> "auto" }).apply()
        toast("Playing as: " + when (side) { Side.WHITE -> "White"; Side.BLACK -> "Black"; null -> "Auto (bottom of the board)" })
        if (auto) {
            // The old arrow was for the other side: drop it and re-read once the picture is clean.
            main.post { hintView?.clear() }
            worker.execute {
                lastHint = null
                lastPlacement = null
                if (rect != null) { dirty = true; lastChangeAt = System.currentTimeMillis() }
            }
        }
    }

    // ---- on / off -------------------------------------------------------------------------

    private fun toggleAuto() {
        if (auto) {
            auto = false
            hintView?.clear()
            setButton("♞", on = false)
            return
        }
        val cap = capturer ?: return
        auto = true
        setButton("…", on = true)
        val seq0 = cap.frameCount
        // Hide our own UI for the very first read so it is not in the screenshot.
        hintView?.clear()
        button?.visibility = View.INVISIBLE
        worker.execute {
            resetLoopState()
            try {
                cap.capture(seq0)
                Thread.sleep(120)
                val shot = cap.capture(0L, 100)
                main.post { button?.visibility = View.VISIBLE }
                if (shot == null) {
                    toast("No screen frame available")
                    switchOff()
                } else {
                    analyze(shot)
                }
            } catch (e: Exception) {
                main.post { button?.visibility = View.VISIBLE }
                toast("Error: ${e.message}")
                switchOff()
            }
        }
    }

    private fun switchOff() {
        auto = false
        main.post { hintView?.clear() }
        setButton("♞", on = false)
    }

    // ---- the watch loop (worker thread) ---------------------------------------------------

    private fun resetLoopState() {
        rect = null; prevSample = null; dirty = false; failCount = 0
        lastPlacement = null; lastHint = null
        lastAttemptAt = 0L; lastChangeAt = 0L
        castling = CastlingTracker(); turns = TurnTracker()
    }

    private fun pollSafely() {
        try { poll() } catch (e: Exception) { toast("Error: ${e.message}") }
    }

    private fun poll() {
        if (!auto || menuOpen) return
        val cap = capturer ?: return
        val now = System.currentTimeMillis()

        val r = rect
        if (r == null) {
            // Board not located yet (or lost): keep trying slowly.
            if (now - lastAttemptAt >= RETRY_MS) {
                lastAttemptAt = now
                cap.capture(0L, 100)?.let { analyze(it) }
            }
            return
        }

        val cur = cap.sample(r, SAMPLE_STEP) ?: return
        val prev = prevSample
        prevSample = cur
        if (prev != null && FrameSignature.differs(prev, cur)) {
            // Something on the board moved: the old arrow is stale, remove it right away.
            if (!dirty) main.post { hintView?.clear() }
            dirty = true
            lastChangeAt = now
            return
        }
        // Wait until the board has stopped changing (a piece may still be sliding), then read it.
        if (dirty && now - lastChangeAt >= SETTLE_MS) {
            dirty = false
            cap.capture(0L, 100)?.let { analyze(it) }
        }
    }

    /** Reads the board in [shot] and updates the arrow. Returns false if the board could not be read. */
    private fun analyze(shot: Pixels): Boolean {
        val cap = capturer ?: return false
        when (val r = vision!!.analyze(shot)) {
            is VisionResult.Fail -> {
                failCount++
                if (failCount == 1) toast(r.reason)
                setButton("!", on = true)
                main.post { hintView?.clear() }
                if (failCount >= 3) rect = null            // stop trusting the old location; re-find slowly
                else { dirty = true; lastChangeAt = System.currentTimeMillis() } // retry once things settle
                return false
            }
            is VisionResult.Ok -> {
                failCount = 0
                rect = r.rect
                val bottom = if (r.orientation.whiteAtBottom) Side.WHITE else Side.BLACK
                lastBottom = bottom
                val me = mySide ?: bottom
                val castlingRights = castling.update(r.position)
                val turn = turns.update(r.position, r.highlighted, default = me)
                val placement = r.position.placement()

                if (turn != me) {
                    // Opponent to move: nothing to suggest yet.
                    lastHint = null
                    lastPlacement = placement
                    main.post { hintView?.clear() }
                    setButton("…", on = true)
                    prevSample = cap.sample(r.rect, SAMPLE_STEP)
                    return true
                }

                var hint = lastHint
                if (hint == null || placement != lastPlacement) {
                    setButton("…", on = true)
                    val before = cap.sample(r.rect, SAMPLE_STEP)
                    val eng = ensureEngine() ?: run { switchOff(); return false }
                    val s = eng.bestMove(r.position.fen(me, castlingRights))
                    val after = cap.sample(r.rect, SAMPLE_STEP)
                    if (before != null && after != null && FrameSignature.differs(before, after)) {
                        // The board moved while the engine was thinking: this answer is stale.
                        dirty = true; lastChangeAt = System.currentTimeMillis()
                        return true
                    }
                    hint = s?.let { Hint(r.rect, r.orientation, it.uci, it.scoreText) }
                }
                lastPlacement = placement
                lastHint = hint
                if (!auto) return true
                if (hint == null) {
                    toast("No legal move (game over?)")
                    main.post { hintView?.clear() }
                    setButton("♞", on = true)
                } else {
                    main.post { hintView?.show(hint.rect, hint.orientation, hint.uci, hint.score) }
                    setButton("♞", on = true)
                    // Our own arrow just changed the picture; take the baseline after it has drawn so it
                    // is not mistaken for a move.
                    Thread.sleep(150)
                }
                prevSample = cap.sample(r.rect, SAMPLE_STEP)
                return true
            }
        }
    }

    private fun ensureEngine(): StockfishEngine? {
        engine?.let { return it }
        val e = StockfishEngine(this)
        e.start()?.let { err -> toast(err); return null }
        engine = e
        return e
    }

    private fun toast(msg: String) {
        main.post { Toast.makeText(this, msg, Toast.LENGTH_LONG).show() }
    }

    private fun loadTemplates(): Templates {
        val named = HashMap<String, Pixels>()
        for (side in listOf("light", "dark")) for (t in "PNBRQK") {
            val name = "${side}_$t"
            assets.open("templates/$name.png").use { st ->
                val bmp = BitmapFactory.decodeStream(st)
                val px = IntArray(bmp.width * bmp.height)
                bmp.getPixels(px, 0, bmp.width, 0, 0, bmp.width, bmp.height)
                named[name] = Pixels(bmp.width, bmp.height, px)
            }
        }
        return Templates(named)
    }

    // ---- lifecycle ------------------------------------------------------------------------

    private fun startAsForeground() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Chess hints", NotificationManager.IMPORTANCE_LOW))
        val stop = PendingIntent.getService(
            this, 0,
            Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val n = Notification.Builder(this, CHANNEL)
            .setContentTitle("Chess hint overlay is running")
            .setContentText("Tap the ♞ button for the menu. Tap here to quit.")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentIntent(stop)
            .setOngoing(true)
            .build()
        startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    }

    override fun onDestroy() {
        auto = false
        main.removeCallbacksAndMessages(null)
        dismissMenu()
        try { button?.let { wm.removeView(it) } } catch (_: Exception) {}
        try { hintView?.let { wm.removeView(it) } } catch (_: Exception) {}
        worker.shutdownNow()
        engine?.close()
        capturer?.release()
        projection?.stop()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_CODE = "code"
        const val EXTRA_DATA = "data"
        const val ACTION_STOP = "dev.chessoverlay.STOP"
        private const val CHANNEL = "hints"

        private const val POLL_MS = 250L      // how often the board is checked for movement
        private const val SETTLE_MS = 450L    // board must be still this long before it is read
        private const val RETRY_MS = 1500L    // while the board can't be found
        private const val SAMPLE_STEP = 12    // pixel grid used for the movement check
    }
}
