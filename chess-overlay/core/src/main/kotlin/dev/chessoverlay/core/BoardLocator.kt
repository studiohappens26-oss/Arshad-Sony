package dev.chessoverlay.core

/** The board on screen, in screenshot pixels. [size] is the width (= height) of the whole 8x8 grid. */
data class BoardRect(val left: Int, val top: Int, val size: Int) {
    val square: Double get() = size / 8.0

    fun centerX(col: Int): Double = left + (col + 0.5) * square
    fun centerY(row: Int): Double = top + (row + 0.5) * square
}

/**
 * Finds the board by looking for the checkerboard pattern itself rather than hard-coding
 * pixel positions, so it works across phone resolutions.
 *
 * Duolingo draws the board edge to edge, so the board is assumed to span the full screen
 * width; only its vertical position is searched. A pixel row "looks like a checkerboard row"
 * when sampling the top-left corner of each of the 8 columns (where pieces never reach)
 * alternates between two colours.
 */
object BoardLocator {
    fun locate(img: Pixels): BoardRect? {
        val size = img.width / 8 * 8
        val s = img.width / 8.0
        val xs = IntArray(8) { (it * s + 6).toInt().coerceAtMost(img.width - 1) }

        fun looksLikeBoardRow(y: Int): Boolean {
            // Pick the most "typical" sample among the even columns and among the odd columns as
            // that parity's reference colour. Comparing every column to its reference (instead of to
            // its neighbours) means a tinted last-move square, or two of them, cannot break the row.
            val ref = IntArray(2)
            for (parity in 0..1) {
                var bestIdx = parity
                var bestCount = -1
                for (i in parity until 8 step 2) {
                    var count = 0
                    for (j in parity until 8 step 2) if (img.diff(xs[i], y, xs[j], y) <= 10) count++
                    if (count > bestCount) { bestCount = count; bestIdx = i }
                }
                ref[parity] = bestIdx
            }
            // The two parities must be visibly different colours (light vs dark square)...
            if (img.diff(xs[ref[0]], y, xs[ref[1]], y) < 12) return false
            // ...and at least 6 of the 8 columns must match their parity's colour.
            var matching = 0
            for (i in 0 until 8) if (img.diff(xs[i], y, xs[ref[i % 2]], y) <= 10) matching++
            return matching >= 6
        }

        var bestStart = -1
        var bestEnd = -1
        var runStart = -1
        var last = -1
        for (y in 0 until img.height) {
            if (!looksLikeBoardRow(y)) continue
            if (runStart < 0 || y - last > 4) runStart = y
            last = y
            if (last - runStart > bestEnd - bestStart) {
                bestStart = runStart
                bestEnd = last
            }
        }
        if (bestStart < 0) return null
        val len = bestEnd - bestStart + 1
        if (len < size * 0.92 || len > size * 1.08) return null
        return BoardRect(left = 0, top = bestStart, size = size)
    }
}
