# Chess Hint Overlay (Android, Kotlin)

Floating ♞ button over any app. Tap it when it's your move: the screen is captured, the board is
read, Stockfish picks the best move for the side at the bottom, and an arrow is drawn on the game.

First target: **Duolingo chess** (practice, lessons, bot games). Not for use against real opponents.

## Build

```bash
./scripts/fetch-stockfish.sh        # downloads the ~80 MB arm64 engine (not committed to git)
export ANDROID_HOME=/path/to/android-sdk
./gradlew :core:test                # vision tests (plain JVM, no device needed)
./gradlew :app:assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
```

Install the APK, tap **Start**, grant "Display over other apps" and screen capture, open Duolingo chess.
Requires Android 11+ and an arm64 phone. Portrait only.

## How it works

| Step | Where |
|---|---|
| Overlay button + arrow layer | `app/.../OverlayService.kt`, `HintOverlayView.kt` |
| Screen capture (MediaProjection) | `app/.../ScreenCapturer.kt` |
| Find board (checkerboard scan) | `core/.../BoardLocator.kt` |
| Recognise pieces (24x24 silhouettes vs templates) | `core/.../Pieces.kt`, `ChessVision.kt` |
| Orientation, FEN, castling-rights tracking | `core/.../Position.kt` |
| Stockfish over UCI | `app/.../StockfishEngine.kt` |

`core` has no Android dependencies, so it is unit-tested on the JVM against a real Duolingo screenshot
(`core/src/test/resources`). Piece templates in `core/src/main/resources/templates` were cropped from that
screenshot; to support another app or theme, add templates named `light_K.png`, `dark_P.png`, ...

## Known limits

- Assumes it's the bottom player's turn when you tap.
- Castling rights are inferred (king/rook on home squares, shrinking over time); en passant is not tracked.
- Piece templates are Duolingo-specific; other apps need their own.
- Stockfish is GPLv3; if you distribute the APK you must comply with that license.
