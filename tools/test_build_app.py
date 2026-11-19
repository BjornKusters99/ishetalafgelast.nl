"""Tests for the app bundle: web-only files out, Capacitor in, links to files."""

import tempfile
import unittest
from pathlib import Path

from build_app import app_csp, build_app
from build_site import DIRECTORIES, FILES

PAGE = """<!DOCTYPE html>
<html lang="nl">
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com https://api.open-meteo.com; object-src 'none';">
  <link rel="manifest" href="/manifest.webmanifest">
  <script src="/js/route.js"></script>
  <script type="module" src="/js/app.js"></script>
  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "x"}'></script>
</head>
<body>
  <a href="/">Home</a> <a href="/#rekenwerk">Rekenwerk</a> <a href="/plaatsen/">Plaatsen</a>
  <a href="/plaatsen/oss">Oss</a> <a href="/privacy#app">Privacy</a> <a href="/bestaat-niet">Weg</a>
</body>
</html>
"""


class BuildAppTest(unittest.TestCase):
    """Build a miniature site and turn it into an app bundle."""

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        base = Path(self.temporary.name)
        self.root = base / "source"
        self.root.mkdir()
        for name in FILES:
            (self.root / name).write_text("public", encoding="utf-8")
        (self.root / "sw.js").write_text('const VERSION = "development";', encoding="utf-8")
        for name in DIRECTORIES:
            (self.root / name).mkdir()
        (self.root / "index.html").write_text(PAGE, encoding="utf-8")
        (self.root / "privacy.html").write_text("<p>privacy</p>", encoding="utf-8")
        (self.root / "plaatsen" / "index.html").write_text("<p>plaatsen</p>", encoding="utf-8")
        (self.root / "plaatsen" / "oss.html").write_text(PAGE, encoding="utf-8")
        (self.root / "lab" / "proef.js").write_text("export {};", encoding="utf-8")
        self.capacitor = base / "capacitor.js"
        self.capacitor.write_text("var capacitorExports = {};", encoding="utf-8")
        self.output = base / "_app"

    def build(self) -> str:
        build_app(self.root, self.output, self.capacitor)
        return (self.output / "index.html").read_text(encoding="utf-8")

    def test_web_only_files_stay_out(self) -> None:
        """No service worker, Cloudflare headers, crawler files or prototype page; lab/ ships for the tactics board."""
        self.build()
        for name in ("sw.js", "_headers", "robots.txt", "sitemap.xml", "manifest.webmanifest", "proeftuin.html", "status.json"):
            self.assertFalse((self.output / name).exists(), name)
        self.assertTrue((self.output / "lab" / "proef.js").is_file())
        self.assertTrue((self.output / "js" / "capacitor.js").is_file())

    def test_capacitor_loads_before_the_app_and_analytics_are_gone(self) -> None:
        html = self.build()
        self.assertNotIn("cloudflareinsights", html)
        self.assertNotIn('rel="manifest"', html)
        self.assertLess(html.index('src="/js/capacitor.js"'), html.index('src="/js/route.js"'))

    def test_links_point_to_files(self) -> None:
        """Pages load from files in the app, so extensionless links get .html back."""
        html = self.build()
        for href in ('href="/"', 'href="/#rekenwerk"', 'href="/plaatsen/index.html"', 'href="/plaatsen/oss.html"', 'href="/privacy.html#app"', 'href="/bestaat-niet"'):
            self.assertIn(href, html)
        self.assertIn('href="/plaatsen/oss.html"', (self.output / "plaatsen" / "oss.html").read_text(encoding="utf-8"))

    def test_csp_allows_the_live_status_file_only(self) -> None:
        policy = app_csp("default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com;")
        self.assertEqual(policy, "default-src 'self' capacitor://localhost; script-src 'self' capacitor://localhost; connect-src 'self' capacitor://localhost https://www.ishetalafgelast.nl;")

    def test_rebuild_replaces_stale_files(self) -> None:
        self.build()
        (self.output / "oud.js").write_text("stale", encoding="utf-8")
        self.build()
        self.assertFalse((self.output / "oud.js").exists())

    def test_output_must_be_generated_directory(self) -> None:
        with self.assertRaises(ValueError):
            build_app(self.root, self.root / "js", self.capacitor)


if __name__ == "__main__":
    unittest.main()
