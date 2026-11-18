package dev.chessoverlay.core

sealed class VisionResult {
    class Ok(val rect: BoardRect, val orientation: Orientation, val position: Position) : VisionResult()
    class Fail(val reason: String) : VisionResult()
}

/** Screenshot in, [Position] out. */
class ChessVision(private val templates: Templates) {

    fun analyze(img: Pixels): VisionResult {
        val rect = BoardLocator.locate(img) ?: return VisionResult.Fail("No chess board found on screen")
        val sq = rect.size / 8
        if (rect.top + rect.size > img.height) return VisionResult.Fail("Board is cut off")

        val screen = arrayOfNulls<Piece>(64)
        val unknown = mutableListOf<String>()
        for (r in 0..7) for (c in 0..7) {
            val sil = Silhouette.extract(img, rect.left + c * sq, rect.top + r * sq, sq)
            when (val m = templates.classify(sil)) {
                Templates.Match.Empty -> {}
                is Templates.Match.Found -> screen[r * 8 + c] = m.piece
                is Templates.Match.Unknown -> unknown += "row ${r + 1} col ${c + 1}"
            }
        }
        if (unknown.isNotEmpty()) {
            return VisionResult.Fail("Could not recognise a piece (${unknown.first()}); is something covering the board?")
        }

        // Whoever owns the pieces in the bottom half is the player.
        var score = 0
        for (r in 0..7) for (c in 0..7) {
            val p = screen[r * 8 + c] ?: continue
            val bottom = r >= 4
            score += if ((p.side == Side.WHITE) == bottom) 1 else -1
        }
        val orientation = Orientation(whiteAtBottom = score >= 0)

        val bySquare = arrayOfNulls<Piece>(64)
        for (r in 0..7) for (c in 0..7) bySquare[orientation.squareAt(r, c)] = screen[r * 8 + c]
        val position = Position(bySquare)
        position.problem()?.let { return VisionResult.Fail("Board looks wrong: $it") }
        return VisionResult.Ok(rect, orientation, position)
    }
}
