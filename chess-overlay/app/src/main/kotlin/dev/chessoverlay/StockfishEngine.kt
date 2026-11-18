package dev.chessoverlay

import android.content.Context
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.io.OutputStreamWriter

data class Suggestion(val uci: String, val scoreText: String?)

/** Talks UCI to the Stockfish binary bundled as libstockfish.so. Not thread-safe; use from one thread. */
class StockfishEngine(private val context: Context) : AutoCloseable {
    private var process: Process? = null
    private var input: BufferedReader? = null
    private var output: OutputStreamWriter? = null

    /** Returns null on success or a human-readable error. */
    fun start(): String? {
        val bin = File(context.applicationInfo.nativeLibraryDir, "libstockfish.so")
        if (!bin.exists()) {
            return "Stockfish is missing from this build (run scripts/fetch-stockfish.sh, then rebuild). " +
                "It is arm64-only."
        }
        return try {
            val p = ProcessBuilder(bin.absolutePath).redirectErrorStream(true).start()
            process = p
            input = BufferedReader(InputStreamReader(p.inputStream))
            output = OutputStreamWriter(p.outputStream)
            send("uci")
            waitFor("uciok")
            send("setoption name Threads value 2")
            send("setoption name Hash value 64")
            send("isready")
            waitFor("readyok")
            null
        } catch (e: Exception) {
            "Could not start Stockfish: ${e.message}"
        }
    }

    fun bestMove(fen: String, moveTimeMs: Int = 800): Suggestion? {
        send("position fen $fen")
        send("go movetime $moveTimeMs")
        var score: String? = null
        while (true) {
            val line = input?.readLine() ?: return null
            if (line.startsWith("info") && " score " in line) {
                score = parseScore(line) ?: score
            } else if (line.startsWith("bestmove")) {
                val mv = line.split(" ").getOrNull(1) ?: return null
                return if (mv == "(none)" || mv == "0000") null else Suggestion(mv, score)
            }
        }
    }

    /** UCI scores are from the side to move's point of view, which is the player's here. */
    private fun parseScore(line: String): String? {
        val t = line.split(" ")
        val i = t.indexOf("score")
        if (i < 0 || i + 2 >= t.size) return null
        val v = t[i + 2].toIntOrNull() ?: return null
        return when (t[i + 1]) {
            "cp" -> String.format("%+.2f", v / 100.0)
            "mate" -> "mate in ${Math.abs(v)}" + if (v < 0) " (against you)" else ""
            else -> null
        }
    }

    private fun send(cmd: String) {
        output?.apply { write(cmd + "\n"); flush() }
    }

    private fun waitFor(token: String) {
        while (true) {
            val line = input?.readLine() ?: error("Stockfish exited early")
            if (line.startsWith(token)) return
        }
    }

    override fun close() {
        try { send("quit") } catch (_: Exception) {}
        process?.destroy()
        process = null
    }
}
