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
import android.widget.TextView
import android.widget.Toast
import dev.chessoverlay.core.CastlingTracker
import dev.chessoverlay.core.ChessVision
import dev.chessoverlay.core.Pixels
import dev.chessoverlay.core.Side
import dev.chessoverlay.core.Templates
import dev.chessoverlay.core.VisionResult
import java.util.concurrent.Executors

/**
 * Shows a draggable "hint" button over every app. Tap it: the screen is captured, the board is
 * read, Stockfish picks a move for the side at the bottom of the board, and an arrow is drawn
 * on top of the game. Long-press the button (or tap the notification) to stop.
 */
class OverlayService : Service() {
    private lateinit var wm: WindowManager
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()

    private var projection: MediaProjection? = null
    private var capturer: ScreenCapturer? = null
    private var button: TextView? = null
    private var hintView: HintOverlayView? = null

    private var vision: ChessVision? = null
    private var engine: StockfishEngine? = null
    private val castling = CastlingTracker()

    @Volatile private var busy = false

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
        val btn = TextView(this).apply {
            text = "♞"
            textSize = 26f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.argb(220, 46, 160, 90))
                setStroke((2 * d).toInt(), Color.WHITE)
            }
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
                    if (!dragged) requestHint()
                }
                MotionEvent.ACTION_CANCEL -> main.removeCallbacks(longPress)
            }
            true
        }
        wm.addView(btn, lp)
        button = btn
    }

    // ---- the hint pipeline ----------------------------------------------------------------

    private fun requestHint() {
        if (busy) return
        val cap = capturer ?: return
        busy = true
        val seq0 = cap.frameCount
        // Hide our own UI so it is not in the screenshot, then wait for a frame without it.
        hintView?.clear()
        button?.visibility = View.INVISIBLE

        worker.execute {
            try {
                cap.capture(seq0)
                Thread.sleep(120)
                val shot = cap.capture(0L, 100)
                main.post { button?.visibility = View.VISIBLE }
                if (shot == null) return@execute toast("No screen frame available")
                process(shot)
            } catch (e: Exception) {
                main.post { button?.visibility = View.VISIBLE }
                toast("Error: ${e.message}")
            } finally {
                busy = false
            }
        }
    }

    private fun process(shot: Pixels) {
        when (val r = vision!!.analyze(shot)) {
            is VisionResult.Fail -> toast(r.reason)
            is VisionResult.Ok -> {
                val me = if (r.orientation.whiteAtBottom) Side.WHITE else Side.BLACK
                val fen = r.position.fen(me, castling.update(r.position))

                val eng = engine ?: StockfishEngine(this).also { e ->
                    e.start()?.let { err -> toast(err); return }
                    engine = e
                }
                val s = eng.bestMove(fen)
                if (s == null) toast("No legal move (game over?)")
                else main.post { hintView?.show(r.rect, r.orientation, s.uci, s.scoreText) }
            }
        }
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
            .setContentTitle("Chess hint overlay is on")
            .setContentText("Tap the ♞ button to analyse. Tap here to stop.")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentIntent(stop)
            .setOngoing(true)
            .build()
        startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
    }

    override fun onDestroy() {
        main.removeCallbacksAndMessages(null)
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
    }
}
