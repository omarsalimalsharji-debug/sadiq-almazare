#!/usr/bin/env python3
"""Unit tests for Murshid's fail-closed dataset quarantine."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from ml.quarantine import (is_quarantined, load_quarantine_manifest, remove_exact_duplicate_records)

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "quarantine" / "saudi_date_palm_leaf_v2.json"


class QuarantineTests(unittest.TestCase):
    def setUp(self):
        self.index = load_quarantine_manifest(MANIFEST)

    def test_manifest_contains_exactly_24_held_images(self):
        self.assertEqual(len(self.index), 24)
        self.assertTrue(all(
            row["status"] == "HOLD_PENDING_REVIEW"
            for row in self.index.values()
        ))

    def test_all_manifest_images_are_excluded(self):
        for relative, row in self.index.items():
            with self.subTest(path=relative):
                self.assertTrue(is_quarantined(relative, row["class_name"], self.index))

    def test_ordinary_image_is_accepted(self):
        self.assertFalse(is_quarantined(
            "1. Potassium Deficiency/not-listed-image.jpg",
            "1. Potassium Deficiency",
            self.index,
        ))

    def test_class_mismatch_fails_closed(self):
        relative, row = next(iter(self.index.items()))
        with self.assertRaises(ValueError):
            is_quarantined(relative, "incorrect class", self.index)

    def test_only_explicit_manual_clearance_releases_image(self):
        relative, row = next(iter(self.index.items()))
        self.index[relative]["status"] = "CLEARED_AFTER_REVIEW"
        self.assertFalse(is_quarantined(relative, row["class_name"], self.index))
        self.index[relative]["status"] = "EXCLUDE_FROM_TRAINING"
        self.assertTrue(is_quarantined(relative, row["class_name"], self.index))

    def test_exact_same_class_duplicates_are_deduplicated_in_memory(self):
        records = [
            {"sha": "abc", "class": "Bug", "path": "a.jpg"},
            {"sha": "abc", "class": "Bug", "path": "b.jpg"},
            {"sha": "def", "class": "Healthy", "path": "c.jpg"},
        ]
        unique, removed = remove_exact_duplicate_records(records)
        self.assertEqual(len(unique), 2)
        self.assertEqual(removed, 1)
        self.assertTrue(Path("a.jpg").exists() is False)  # Source files are untouched.

    def test_exact_duplicates_with_conflicting_labels_fail_closed(self):
        records = [
            {"sha": "same", "class": "Bug"},
            {"sha": "same", "class": "Honey"},
        ]
        with self.assertRaisesRegex(ValueError, "conflicting labels"):
            remove_exact_duplicate_records(records)

    def test_manifest_rejects_duplicate_or_unsafe_paths(self):
        from ml.quarantine import normalize_relative_path, load_quarantine_manifest

        with self.assertRaises(ValueError):
            normalize_relative_path("../outside.jpg")
        with self.assertRaises(ValueError):
            normalize_relative_path("/absolute/image.jpg")

        duplicate = {
            "schema_version": "1.0.0",
            "dataset_id": "test-dataset",
            "records": [
                {"pair_id": "P1", "raw_relative_path": "class/image.jpg",
                 "class_name": "class", "status": "HOLD_PENDING_REVIEW"},
                {"pair_id": "P2", "raw_relative_path": "class/image.jpg",
                 "class_name": "class", "status": "HOLD_PENDING_REVIEW"},
            ],
        }
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "duplicate.json"
            path.write_text(json.dumps(duplicate), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Duplicate quarantine path"):
                load_quarantine_manifest(path)


if __name__ == "__main__":
    unittest.main()
