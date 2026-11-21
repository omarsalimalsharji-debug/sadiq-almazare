#!/usr/bin/env python3
"""Fail-closed helpers for dataset image quarantine (Python standard library only)."""
from __future__ import annotations

import json
from pathlib import PurePosixPath
from typing import Any

ALLOWED_STATUSES = {
    "HOLD_PENDING_REVIEW",
    "CLEARED_AFTER_REVIEW",
    "EXCLUDE_FROM_TRAINING",
}


def normalize_relative_path(value: str) -> str:
    """Normalize a manifest path and reject absolute paths or traversal."""
    normalized = str(value).replace("\\", "/")
    path = PurePosixPath(normalized)
    if (
        not normalized
        or path.is_absolute()
        or any(part in {"", ".", ".."} for part in normalized.split("/"))
        or (len(normalized) >= 2 and normalized[1] == ":")
    ):
        raise ValueError(f"Unsafe quarantine relative path: {value!r}")
    return path.as_posix()


def load_quarantine_manifest(path) -> dict[str, dict[str, Any]]:
    """Load and validate entries keyed by their raw-root-relative image path."""
    from pathlib import Path

    manifest_path = Path(path)
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Cannot load quarantine manifest {manifest_path}: {exc}") from exc

    if payload.get("schema_version") != "1.0.0":
        raise ValueError("Unsupported quarantine manifest schema_version")
    if not payload.get("dataset_id") or not isinstance(payload.get("records"), list):
        raise ValueError("Quarantine manifest requires dataset_id and records array")

    indexed: dict[str, dict[str, Any]] = {}
    for number, item in enumerate(payload["records"], 1):
        if not isinstance(item, dict):
            raise ValueError(f"Quarantine record #{number} must be an object")
        for field in ("raw_relative_path", "class_name", "status", "pair_id"):
            if not item.get(field):
                raise ValueError(f"Quarantine record #{number} missing {field}")
        relative = normalize_relative_path(item["raw_relative_path"])
        if item["status"] not in ALLOWED_STATUSES:
            raise ValueError(f"Quarantine record #{number} has unsupported status")
        if relative in indexed:
            raise ValueError(f"Duplicate quarantine path: {relative}")
        indexed[relative] = {**item, "raw_relative_path": relative}
    return indexed


def is_quarantined(relative_path: str, class_name: str,
                   quarantine_index: dict[str, dict[str, Any]]) -> bool:
    """Return True unless a matching entry has been manually cleared."""
    relative = normalize_relative_path(relative_path)
    entry = quarantine_index.get(relative)
    if entry is None:
        return False
    if entry["class_name"] != class_name:
        raise ValueError(
            f"Quarantine class mismatch for {relative}: "
            f"manifest={entry['class_name']!r}, dataset={class_name!r}"
        )
    return entry["status"] != "CLEARED_AFTER_REVIEW"
