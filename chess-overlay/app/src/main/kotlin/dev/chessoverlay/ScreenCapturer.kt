package dev.chessoverlay

import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.Handler
import android.os.HandlerThread
import dev.chessoverlay.core.BoardRect
import dev.chessoverlay.core.Pixels

/**
 * Keeps one VirtualDisplay alive for the lifetime of the projection (Android 14 forbids creating
 * a second one from the same MediaProjection) and remembers the newest frame.
 */
class ScreenCapturer(
    projection: MediaProjection,
    val width: Int,
    val height: Int,
    densityDpi: Int,
) {
    private val thread = HandlerThread("capture").also { it.start() }
    private val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 3)
    private val display: VirtualDisplay
    private val lock = Object()
    private var latest: Image? = null

    /** Incremented for every new frame; lets callers wait for a frame newer than some moment. */
    @Volatile var frameCount = 0L
        private set

    init {
        reader.setOnImageAvailableListener({ r ->
            val img = r.acquireLatestImage() ?: return@setOnImageAvailableListener
            synchronized(lock) {
                latest?.close()
                latest = img
                frameCount++
                lock.notifyAll()
            }
        }, Handler(thread.looper))
        display = projection.createVirtualDisplay(
            "chess-capture", width, height, densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader.surface, null, null,
        )
    }

    /** Blocks until a frame newer than [afterFrame] exists (or [timeoutMs] passes), then returns the newest frame. */
    fun capture(afterFrame: Long, timeoutMs: Long = 700): Pixels? {
        synchronized(lock) {
            val deadline = System.currentTimeMillis() + timeoutMs
            while (frameCount <= afterFrame) {
                val left = deadline - System.currentTimeMillis()
                if (left <= 0) break
                lock.wait(left)
            }
            val img = latest ?: return null
            return toPixels(img)
        }
    }

    /**
     * Cheap snapshot of just the board area from the newest frame: every [step]-th pixel as 0xRRGGBB.
     * Used to notice that something moved without converting the whole screen each time.
     */
    fun sample(rect: BoardRect, step: Int): IntArray? {
        synchronized(lock) {
            val img = latest ?: return null
            if (rect.left < 0 || rect.top < 0 || rect.left + rect.size > width || rect.top + rect.size > height) return null
            val plane = img.planes[0]
            val buf = plane.buffer
            val n = rect.size / step
            val out = IntArray(n * n)
            var k = 0
            for (j in 0 until n) for (i in 0 until n) {
                val o = (rect.top + j * step) * plane.rowStride + (rect.left + i * step) * plane.pixelStride
                out[k++] = ((buf.get(o).toInt() and 0xFF) shl 16) or
                    ((buf.get(o + 1).toInt() and 0xFF) shl 8) or (buf.get(o + 2).toInt() and 0xFF)
            }
            return out
        }
    }

    private fun toPixels(img: Image): Pixels {
        val plane = img.planes[0]
        val buf = plane.buffer
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride
        val out = IntArray(width * height)
        val row = ByteArray(rowStride)
        for (y in 0 until height) {
            buf.position(y * rowStride)
            buf.get(row, 0, minOf(rowStride, buf.remaining()))
            var o = y * width
            var i = 0
            for (x in 0 until width) {
                val r = row[i].toInt() and 0xFF
                val g = row[i + 1].toInt() and 0xFF
                val b = row[i + 2].toInt() and 0xFF
                out[o++] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
                i += pixelStride
            }
        }
        return Pixels(width, height, out)
    }

    fun release() {
        display.release()
        synchronized(lock) { latest?.close(); latest = null }
        reader.close()
        thread.quitSafely()
    }
}
