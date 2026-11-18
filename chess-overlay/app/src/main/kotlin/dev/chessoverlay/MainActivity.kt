package dev.chessoverlay

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

@Suppress("DEPRECATION")
class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (24 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(pad, pad * 2, pad, pad)
        }
        root.addView(TextView(this).apply {
            text = "Chess Hint Overlay"
            textSize = 24f
        })
        root.addView(TextView(this).apply {
            text = "1. Tap Start and allow the overlay + screen capture.\n" +
                "2. Open Duolingo chess.\n" +
                "3. Tap the grey ♞ button once to turn auto-hints ON (it turns green). From then on the " +
                "best move for YOUR side (the one at the bottom) is drawn on your turn, and refreshes by " +
                "itself after every move. While the opponent is thinking, the button shows …\n" +
                "4. Tap it again to turn hints OFF. Long-press it, or tap the notification, to quit.\n\n" +
                "Keep the button off the board (drag it). For practice, lessons and bot games. " +
                "Don't use it against real opponents."
            textSize = 16f
            setPadding(0, pad, 0, pad)
        })
        root.addView(Button(this).apply {
            text = "Start"
            setOnClickListener { start() }
        })
        root.addView(Button(this).apply {
            text = "Stop"
            setOnClickListener {
                startService(Intent(this@MainActivity, OverlayService::class.java).setAction(OverlayService.ACTION_STOP))
            }
        })
        setContentView(root)
    }

    private fun start() {
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Allow \"Display over other apps\", then tap Start again", Toast.LENGTH_LONG).show()
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
        val mpm = getSystemService(MediaProjectionManager::class.java)
        startActivityForResult(mpm.createScreenCaptureIntent(), REQ_CAPTURE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_CAPTURE) return
        if (resultCode != RESULT_OK || data == null) {
            Toast.makeText(this, "Screen capture was not allowed", Toast.LENGTH_SHORT).show()
            return
        }
        startForegroundService(
            Intent(this, OverlayService::class.java)
                .putExtra(OverlayService.EXTRA_CODE, resultCode)
                .putExtra(OverlayService.EXTRA_DATA, data),
        )
        moveTaskToBack(true)
    }

    private companion object {
        const val REQ_CAPTURE = 42
    }
}
