package dev.chessoverlay.core

import java.awt.image.BufferedImage
import javax.imageio.ImageIO
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ChessVisionTest {
    private fun load(path: String): Pixels {
        val img = ImageIO.read(javaClass.getResourceAsStream(path)!!)
        return fromBuffered(img)
    }

    private fun fromBuffered(img: BufferedImage): Pixels {
        val px = IntArray(img.width * img.height)
        img.getRGB(0, 0, img.width, img.height, px, 0, img.width)
        return Pixels(img.width, img.height, px)
    }

    private val templates: Templates by lazy {
        val names = listOf("B", "K", "N", "P", "Q", "R").flatMap { listOf("light_$it", "dark_$it") }
        Templates(names.associateWith { load("/templates/$it.png") })
    }
    private val vision by lazy { ChessVision(templates) }
    private val screenshot by lazy { load("/duolingo_start_black_bottom.png") }

    @Test
    fun locatesBoardInRealScreenshot() {
        val rect = assertNotNull(BoardLocator.locate(screenshot))
        assertEquals(0, rect.left)
        assertEquals(1080, rect.size)
        assertEquals(71, rect.top) // board starts at y=771 in the full screenshot; fixture is cropped at 700
    }

    @Test
    fun readsStartingPositionWithBlackAtBottom() {
        val r = assertIs<VisionResult.Ok>(vision.analyze(screenshot))
        assertEquals(false, r.orientation.whiteAtBottom)
        assertEquals(Position.START_PLACEMENT, r.position.placement())
        assertEquals(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1",
            r.position.fen(Side.BLACK, CastlingTracker().update(r.position)),
        )
    }

    /** Moves the black e-pawn two squares by editing pixels, to prove we are not just memorising the start. */
    @Test
    fun readsPositionAfterPawnMove() {
        val rect = assertNotNull(BoardLocator.locate(screenshot))
        val sq = rect.size / 8
        val argb = screenshot.argb.copyOf()
        fun copySquare(fromR: Int, fromC: Int, toR: Int, toC: Int, src: IntArray = screenshot.argb) {
            for (y in 0 until sq) for (x in 0 until sq) {
                argb[(rect.top + toR * sq + y) * screenshot.width + toC * sq + x] =
                    src[(rect.top + fromR * sq + y) * screenshot.width + fromC * sq + x]
            }
        }
        // (row 6, col 3) holds a black pawn (e7, board rotated). Empty squares of the same colour: (2,1) and (4,3).
        copySquare(6, 3, 4, 3)
        copySquare(2, 1, 6, 3)
        val moved = Pixels(screenshot.width, screenshot.height, argb)
        val r = assertIs<VisionResult.Ok>(vision.analyze(moved))
        assertEquals("rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR", r.position.placement())
    }

    @Test
    fun failsCleanlyWhenNoBoard() {
        val blank = Pixels(1080, 2000, IntArray(1080 * 2000) { 0xFF101820.toInt() })
        val r = assertIs<VisionResult.Fail>(vision.analyze(blank))
        assertTrue(r.reason.contains("board", ignoreCase = true))
    }

    @Test
    fun orientationRoundTrips() {
        for (white in listOf(true, false)) {
            val o = Orientation(white)
            for (sq in 0 until 64) {
                val (r, c) = o.screenOf(sq)
                assertEquals(sq, o.squareAt(r, c))
            }
        }
        // Black at bottom: top-left cell is h1, bottom-left is h8.
        assertEquals("h1", Orientation.squareName(Orientation(false).squareAt(0, 0)))
        assertEquals("a8", Orientation.squareName(Orientation(false).squareAt(7, 7)))
        assertEquals("a1", Orientation.squareName(Orientation(true).squareAt(7, 0)))
        assertEquals(Orientation.squareIndex("e4"), 28)
    }

    @Test
    fun castlingRightsOnlyShrink() {
        val tracker = CastlingTracker()
        val start = (vision.analyze(screenshot) as VisionResult.Ok).position
        assertEquals("KQkq", tracker.update(start))

        // White king-side rook leaves h1 -> K is gone and stays gone even if it returns.
        val moved = Position(start.squares.copyOf())
        moved.squares[7] = null
        assertEquals("Qkq", tracker.update(moved))

        // Rook walks back to h1 in a later, non-starting position: the right must not come back.
        val later = Position(start.squares.copyOf())
        later.squares[12] = null // e2 pawn gone
        later.squares[28] = Piece(Side.WHITE, 'P') // ...now on e4
        assertEquals("Qkq", tracker.update(later))

        // A fresh game (start position again) resets everything.
        assertEquals("KQkq", tracker.update(start))
    }

    @Test
    fun rejectsPositionWithoutKings() {
        val empty = Position(arrayOfNulls(64))
        assertTrue(empty.problem()!!.contains("king"))
    }

    // Regression: screenshots from a real phone where Duolingo tints the last-moved square.
    private fun assertReads(fixture: String, placement: String) {
        val r = vision.analyze(load("/$fixture.png"))
        val ok = assertIs<VisionResult.Ok>(r, (r as? VisionResult.Fail)?.reason)
        assertEquals(false, ok.orientation.whiteAtBottom)
        assertEquals(placement, ok.position.placement())
    }

    @Test
    fun boardFoundWhenHighlightedSquareIsInMiddleColumns() =
        assertReads("game_after_nf3_highlight_mid", "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R")

    @Test
    fun readsLightPieceOnHighlightedSquare() =
        assertReads("game_midgame_highlight_light_knight", "rnbqkbnr/pp6/2p2p2/3pp1pp/4P3/2NP1NB1/PPP2PPP/R2QKB1R")

    @Test
    fun readsDarkPieceOnHighlightedSquare() =
        assertReads("game_midgame_highlight_dark_bishop", "rnbqk1nr/pp6/2p2p1b/4p1pp/N2pP3/3P1NB1/PPP2PPP/R2QKB1R")
}

