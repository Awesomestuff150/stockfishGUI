Stockfish Studio
================

Stockfish Studio is a modern, Chess.com-inspired interface for playing against the Stockfish chess engine. The repository now ships with a prebuilt Windows desktop executable, so you can download the project ZIP, extract it anywhere, and launch `StockfishStudio.exe` immediately.

Quick start
-----------
1. Download the project archive from GitHub (either `git clone` or use **Download ZIP**).
2. Extract the contents.
3. Double-click `StockfishStudio.exe` in the repository root. Keep `index.html` and the `assets/` folder next to the executable so the UI loads correctly.

Rebuilding the bundle
---------------------
If you want to regenerate the executable or the distributable zip, install the tooling below and run the packaging helper script.

Requirements:
- Rust with the `x86_64-pc-windows-msvc` target (the default host toolchain).
- Visual Studio Build Tools 2022 with the Desktop C++ workload (provides `link.exe` and the Windows SDK headers/libraries).
- Python 3.8 or later.

Command:
```
python tools/package_win64.py
```

The script compiles the `desktop` crate in release mode, stages the UI assets alongside the binary, and emits `dist/StockfishStudio-win64.zip`. The staged directory at `dist/win-x64/` mirrors the layout used for the checked-in portable build.

Optional flags:
- `--profile <name>` to use a non-default Cargo profile.
- `--target <triple>` to build for another target triple.
- `--skip-zip` to stage files without recompressing them.
- `--engine <path>` one or more times to copy extra UCI engines alongside the executable.

Importing custom UCI engines
----------------------------
Inside the desktop shell, use **Import engine** to point at a JavaScript-based UCI worker (`.js`, `.mjs`, or `.worker`). The engine is loaded locally and activated immediately. **Use bundled** restores the default Stockfish.js worker.

Tips
----
- Toggle **Analysis Mode** to pause automatic engine replies while keeping evaluation updates active.
- Turn off **Auto engine replies** for training scenarios where you only want hints.
- The evaluation gauge shows scores from your perspective; positive values favor your color.
- The board editor palette includes quick actions to clear the board or restore the starting position.

Credits
-------
- Stockfish.js 17.1 lite-single (GPLv3) powers the bundled engine.
- chess.js 1.4.0 provides rules enforcement and move generation.

