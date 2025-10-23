Stockfish Studio
================

Stockfish Studio is a modern, Chess.com-inspired interface for playing against the
Stockfish chess engine. The codebase focuses on source control friendly assets so
that no large binary payloads are checked into the repository while still making
it easy to build the unzip-and-run Windows experience.

Creating the portable Windows bundle
------------------------------------
Use the helper script to compile the desktop shell, gather the HTML/CSS/JS
payload, and create the redistributable zip archive. The generated archive now
places `StockfishStudio.exe` at the root level so the executable is immediately
visible after extraction:

```
python tools/package_win64.py
```

Requirements:

- Rust with the `x86_64-pc-windows-msvc` (default) or `x86_64-pc-windows-gnu` target installed.
- Python 3.8 or later.

The script outputs the familiar `dist/StockfishStudio-win64.zip` archive. Extract
it and double-click `StockfishStudio.exe` to launch the Chess.com-style desktop
experience—no installers or additional commands required.

If you prefer a different build profile or target triple, pass
`--profile <name>` or `--target <triple>` to the script. Use `--skip-zip` when
you only need the staged folder at `dist/win-x64/` without recompressing it.

To bundle native UCI engines alongside the app (for example, an extracted
`stockfish.exe` build), supply one or more `--engine` arguments. Each file or
directory is copied next to `StockfishStudio.exe` in the staged folder and in
the resulting archive:

```
python tools/package_win64.py --engine /path/to/stockfish.exe
```

Importing custom UCI engines in the app
---------------------------------------
The desktop shell now lets you swap out the bundled Stockfish.js worker without
modifying the source. Use the **Import engine** button in the top toolbar to
select a JavaScript-based UCI engine (for example, an alternative Stockfish.js
build or an LCZero worker). The engine is loaded directly from the chosen file
and activated immediately after import. If you want to return to the bundled
engine, click **Use bundled** to restore the default Stockfish.js instance.

Only Web Worker compatible `.js`, `.mjs`, or `.worker` files are supported. The
feature is designed for offline use, so the imported engine runs entirely on the
client without needing network access.

Why the binaries are not in Git
-------------------------------
Some contribution platforms reject pull requests that contain large binary
payloads. Keeping the distribution artefacts out of source control avoids those
limits while the packaging script preserves the unzip-and-run workflow for end
users.

Cross-platform fallback
-----------------------
If you are not on Windows, you can still open `index.html` directly in any modern
Chromium, Firefox, or Safari based browser to use the exact same interface.

Key features
------------
- **Play as either side** – Choose White, Black, or let the app randomise your colour.
- **Adaptive Stockfish difficulty** – Slider-controlled skill levels map to Stockfish skill 1–20 with dynamic move time.
- **Time controls** – Rapid, blitz, bullet, or unlimited mode with animated clocks and increments.
- **Modern presentation** – Chess.com-inspired layout, live evaluation bar, captured-piece tracker, and themed panels.
- **Move history & PGN export** – Track moves with SAN notation and download the full PGN of your games.
- **Live multi-PV analysis** – See Stockfish’s top candidate lines update in real time.
- **Hint system** – Request the engine’s best move without committing it on the board.
- **Board editor** – Enable editor mode to place pieces, toggle castling rights, set the side to move, and inject custom FENs directly into the game.
- **Keyboard & pointer friendly** – Supports click-to-move, drag-and-drop, and promotion selection overlays.
- **Offline-ready** – Bundled Stockfish (lite single-file build) and chess.js mean no network access is required after extraction.

Tips
----
- Toggle **Analysis Mode** to pause automatic engine replies while keeping evaluation updates active.
- Turn off **Auto engine replies** for training scenarios where you only want hints.
- The evaluation gauge displays values from your perspective—positive scores favour your colour.
- Use the board editor’s palette to clear squares, load the starting position, or generate a FEN snippet instantly.

Credits
-------
- Stockfish.js 17.1 lite-single build (GPLv3) powers the engine.
- chess.js 1.4.0 provides rules enforcement and move generation.
