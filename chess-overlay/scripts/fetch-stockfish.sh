#!/usr/bin/env bash
# Downloads the official Stockfish Android (arm64) build and installs it as libstockfish.so.
# Stockfish is GPLv3: https://github.com/official-stockfish/Stockfish
set -euo pipefail
VER="${SF_VERSION:-sf_17.1}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/app/src/main/jniLibs/arm64-v8a/libstockfish.so"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fL "https://github.com/official-stockfish/Stockfish/releases/download/${VER}/stockfish-android-armv8.tar" -o "$TMP/sf.tar"
tar -xf "$TMP/sf.tar" -C "$TMP"
install -D -m 755 "$TMP/stockfish/stockfish-android-armv8" "$DEST"
echo "Installed $DEST ($(du -h "$DEST" | cut -f1))"
