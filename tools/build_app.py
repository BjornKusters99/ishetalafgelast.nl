#!/usr/bin/env python3
"""Build the web bundle for the Capacitor app (_app) from the public site.

The app ships the site's own files instead of loading the live URL (Apple
guideline 4.2), minus what only makes sense on the web: the service worker,
Cloudflare headers, analytics, crawler files and the prototype page. Pages load
from files in the app, so internal links get their .html back.
"""

import argparse
import logging
import re
import shutil
import tempfile
from pathlib import Path

from build_site import build_site

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://www.ishetalafgelast.nl"
CAPACITOR_JS = ROOT / "node_modules" / "@capacitor" / "core" / "dist" / "capacitor.js"
WEB_ONLY = {
    "_headers", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml",
    "proeftuin.html", "status.json",
}
BEACON = re.compile(r'[ \t]*<script[^>]*static\.cloudflareinsights\.com[^>]*></script>\n?')
MANIFEST = re.compile(r'[ \t]*<link rel="manifest"[^>]*>\n?')
CSP = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]+)(">)')
HREF = re.compile(r'href="(/[a-z0-9/-]*)(#[^"]*)?"')


def app_csp(policy: str) -> str:
    """Drop the analytics hosts; allow the live status file on our own domain."""
    directives = []
    for directive in policy.split(";"):
        parts = directive.split()
        if not parts:
            continue
        values = [v for v in parts[1:] if "cloudflareinsights.com" not in v]
        # iOS laadt de app van capacitor://localhost; 'self' hoort dat te dekken, maar
        # oudere WebKit-versies matchen een eigen schema niet altijd.
        if "'self'" in values:
            values.insert(values.index("'self'") + 1, "capacitor://localhost")
        if parts[0] == "connect-src":
            values.append(SITE)
        directives.append(" ".join([parts[0], *values]))
    return "; ".join(directives) + ";"


def app_html(text: str, output: Path) -> str:
    """Rewrite one page for the app: no analytics, Capacitor runtime, file links."""
    text = BEACON.sub("", text)
    text = MANIFEST.sub("", text)
    text = CSP.sub(lambda m: m[1] + app_csp(m[2]) + m[3], text)

    def link(match: re.Match) -> str:
        path, anchor = match[1], match[2] or ""
        if path == "/":
            return match[0]
        page = path + "index.html" if path.endswith("/") else path + ".html"
        if (output / page.lstrip("/")).is_file():
            return f'href="{page}{anchor}"'
        return match[0]

    text = HREF.sub(link, text)
    first_script = text.find("<script")
    if first_script != -1:
        text = text[:first_script] + '<script src="/js/capacitor.js"></script>\n  ' + text[first_script:]
    return text


def build_app(root: Path, output: Path, capacitor_js: Path = CAPACITOR_JS) -> None:
    """Build the public site in a temporary directory and turn it into the app bundle.

    Args:
        root: Repository root with the generated pages.
        output: Generated app directory (its name must start with "_"); replaced.
        capacitor_js: Capacitor's browser runtime that provides registerPlugin.

    Raises:
        ValueError: Output is not a generated directory.
        FileNotFoundError: Capacitor is not installed (run npm install).
    """
    if not output.name.startswith("_"):
        raise ValueError(f"Output must be a generated directory such as _app: {output}")
    if not capacitor_js.is_file():
        raise FileNotFoundError(f"{capacitor_js} ontbreekt: draai eerst npm install")
    with tempfile.TemporaryDirectory() as tmp:
        site = Path(tmp) / "site"
        build_site(root, site)
        for name in WEB_ONLY:
            (site / name).unlink(missing_ok=True)
        if output.exists():
            shutil.rmtree(output)
        shutil.copytree(site, output)
    for page in output.rglob("*.html"):
        page.write_text(app_html(page.read_text(encoding="utf-8"), output), encoding="utf-8")
    (output / "js").mkdir(exist_ok=True)
    shutil.copyfile(capacitor_js, output / "js" / "capacitor.js")
    logging.info("Built app bundle in %s", output)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "_app")
    args = parser.parse_args()
    build_app(ROOT, args.output)
