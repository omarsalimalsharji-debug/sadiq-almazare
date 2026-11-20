#!/usr/bin/env python3
"""Validate Murshid source and image metadata without downloading image files.

Uses only the Python standard library. This validator does not determine copyright
law; it enforces that a human has recorded and approved the required evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent / "reference_library"
SOURCE_FILE = ROOT / "sources.json"
IMAGE_FILE = ROOT / "images.jsonl"

RIGHTS = {"approved", "reference_only", "permission_required", "restricted", "rejected", "unknown"}
REVIEW = {"pending", "approved", "rejected", "needs_expert"}
SPLITS = {"train", "validation", "test", "holdout", "unassigned"}
REQUIRED_SOURCE = {"source_id", "title", "publisher", "source_type", "source_url", "accessed_on", "rights_status", "rights_evidence"}
REQUIRED_IMAGE = {
    "image_id", "source_id", "crop", "label", "scientific_name", "plant_part",
    "evidence_grade", "image_reference", "attribution", "image_license_status",
    "commercial_training_allowed", "review_status", "group_id", "split", "sha256",
}


def load_sources(path: Path) -> tuple[dict[str, dict[str, Any]], list[str]]:
    errors: list[str] = []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {}, [f"sources file cannot be read: {exc}"]
    if payload.get("schema_version") != "1.0.0":
        errors.append("sources.schema_version must be 1.0.0")
    entries = payload.get("sources")
    if not isinstance(entries, list):
        return {}, errors + ["sources must be an array"]
    indexed: dict[str, dict[str, Any]] = {}
    for i, item in enumerate(entries, 1):
        if not isinstance(item, dict):
            errors.append(f"source #{i} must be an object")
            continue
        missing = REQUIRED_SOURCE - item.keys()
        if missing:
            errors.append(f"source #{i} missing: {', '.join(sorted(missing))}")
        source_id = item.get("source_id")
        if not isinstance(source_id, str) or not source_id.strip():
            errors.append(f"source #{i} has an empty source_id")
            continue
        if source_id in indexed:
            errors.append(f"duplicate source_id: {source_id}")
        indexed[source_id] = item
        if item.get("rights_status") not in RIGHTS:
            errors.append(f"{source_id}: invalid rights_status")
        if not item.get("rights_evidence"):
            errors.append(f"{source_id}: rights_evidence must explain the licence or permission basis")
    return indexed, errors


def load_images(path: Path) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    records: list[dict[str, Any]] = []
    if not path.exists():
        return [], [f"image manifest not found: {path}"]
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        try:
            item = json.loads(raw)
        except json.JSONDecodeError as exc:
            errors.append(f"images line {line_no}: invalid JSON ({exc})")
            continue
        if not isinstance(item, dict):
            errors.append(f"images line {line_no}: each row must be an object")
            continue
        item["_line"] = line_no
        records.append(item)
    return records, errors


def validate(source_path: Path = SOURCE_FILE, image_path: Path = IMAGE_FILE,
             strict_training: bool = False) -> list[str]:
    sources, errors = load_sources(source_path)
    images, image_errors = load_images(image_path)
    errors.extend(image_errors)
    seen_ids: set[str] = set()
    seen_hashes: dict[str, str] = {}
    group_splits: dict[str, str] = {}

    for item in images:
        line = item.pop("_line", "?")
        image_id = item.get("image_id", f"line-{line}")
        missing = REQUIRED_IMAGE - item.keys()
        if missing:
            errors.append(f"{image_id}: missing fields: {', '.join(sorted(missing))}")
        if image_id in seen_ids:
            errors.append(f"{image_id}: duplicate image_id")
        seen_ids.add(image_id)

        source_id = item.get("source_id")
        if source_id not in sources:
            errors.append(f"{image_id}: unknown source_id {source_id!r}")
        if item.get("image_license_status") not in RIGHTS:
            errors.append(f"{image_id}: invalid image_license_status")
        if item.get("review_status") not in REVIEW:
            errors.append(f"{image_id}: invalid review_status")
        if item.get("split") not in SPLITS:
            errors.append(f"{image_id}: invalid split")

        digest = item.get("sha256")
        if digest:
            if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest.lower()):
                errors.append(f"{image_id}: sha256 must be a 64-character hexadecimal digest")
            elif digest in seen_hashes:
                errors.append(f"{image_id}: duplicate image checksum also used by {seen_hashes[digest]}")
            else:
                seen_hashes[digest] = image_id

        group_id, split = item.get("group_id"), item.get("split")
        if group_id and split in {"train", "validation", "test", "holdout"}:
            previous = group_splits.setdefault(group_id, split)
            if previous != split:
                errors.append(f"{image_id}: group_id {group_id!r} leaks across {previous}/{split}")

        source = sources.get(source_id, {})
        source_rights = source.get("rights_status")
        train_allowed = item.get("commercial_training_allowed") is True
        eligible = (
            train_allowed
            and item.get("image_license_status") == "approved"
            and source_rights == "approved"
            and item.get("review_status") == "approved"
            and item.get("split") in {"train", "validation", "test"}
            and bool(item.get("sha256"))
            and bool(item.get("attribution"))
        )
        if train_allowed and not eligible:
            errors.append(f"{image_id}: training permission asserted without all required approvals")
        if strict_training and item.get("split") in {"train", "validation", "test"} and not eligible:
            errors.append(f"{image_id}: assigned to a training split but not training-eligible")

    return errors


def self_test() -> None:
    import tempfile

    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        sources = base / "sources.json"
        images = base / "images.jsonl"
        sources.write_text(json.dumps({
            "schema_version": "1.0.0",
            "sources": [{
                "source_id": "demo-source", "title": "Demo", "publisher": "Demo",
                "source_type": "research", "source_url": "https://example.org",
                "accessed_on": "2026-11-20", "rights_status": "approved",
                "rights_evidence": "Explicit test permission"
            }]
        }), encoding="utf-8")
        row = {
            "image_id": "demo-1", "source_id": "demo-source", "crop": "date_palm",
            "label": "example disease", "scientific_name": "Example sp.",
            "plant_part": "leaf", "evidence_grade": "B",
            "image_reference": "https://example.org/figure-1", "attribution": "Demo",
            "image_license_status": "approved", "commercial_training_allowed": True,
            "review_status": "approved", "group_id": "tree-1", "split": "train",
            "sha256": hashlib.sha256(b"demo").hexdigest()
        }
        images.write_text(json.dumps(row) + "\n", encoding="utf-8")
        assert validate(sources, images, strict_training=True) == []
        row["commercial_training_allowed"] = False
        images.write_text(json.dumps(row) + "\n", encoding="utf-8")
        assert any("not training-eligible" in e for e in validate(sources, images, strict_training=True))
    print("Murshid reference-manifest self-test: PASS")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=SOURCE_FILE)
    parser.add_argument("--images", type=Path, default=IMAGE_FILE)
    parser.add_argument("--strict-training", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    errors = validate(args.sources, args.images, args.strict_training)
    if errors:
        print("\n".join(f"ERROR: {error}" for error in errors), file=sys.stderr)
        return 1
    print("Murshid reference manifest: valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