class TurnTest {
    private fun load(path: String): Pixels {
        val img = ImageIO.read(javaClass.getResourceAsStream(path)!!)
        val px = IntArray(img.width * img.height)
        img.getRGB(0, 0, img.width, img.height, px, 0, img.width)
        return Pixels(img.width, img.height, px)
    }
    private val vision by lazy {
        val names = listOf("B", "K", "N", "P", "Q", "R").flatMap { listOf("light_$it", "dark_$it") }
        ChessVision(Templates(names.associateWith { load("/templates/$it.png") }))
    }
    private fun read(fixture: String) = vision.analyze(load("/$fixture.png")) as VisionResult.Ok
    private fun names(r: VisionResult.Ok) = r.highlighted.map { Orientation.squareName(it) }

    @Test
    fun detectsTintedSquares() {
        assertEquals(emptyList(), names(read("duolingo_start_black_bottom")))
        assertEquals(listOf("f3"), names(read("game_after_nf3_highlight_mid")))
        assertEquals(listOf("c3"), names(read("game_midgame_highlight_light_knight")))
        assertEquals(listOf("h6"), names(read("game_midgame_highlight_dark_bishop")))
    }

    @Test
    fun turnFromRealScreenshots() {
        // The player is black (bottom). Highlight on white's piece -> black to move, and vice versa.
        fun turn(f: String): Side { val r = read(f); return TurnTracker().update(r.position, r.highlighted, default = Side.BLACK) }
        assertEquals(Side.WHITE, turn("duolingo_start_black_bottom"))            // start position: white moves first
        assertEquals(Side.BLACK, turn("game_after_nf3_highlight_mid"))           // white just played Nf3
        assertEquals(Side.BLACK, turn("game_midgame_highlight_light_knight"))    // white's knight just moved
        assertEquals(Side.WHITE, turn("game_midgame_highlight_dark_bishop"))     // black just played ...Bh6
    }

    @Test
    fun turnFollowsMovesAndIgnoresSelection() {
        val t = TurnTracker()
        val start = Position.fromPlacement(Position.START_PLACEMENT)
        assertEquals(Side.WHITE, t.update(start, emptyList(), Side.BLACK))
        val e4 = Position.fromPlacement("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR")
        assertEquals(Side.BLACK, t.update(e4, emptyList(), Side.BLACK))
        // Same pieces again (player tapped a piece, a square got tinted): turn must not flip.
        assertEquals(Side.BLACK, t.update(e4, listOf(Orientation.squareIndex("e7")), Side.BLACK))
        val e5 = Position.fromPlacement("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR")
        assertEquals(Side.WHITE, t.update(e5, emptyList(), Side.BLACK))
        // Castling: king and rook of one colour appear -> that colour moved.
        val before = Position.fromPlacement("r3k2r/8/8/8/8/8/8/R3K2R")
        val after = Position.fromPlacement("r3k2r/8/8/8/8/8/8/R4RK1")
        val t2 = TurnTracker(); t2.update(before, emptyList(), Side.WHITE)
        assertEquals(Side.BLACK, t2.update(after, emptyList(), Side.WHITE))
    }

    @Test
    fun frameSignatureNoticesMovesButNotNoise() {
        val a = IntArray(8100) { 0x1F2A33 }
        val noisy = a.copyOf().also { for (i in 0 until 8100 step 7) it[i] = 0x202B34 } // tiny colour noise
        assertEquals(false, FrameSignature.differs(a, noisy))
        val moved = a.copyOf().also { for (i in 1000 until 1100) it[i] = 0xC0D0E0 }        // a piece appears
        assertEquals(true, FrameSignature.differs(a, moved))
    }
}
