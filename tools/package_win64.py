#!/usr/bin/env python3
"""Build and package the Stockfish Studio Windows release.

The script cross-compiles the `desktop` crate, stages the UI assets next to the
executable, and emits a zip archive ready for distribution.  It avoids committing
binary payloads to the repository while still producing the unzip-and-run bundle
on demand.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path
import zipfile

REPO_ROOT = Path(__file__).resolve().parent.parent
DESKTOP_CRATE = REPO_ROOT / "desktop"
ASSETS_SRC = REPO_ROOT / "assets"
INDEX_SRC = REPO_ROOT / "index.html"
DIST_ROOT = REPO_ROOT / "dist"
DIST_PAYLOAD = DIST_ROOT / "win-x64"
DIST_ZIP = DIST_ROOT / "StockfishStudio-win64.zip"


def run(command: list[str], *, cwd: Path | None = None) -> None:
    print(f"$ {' '.join(command)}")
    subprocess.run(command, cwd=cwd, check=True)


def ensure_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise SystemExit(f"Required tool '{name}' was not found on PATH.")


def build_desktop(target: str, profile: str) -> Path:
    ensure_tool("cargo")
    run([
        "cargo",
        "build",
        "--package",
        "stockfish_studio",
        "--no-default-features",
        "--features",
        "desktop",
        "--target",
        target,
        "--profile",
        profile,
    ], cwd=DESKTOP_CRATE)

    exe_name = "stockfish_studio.exe"
    exe_path = (
        DESKTOP_CRATE / "target" / target / profile / exe_name
    )
    if not exe_path.exists():
        raise SystemExit(
            f"Expected built executable at {exe_path}, but the file was not found."
        )
    return exe_path


def ensure_path_exists(path: Path, description: str) -> None:
    if not path.exists():
        raise SystemExit(
            f"Expected to find {description} at {path}, but the path does not exist."
        )


def stage_payload(built_exe: Path, engines: list[Path]) -> Path:
    ensure_path_exists(INDEX_SRC, "the UI entry point (index.html)")
    ensure_path_exists(ASSETS_SRC, "the UI assets directory")

    if DIST_PAYLOAD.exists():
        shutil.rmtree(DIST_PAYLOAD)
    DIST_PAYLOAD.mkdir(parents=True)

    # Copy the executable under the friendly distribution name.
    exe_dest = DIST_PAYLOAD / "StockfishStudio.exe"
    shutil.copy2(built_exe, exe_dest)

    # Stage the UI assets.
    shutil.copy2(INDEX_SRC, DIST_PAYLOAD / "index.html")
    if DIST_PAYLOAD.exists():
        assets_dest = DIST_PAYLOAD / "assets"
        if assets_dest.exists():
            shutil.rmtree(assets_dest)
        shutil.copytree(ASSETS_SRC, assets_dest)

    for engine_path in engines:
        ensure_path_exists(engine_path, f"engine payload '{engine_path}'")
        destination = DIST_PAYLOAD / engine_path.name
        if engine_path.is_dir():
            if destination.exists():
                shutil.rmtree(destination)
            shutil.copytree(engine_path, destination)
        else:
            shutil.copy2(engine_path, destination)

    return exe_dest


def build_zip(payload_root: Path) -> None:
    if DIST_ZIP.exists():
        DIST_ZIP.unlink()

    with zipfile.ZipFile(DIST_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in payload_root.rglob("*"):
            archive.write(path, path.relative_to(payload_root))
    print(f"Created {DIST_ZIP.relative_to(REPO_ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        default="x86_64-pc-windows-msvc",
        help="Rust target triple to compile (default: %(default)s)",
    )
    parser.add_argument(
        "--profile",
        default="release",
        help="Cargo profile to build (default: %(default)s)",
    )
    parser.add_argument(
        "--skip-zip",
        action="store_true",
        help="Skip creating the zip archive (stages files under dist/win-x64 only)",
    )
    parser.add_argument(
        "--engine",
        dest="engines",
        action="append",
        default=[],
        type=Path,
        metavar="PATH",
        help="Additional engine binaries or folders to place next to StockfishStudio.exe",
    )
    args = parser.parse_args()

    built_exe = build_desktop(args.target, args.profile)
    engines = [path.expanduser().resolve() for path in args.engines]
    payload_exe = stage_payload(built_exe, engines)

    if not args.skip_zip:
        build_zip(payload_exe.parent)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode) from exc
