"""Tests for the public-file boundary and release cache version."""

import tempfile
import unittest
from pathlib import Path

from build_site import DIRECTORIES, FILES, build_site


class BuildSiteTest(unittest.TestCase):
    """Build a disposable miniature site without touching project files."""

    def setUp(self) -> None:
        """Create all required source files and one non-public document."""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "source"
        self.root.mkdir()
        for name in FILES:
            (self.root / name).write_text("public", encoding="utf-8")
        (self.root / "sw.js").write_text(
            'const VERSION = "development";', encoding="utf-8"
        )
        for name in DIRECTORIES:
            (self.root / name).mkdir()
        (self.root / "HANDOVER.md").write_text("internal", encoding="utf-8")
        self.output = Path(self.temporary.name) / "public"

    def test_build_site_excludes_internal_files(self) -> None:
        """Only required public files enter the output directory."""
        build_site(self.root, self.output)
        self.assertFalse((self.output / "HANDOVER.md").exists())
        self.assertTrue((self.output / "index.html").is_file())

    def test_build_site_changed_asset_changes_cache_version(self) -> None:
        """A release with different content cannot reuse the old cache."""
        build_site(self.root, self.output)
        old_worker = (self.output / "sw.js").read_text()
        (self.root / "styles.css").write_text("changed", encoding="utf-8")
        other = Path(self.temporary.name) / "second"
        build_site(self.root, other)
        self.assertNotEqual(old_worker, (other / "sw.js").read_text())

    def test_build_site_unexpected_public_file_fails(self) -> None:
        """A newly added secret cannot silently enter a runtime directory."""
        (self.root / "js" / ".env").write_text("secret", encoding="utf-8")
        with self.assertRaises(ValueError):
            build_site(self.root, self.output)

    def test_build_site_symlink_fails(self) -> None:
        """Symlinks cannot expose files outside the approved source tree."""
        (self.root / "js" / "secret.js").symlink_to(
            self.root / "HANDOVER.md"
        )
        with self.assertRaises(ValueError):
            build_site(self.root, self.output)

    def test_build_site_existing_output_fails(self) -> None:
        """Old output must not preserve stale files across deployments."""
        self.output.mkdir()
        with self.assertRaises(FileExistsError):
            build_site(self.root, self.output)


if __name__ == "__main__":
    unittest.main()
