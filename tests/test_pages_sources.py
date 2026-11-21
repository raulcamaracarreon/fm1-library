import hashlib
import json
import sys
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / "scripts"))
from pages_sources import SOURCES, manifest_filename, safe_filename, resolve_pages_downloads


class PagesSourcesTests(unittest.TestCase):
    def record(self, blob=b"sample firmware"):
        return {
            "id": "jiant", "name": "JIANT FM", "version": "V10.7.58",
            "sha256": hashlib.sha256(blob).hexdigest(),
        }

    def fake_fetch(self, blob, file="felucca-V10.7.58.fwsc"):
        root = SOURCES["jiant"]["directory"]
        payload = json.dumps([{"version": "V10.7.58", "file": file}]).encode()
        calls = []

        def fetch(url, limit):
            calls.append(url)
            if url == root + "versions.json":
                return payload
            if url == root + file:
                return blob
            raise AssertionError("Se intentó una URL ajena al manifiesto")
        return fetch, calls

    def test_public_manifest_may_use_other_filename_than_hub(self):
        name = manifest_filename(json.dumps([
            {"version": "V10.7.58", "file": "felucca-V10.7.58.fwsc"},
            {"version": "V10.7.57", "file": "felucca-V10.7.57.fwsc"},
        ]).encode(), "V10.7.58")
        self.assertEqual(name, "felucca-V10.7.58.fwsc")

    def test_exact_hash_creates_url(self):
        blob = b"sample firmware"
        fetch, calls = self.fake_fetch(blob)
        f = self.record(blob)
        resolve_pages_downloads({"firmwares": [f]}, fetch=fetch, logger=lambda _: None)
        self.assertEqual(f["downloadKind"], "github_pages")
        self.assertEqual(f["downloadUrl"], SOURCES["jiant"]["directory"] + "felucca-V10.7.58.fwsc")
        self.assertEqual(len(calls), 2)

    def test_wrong_hash_never_creates_url(self):
        fetch, _ = self.fake_fetch(b"different contents")
        f = self.record()
        resolve_pages_downloads({"firmwares": [f]}, fetch=fetch, logger=lambda _: None)
        self.assertNotIn("downloadUrl", f)

    def test_missing_manifest_version_never_creates_url(self):
        fetch, _ = self.fake_fetch(b"sample", "felucca-ANOTHER.fwsc")
        f = self.record()
        resolve_pages_downloads({"firmwares": [f]}, fetch=fetch, logger=lambda _: None)
        self.assertNotIn("downloadUrl", f)

    def test_file_path_traversal_rejected(self):
        self.assertFalse(safe_filename("../private.fwsc"))
        self.assertFalse(safe_filename("https://example.com/x.fwsc"))
        self.assertFalse(safe_filename("x.zip"))
        self.assertTrue(safe_filename("felucca-V10.7.58.fwsc"))

    def test_previous_url_preserved_only_same_hash(self):
        blob = b"sample firmware"
        current = self.record(blob)
        old = {**current, "downloadKind": "github_pages",
               "downloadUrl": SOURCES["jiant"]["directory"] + "felucca-V10.7.58.fwsc",
               "downloadVerifiedAt": "2026-11-21"}
        def fail(url, limit):
            raise OSError("Red no disponible")
        resolve_pages_downloads({"firmwares": [current]}, {"firmwares": [old]},
                                fetch=fail, logger=lambda _: None)
        self.assertEqual(current.get("downloadUrl"), old["downloadUrl"])
        other = self.record(b"new firmware")
        resolve_pages_downloads({"firmwares": [other]}, {"firmwares": [old]},
                                fetch=fail, logger=lambda _: None)
        self.assertNotIn("downloadUrl", other)


if __name__ == "__main__":
    unittest.main()
