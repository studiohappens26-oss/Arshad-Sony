package dev.chessoverlay.core

/**
 * Finds the squares Duolingo tints to show the last move. A square is tinted when its background
 * (sampled in its top-left corner, where pieces never reach) differs from the typical colour of
 * the squares of the same checkerboard parity. Returns screen (row, col) pairs.
 */
object Highlights {
    private const val DISTANCE = 24

    fun detect(img: Pixels, rect: BoardRect): List<Pair<Int, Int>> {
        val sq = rect.size / 8
        val rgb = Array(64) { IntArray(3) }
        for (r in 0..7) for (c in 0..7) {
            var sr = 0; var sg = 0; var sb = 0
            for (dy in 5 until 9) for (dx in 5 until 9) {
                val p = img.argb[(rect.top + r * sq + dy) * img.width + rect.left + c * sq + dx]
                sr += (p shr 16) and 0xFF; sg += (p shr 8) and 0xFF; sb += p and 0xFF
            }
            rgb[r * 8 + c] = intArrayOf(sr / 16, sg / 16, sb / 16)
        }
        // Median colour per parity = the plain board colours, even if a couple of squares are tinted.
        val ref = Array(2) { parity ->
            IntArray(3) { ch ->
                val v = (0 until 64).filter { ((it / 8) + (it % 8)) % 2 == parity }.map { rgb[it][ch] }.sorted()
                v[v.size / 2]
            }
        }
        val out = mutableListOf<Pair<Int, Int>>()
        for (r in 0..7) for (c in 0..7) {
            val a = rgb[r * 8 + c]; val b = ref[(r + c) % 2]
            if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > DISTANCE) out += r to c
        }
        return out
    }
}

/**
 * Works out whose move it is from successive board readings.
 *
 * - A piece of colour X newly appearing on a square means X just moved, so it is the other side's turn.
 * - If nothing but the tint changed (e.g. you tapped a piece), the previous answer stands.
 * - If that is ambiguous (several moves happened between readings, or it is the first reading), fall back
 *   to the tinted last-move square: whoever's piece sits on it moved last.
 * - The starting position with no tint means white to move.
 */
class TurnTracker {
    private var prev: Position? = null
    private var turn: Side? = null

    fun update(pos: Position, highlightedSquares: List<Int>, default: Side): Side {
        val p = prev
        val fromTint = turnFromTint(pos, highlightedSquares)
        val isStart = pos.placement() == Position.START_PLACEMENT
        val result = when {
            isStart && (p == null || p.placement() != Position.START_PLACEMENT) -> Side.WHITE
            p == null -> fromTint ?: default
            p.placement() == pos.placement() -> turn ?: fromTint ?: default
            else -> moverSide(p, pos)?.opposite ?: fromTint ?: turn?.opposite ?: default
        }
        prev = pos
        turn = result
        return result
    }

    private fun turnFromTint(pos: Position, tinted: List<Int>): Side? {
        val sides = tinted.mapNotNull { pos.squares[it]?.side }.toSet()
        return if (sides.size == 1) sides.first().opposite else null
    }

    private fun moverSide(before: Position, after: Position): Side? {
        var white = false
        var black = false
        for (sq in 0 until 64) {
            val n = after.squares[sq] ?: continue
            if (before.squares[sq] != n) if (n.side == Side.WHITE) white = true else black = true
        }
        return when {
            white && !black -> Side.WHITE
            black && !white -> Side.BLACK
            else -> null
        }
    }
}

/** Decides whether the board area of two screen samples differs enough to mean something moved. */
object FrameSignature {
    private const val PIXEL_DISTANCE = 24

    /** Samples are packed 0xRRGGBB ints taken on the same grid. */
    fun differs(a: IntArray, b: IntArray): Boolean {
        if (a.size != b.size) return true
        var changed = 0
        for (i in a.indices) {
            val x = a[i]; val y = b[i]
            val d = Math.abs(((x shr 16) and 0xFF) - ((y shr 16) and 0xFF)) +
                Math.abs(((x shr 8) and 0xFF) - ((y shr 8) and 0xFF)) +
                Math.abs((x and 0xFF) - (y and 0xFF))
            if (d > PIXEL_DISTANCE) changed++
        }
        return changed > maxOf(16, a.size / 300)
    }
}
