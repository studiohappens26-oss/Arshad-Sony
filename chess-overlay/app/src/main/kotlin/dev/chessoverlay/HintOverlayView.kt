package dev.chessoverlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import dev.chessoverlay.core.BoardRect
import dev.chessoverlay.core.Orientation

/** Full-screen, touch-transparent layer that draws the suggested move (matches screenshot pixels 1:1). */
class HintOverlayView(context: Context) : View(context) {
    private class Hint(val rect: BoardRect, val from: Pair<Int, Int>, val to: Pair<Int, Int>, val label: String)

    private var hint: Hint? = null
    private val green = Color.argb(235, 46, 204, 113)
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(90, 46, 204, 113); style = Paint.Style.FILL }
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = green; strokeCap = Paint.Cap.ROUND; style = Paint.Style.STROKE }
    private val head = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = green; style = Paint.Style.FILL }
    private val chipBg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(220, 20, 28, 34) }
    private val chipText = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textAlign = Paint.Align.CENTER }

    fun show(rect: BoardRect, orientation: Orientation, uci: String, scoreText: String?) {
        val from = orientation.screenOf(Orientation.squareIndex(uci.substring(0, 2)))
        val to = orientation.screenOf(Orientation.squareIndex(uci.substring(2, 4)))
        val promo = if (uci.length > 4) "=" + uci[4].uppercaseChar() else ""
        val label = "${uci.substring(0, 2)} → ${uci.substring(2, 4)}$promo" + (scoreText?.let { "   $it" } ?: "")
        hint = Hint(rect, from, to, label)
        invalidate()
    }

    fun clear() {
        hint = null
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val h = hint ?: return
        val sq = h.rect.square.toFloat()

        for ((r, c) in listOf(h.from, h.to)) {
            val l = h.rect.left + c * sq
            val t = h.rect.top + r * sq
            canvas.drawRect(l, t, l + sq, t + sq, fill)
        }

        val x1 = h.rect.centerX(h.from.second).toFloat()
        val y1 = h.rect.centerY(h.from.first).toFloat()
        val x2 = h.rect.centerX(h.to.second).toFloat()
        val y2 = h.rect.centerY(h.to.first).toFloat()
        val len = Math.hypot((x2 - x1).toDouble(), (y2 - y1).toDouble()).toFloat()
        if (len > 1f) {
            val ux = (x2 - x1) / len
            val uy = (y2 - y1) / len
            val headLen = sq * 0.45f
            val headHalf = sq * 0.28f
            line.strokeWidth = sq * 0.16f
            // Stop the shaft at the arrow head's base so the tip stays sharp.
            canvas.drawLine(x1, y1, x2 - ux * headLen * 0.8f, y2 - uy * headLen * 0.8f, line)
            val bx = x2 - ux * headLen
            val by = y2 - uy * headLen
            val p = Path().apply {
                moveTo(x2, y2)
                lineTo(bx - uy * headHalf, by + ux * headHalf)
                lineTo(bx + uy * headHalf, by - ux * headHalf)
                close()
            }
            canvas.drawPath(p, head)
        }

        chipText.textSize = sq * 0.3f
        val textW = chipText.measureText(h.label)
        val cx = width / 2f
        val cy = h.rect.top - sq * 0.55f
        canvas.drawRoundRect(cx - textW / 2 - sq * 0.25f, cy - sq * 0.3f, cx + textW / 2 + sq * 0.25f, cy + sq * 0.3f, sq * 0.3f, sq * 0.3f, chipBg)
        canvas.drawText(h.label, cx, cy + chipText.textSize * 0.35f, chipText)
    }
}
