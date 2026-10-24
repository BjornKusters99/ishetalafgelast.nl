#!/usr/bin/env python3
"""Build only approved public files and derive the service-worker version."""

import argparse
import hashlib
import logging
import re
import shutil
from pathlib import Path
from typing import Dict, Set

FILES = {
    ".nojekyll", "CNAME", "index.html", "404.html", "privacy.html",
    "styles.css", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml",
    "status.json",
}
DIRECTORIES: Dict[str, Set[str]] = {
    "js": {".js"},
    "plaatsen": {".html"},
    "fonts": {".woff2"},
    "img": {".webp", ".png", ".jpg"},
}


def build_site(root: Path, output: Path) -> None:
    """Copy allowlisted files to a new directory, refusing symlinks.

    Args:
        root: Repository root containing generated pages.
        output: New output directory; it must not already exist.

    Raises:
        ValueError: A public file has an unexpected name or is a symlink.
        FileExistsError: Output already exists; stale files must not deploy.
    """
    paths = [root / name for name in sorted(FILES)]
    for name, suffixes in DIRECTORIES.items():
        directory = root / name
        if directory.is_symlink():
            raise ValueError(f"Symlink not allowed: {name}")
        for path in sorted(directory.rglob("*")):
            if path.is_symlink():
                raise ValueError(f"Symlink not allowed: {path.relative_to(root)}")
            if path.is_file():
                if path.suffix not in suffixes or not re.fullmatch(
                    r"[a-z0-9-]+\.[a-z0-9]+", path.name
                ):
                    raise ValueError(f"Unexpected public file: {path.name}")
                paths.append(path)
    digest = hashlib.sha256()
    for path in paths:
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Missing or unsafe public file: {path.name}")
        digest.update(str(path.relative_to(root)).encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
    output.mkdir(parents=True, exist_ok=False)
    for path in paths:
        target = output / path.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    worker = output / "sw.js"
    source, count = re.subn(
        r'const VERSION = "[^"]+";',
        f'const VERSION = "ishetalafgelast-{digest.hexdigest()}";',
        worker.read_text(encoding="utf-8"),
    )
    if count != 1:
        raise ValueError("Service worker must have one cache version")
    worker.write_text(source, encoding="utf-8")
    logging.info("Built %d public files in %s", len(paths), output)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("_site"))
    args = parser.parse_args()
    build_site(Path(__file__).resolve().parents[1], args.output)
