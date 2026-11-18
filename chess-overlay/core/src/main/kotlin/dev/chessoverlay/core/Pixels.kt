package dev.chessoverlay.core

/** Platform-neutral image: row-major ARGB ints. Keeps the vision code testable on a plain JVM. */
class Pixels(val width: Int, val height: Int, val argb: IntArray) {
    init {
        require(argb.size == width * height) { "pixel array does not match ${width}x$height" }
    }

    fun lum(x: Int, y: Int): Int {
        val p = argb[y * width + x]
        return (((p shr 16) and 0xFF) * 299 + ((p shr 8) and 0xFF) * 587 + (p and 0xFF) * 114) / 1000
    }

    /** Sum of absolute R, G and B differences between two pixels. */
    fun diff(x1: Int, y1: Int, x2: Int, y2: Int): Int {
        val a = argb[y1 * width + x1]
        val b = argb[y2 * width + x2]
        return Math.abs(((a shr 16) and 0xFF) - ((b shr 16) and 0xFF)) +
            Math.abs(((a shr 8) and 0xFF) - ((b shr 8) and 0xFF)) +
            Math.abs((a and 0xFF) - (b and 0xFF))
    }
}
