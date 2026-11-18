package dev.chessoverlay.core

enum class Side {
    WHITE, BLACK;

    val opposite: Side get() = if (this == WHITE) BLACK else WHITE
}

/** [type] is the FEN letter in upper case: P N B R Q K. */
data class Piece(val side: Side, val type: Char) {
    val fen: Char get() = if (side == Side.WHITE) type else type.lowercaseChar()
}

const val GRID = 24

/** A piece reduced to a binary 24x24 shape, so it can be compared regardless of square colour. */
class Silhouette(val mask: BooleanArray, val fill: Double, val meanLum: Double) {
    fun flipped(): Silhouette {
        val m = BooleanArray(GRID * GRID)
        for (r in 0 until GRID) for (c in 0 until GRID) m[r * GRID + c] = mask[r * GRID + (GRID - 1 - c)]
        return Silhouette(m, fill, meanLum)
    }

    fun iou(o: Silhouette): Double {
        var inter = 0
        var union = 0
        for (k in mask.indices) {
            if (mask[k] && o.mask[k]) inter++
            if (mask[k] || o.mask[k]) union++
        }
        return if (union == 0) 0.0 else inter.toDouble() / union
    }

    companion object {
        /** A pixel whose colour is at least this far (sum of |dR|+|dG|+|dB|) from the square's background is "piece". */
        private const val COLOUR_DISTANCE = 35

        /** Extracts the silhouette of the square at ([x0],[y0]) of side [size]. */
        fun extract(img: Pixels, x0: Int, y0: Int, size: Int): Silhouette {
            // Background colour = average of the four corners; pieces never reach them, and this
            // also copes with Duolingo's tinted "last move" squares.
            val p = (size * 0.03).toInt().coerceAtLeast(2)
            val q = (size * 0.07).toInt().coerceAtLeast(p + 2)
            var sr = 0; var sg = 0; var sb = 0
            var n = 0
            for ((cx, cy) in listOf(p to p, size - q to p, p to size - q, size - q to size - q)) {
                for (dy in 0 until q - p) for (dx in 0 until q - p) {
                    val c = img.argb[(y0 + cy + dy) * img.width + x0 + cx + dx]
                    sr += (c shr 16) and 0xFF; sg += (c shr 8) and 0xFF; sb += c and 0xFF
                    n++
                }
            }
            val bgR = sr / n; val bgG = sg / n; val bgB = sb / n

            // Piece pixel = clearly a different colour from the background, but NOT merely a darker
            // copy of it (that is the drop shadow under every piece). Comparing colours rather than
            // brightness matters: a dark piece has the same brightness as a tinted square.
            fun isPiece(argb: Int): Boolean {
                val r = (argb shr 16) and 0xFF; val g = (argb shr 8) and 0xFF; val b = argb and 0xFF
                if (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) < COLOUR_DISTANCE) return false
                return !(r <= bgR + 3 && g <= bgG + 3 && b <= bgB + 3)
            }

            val margin = size * 0.04
            val cell = (size - 2 * margin) / GRID
            val mask = BooleanArray(GRID * GRID)
            var litCells = 0
            var litLum = 0L
            var litPixels = 0
            for (r in 0 until GRID) for (c in 0 until GRID) {
                val ya = (margin + r * cell).toInt()
                val yb = (margin + (r + 1) * cell).toInt().coerceAtLeast(ya + 1)
                val xa = (margin + c * cell).toInt()
                val xb = (margin + (c + 1) * cell).toInt().coerceAtLeast(xa + 1)
                var lit = 0
                var total = 0
                for (y in ya until yb) for (x in xa until xb) {
                    total++
                    if (isPiece(img.argb[(y0 + y) * img.width + x0 + x])) {
                        lit++
                        litLum += img.lum(x0 + x, y0 + y)
                        litPixels++
                    }
                }
                if (lit * 10 > total * 4) {
                    mask[r * GRID + c] = true
                    litCells++
                }
            }
            val mean = if (litPixels == 0) 0.0 else litLum.toDouble() / litPixels
            return Silhouette(mask, litCells.toDouble() / (GRID * GRID), mean)
        }
    }
}

/**
 * Reference piece images, named `light_K`, `dark_P`, ... (light = white pieces). Each is a
 * square crop of a single piece. Mirrored copies are added because knights face both ways.
 */
class Templates(named: Map<String, Pixels>) {
    class Entry(val side: Side, val type: Char, val silhouette: Silhouette)

    val entries: List<Entry>
    private val lightLum: Double
    private val darkLum: Double

    init {
        val list = mutableListOf<Entry>()
        val re = Regex("(light|dark)_([PNBRQK])")
        for ((name, px) in named) {
            val m = re.matchEntire(name) ?: continue
            val side = if (m.groupValues[1] == "light") Side.WHITE else Side.BLACK
            val type = m.groupValues[2][0]
            val sil = Silhouette.extract(px, 0, 0, minOf(px.width, px.height))
            list += Entry(side, type, sil)
            list += Entry(side, type, sil.flipped())
        }
        require(list.isNotEmpty()) { "no piece templates found" }
        entries = list
        lightLum = list.filter { it.side == Side.WHITE }.map { it.silhouette.meanLum }.average()
        darkLum = list.filter { it.side == Side.BLACK }.map { it.silhouette.meanLum }.average()
    }

    sealed class Match {
        object Empty : Match()
        class Found(val piece: Piece, val score: Double) : Match()
        class Unknown(val score: Double) : Match()
    }

    fun classify(sil: Silhouette): Match {
        if (sil.fill < MIN_FILL) return Match.Empty
        val side = if (Math.abs(sil.meanLum - lightLum) < Math.abs(sil.meanLum - darkLum)) Side.WHITE else Side.BLACK
        var best: Entry? = null
        var bestScore = 0.0
        for (e in entries) {
            if (e.side != side) continue
            val s = sil.iou(e.silhouette)
            if (s > bestScore) {
                bestScore = s
                best = e
            }
        }
        return if (best != null && bestScore >= MIN_IOU) Match.Found(Piece(side, best.type), bestScore) else Match.Unknown(bestScore)
    }

    companion object {
        private const val MIN_FILL = 0.04
        private const val MIN_IOU = 0.45
    }
}
