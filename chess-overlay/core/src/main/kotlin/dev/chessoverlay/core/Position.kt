package dev.chessoverlay.core

/**
 * Maps between screen cells (row 0 = top, col 0 = left) and chess squares
 * (index = rank * 8 + file, so a1 = 0 and h8 = 63).
 *
 * With white at the bottom the board is drawn normally; with black at the bottom it is
 * rotated 180 degrees (h-file on the left), which is how Duolingo shows it.
 */
class Orientation(val whiteAtBottom: Boolean) {
    fun squareAt(row: Int, col: Int): Int =
        if (whiteAtBottom) (7 - row) * 8 + col else row * 8 + (7 - col)

    /** Returns (row, col) on screen for a square index. */
    fun screenOf(square: Int): Pair<Int, Int> {
        val rank = square / 8
        val file = square % 8
        return if (whiteAtBottom) (7 - rank) to file else rank to (7 - file)
    }

    companion object {
        fun squareName(square: Int): String = "${'a' + square % 8}${'1' + square / 8}"
        fun squareIndex(name: String): Int = (name[0] - 'a') + (name[1] - '1') * 8
    }
}

/** Pieces indexed by square (a1 = 0 ... h8 = 63). */
class Position(val squares: Array<Piece?>) {
    fun placement(): String {
        val sb = StringBuilder()
        for (rank in 7 downTo 0) {
            var empty = 0
            for (file in 0..7) {
                val p = squares[rank * 8 + file]
                if (p == null) empty++ else {
                    if (empty > 0) { sb.append(empty); empty = 0 }
                    sb.append(p.fen)
                }
            }
            if (empty > 0) sb.append(empty)
            if (rank > 0) sb.append('/')
        }
        return sb.toString()
    }

    /** A position the engine can safely be given: one king each and no pawns on the back ranks. */
    fun problem(): String? {
        val wk = squares.count { it == Piece(Side.WHITE, 'K') }
        val bk = squares.count { it == Piece(Side.BLACK, 'K') }
        if (wk != 1 || bk != 1) return "expected one king per side, saw $wk white and $bk black"
        for (file in 0..7) for (rank in intArrayOf(0, 7)) {
            if (squares[rank * 8 + file]?.type == 'P') return "pawn on the back rank"
        }
        return null
    }

    fun fen(sideToMove: Side, castling: String): String =
        "${placement()} ${if (sideToMove == Side.WHITE) 'w' else 'b'} $castling - 0 1"

    companion object {
        const val START_PLACEMENT = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
    }
}

/**
 * A screenshot cannot show whether a king or rook has already moved. Castling rights only ever
 * disappear during a game, so we start from "whatever is plausible" and intersect over every
 * frame we have seen, resetting when the starting position reappears.
 */
class CastlingTracker {
    private var rights = linkedSetOf('K', 'Q', 'k', 'q')

    fun update(pos: Position): String {
        if (pos.placement() == Position.START_PLACEMENT) rights = linkedSetOf('K', 'Q', 'k', 'q')
        val s = pos.squares
        val wK = Piece(Side.WHITE, 'K'); val wR = Piece(Side.WHITE, 'R')
        val bK = Piece(Side.BLACK, 'K'); val bR = Piece(Side.BLACK, 'R')
        rights.removeAll { r ->
            when (r) {
                'K' -> !(s[4] == wK && s[7] == wR)
                'Q' -> !(s[4] == wK && s[0] == wR)
                'k' -> !(s[60] == bK && s[63] == bR)
                else -> !(s[60] == bK && s[56] == bR)
            }
        }
        return if (rights.isEmpty()) "-" else rights.joinToString("")
    }

    fun reset() { rights = linkedSetOf('K', 'Q', 'k', 'q') }
}
