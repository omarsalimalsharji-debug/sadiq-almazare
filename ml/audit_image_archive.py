#!/usr/bin/env python3
"""Audit an agricultural image archive without extracting or modifying its contents.

Supports ZIP and TAR archives. Uses only the Python standard library by default.
Install Pillow separately to verify image decoding and dimensions:
    python -m pip install Pillow
The report is an inventory only; it never approves labels or training eligibility.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import tarfile
import zipfile
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, BinaryIO

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"
}
CHUNK_SIZE = 1024 * 1024
DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024
DEFAULT_MAX_TOTAL_BYTES = 20 * 1024 * 1024 * 1024
DEFAULT_MAX_MEMBERS = 100_000


def safe_member_name(name: str) -> bool:
    """Reject absolute paths, traversal, drive paths and malformed names."""
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    return (
        bool(normalized)
        and not normalized.startswith("/")
        and not path.is_absolute()
        and not any(part in {"", ".", ".."} for part in normalized.split("/"))
        and not (len(normalized) >= 2 and normalized[1] == ":")
    )


def image_metadata(data: bytes) -> dict[str, Any]:
    try:
        from PIL import Image
    except ImportError:
        return {"decode_status": "not_checked_pillow_missing"}
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = img.format
            width, height = img.size
            frames = getattr(img, "n_frames", 1)
            img.verify()
        return {
            "decode_status": "valid",
            "detected_format": fmt,
            "width": width,
            "height": height,
            "frames": frames,
        }
    except Exception as exc:  # Pillow raises several format-specific exceptions.
        return {"decode_status": "corrupt_or_unsupported", "decode_error": str(exc)[:240]}


def digest_stream(stream: BinaryIO, max_bytes: int) -> tuple[str, int, bytes]:
    digest = hashlib.sha256()
    size = 0
    prefix = bytearray()
    while True:
        chunk = stream.read(CHUNK_SIZE)
        if not chunk:
            break
        size += len(chunk)
        if size > max_bytes:
            raise ValueError(f"member exceeds per-file limit ({max_bytes} bytes)")
        digest.update(chunk)
        if len(prefix) < 32:
            prefix.extend(chunk[: 32 - len(prefix)])
    return digest.hexdigest(), size, bytes(prefix)


def audit_zip(path: Path, max_file_bytes: int, max_total_bytes: int,
              max_members: int) -> tuple[list[dict[str, Any]], list[str]]:
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    total = 0
    with zipfile.ZipFile(path) as archive:
        members = [m for m in archive.infolist() if not m.is_dir()]
        if len(members) > max_members:
            raise ValueError(f"archive has {len(members)} files; limit is {max_members}")
        for member in members:
            name = member.filename
            if not safe_member_name(name):
                warnings.append(f"unsafe_path_skipped:{name}")
                continue
            if member.flag_bits & 0x1:
                warnings.append(f"encrypted_member_skipped:{name}")
                continue
            if member.file_size > max_file_bytes:
                warnings.append(f"oversized_member_skipped:{name}")
                continue
            total += member.file_size
            if total > max_total_bytes:
                raise ValueError(f"uncompressed archive content exceeds {max_total_bytes} bytes")
            suffix = Path(name).suffix.lower()
            if suffix not in IMAGE_EXTENSIONS:
                continue
            with archive.open(member, "r") as stream:
                sha, actual_size, _ = digest_stream(stream, max_file_bytes)
            with archive.open(member, "r") as stream:
                data = stream.read(max_file_bytes + 1)
            meta = image_metadata(data)
            records.append(make_record(name, actual_size, sha, meta))
    return records, warnings


def audit_tar(path: Path, max_file_bytes: int, max_total_bytes: int,
              max_members: int) -> tuple[list[dict[str, Any]], list[str]]:
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    total = 0
    with tarfile.open(path, "r:*") as archive:
        members = [m for m in archive.getmembers() if m.isfile()]
        if len(members) > max_members:
            raise ValueError(f"archive has {len(members)} files; limit is {max_members}")
        for member in members:
            name = member.name
            if not safe_member_name(name):
                warnings.append(f"unsafe_path_skipped:{name}")
                continue
            if member.size > max_file_bytes:
                warnings.append(f"oversized_member_skipped:{name}")
                continue
            total += member.size
            if total > max_total_bytes:
                raise ValueError(f"uncompressed archive content exceeds {max_total_bytes} bytes")
            if Path(name).suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            stream = archive.extractfile(member)
            if stream is None:
                warnings.append(f"unreadable_member_skipped:{name}")
                continue
            with stream:
                sha, actual_size, _ = digest_stream(stream, max_file_bytes)
            stream = archive.extractfile(member)
            if stream is None:
                warnings.append(f"unreadable_member_skipped:{name}")
                continue
            with stream:
                data = stream.read(max_file_bytes + 1)
            records.append(make_record(name, actual_size, sha, image_metadata(data)))
    return records, warnings


def make_record(name: str, size: int, sha: str,
                metadata: dict[str, Any]) -> dict[str, Any]:
    parts = PurePosixPath(name.replace("\\", "/")).parts
    return {
        "archive_path": name,
        "folder_label_candidate": parts[0] if len(parts) > 1 else "",
        "extension": Path(name).suffix.lower(),
        "size_bytes": size,
        "sha256": sha,
        **metadata,
        "review_status": "pending",
        "training_eligible": False,
    }


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_report(archive_path: Path, records: list[dict[str, Any]],
                 warnings: list[str]) -> dict[str, Any]:
    by_hash: dict[str, list[str]] = defaultdict(list)
    for item in records:
        by_hash[item["sha256"]].append(item["archive_path"])
    duplicates = [
        {"sha256": sha, "paths": paths}
        for sha, paths in by_hash.items() if len(paths) > 1
    ]
    status_counts = Counter(item.get("decode_status", "unknown") for item in records)
    ext_counts = Counter(item["extension"] for item in records)
    return {
        "report_schema": "murshid-archive-audit-1.0",
        "archive": archive_path.name,
        "archive_sha256": file_sha256(archive_path),
        "image_count": len(records),
        "extension_counts": dict(sorted(ext_counts.items())),
        "decode_status_counts": dict(sorted(status_counts.items())),
        "exact_duplicate_groups": duplicates,
        "warnings": warnings,
        "images": records,
        "important": [
            "Inventory only: no crop, disease or pest label has been validated.",
            "All images remain pending and training_eligible is false.",
            "Folder names are unverified label candidates, not confirmed diagnoses.",
            "Review source licence, attribution and specimen grouping before use.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Input .zip, .tar, .tar.gz or .tgz archive")
    parser.add_argument("--output", type=Path, help="JSON report path (default: <archive>.audit.json)")
    parser.add_argument("--max-file-mb", type=int, default=100)
    parser.add_argument("--max-total-gb", type=int, default=20)
    parser.add_argument("--max-members", type=int, default=DEFAULT_MAX_MEMBERS)
    args = parser.parse_args()

    archive_path = args.archive.expanduser().resolve()
    if not archive_path.is_file():
        parser.error(f"archive does not exist or is not a file: {archive_path}")
    max_file = args.max_file_mb * 1024 * 1024
    max_total = args.max_total_gb * 1024 * 1024 * 1024
    if max_file <= 0 or max_total <= 0 or args.max_members <= 0:
        parser.error("all size and member limits must be positive")

    try:
        if zipfile.is_zipfile(archive_path):
            records, warnings = audit_zip(archive_path, max_file, max_total, args.max_members)
        elif tarfile.is_tarfile(archive_path):
            records, warnings = audit_tar(archive_path, max_file, max_total, args.max_members)
        else:
            parser.error("unsupported archive; expected ZIP or TAR")
        report = build_report(archive_path, records, warnings)
        output = args.output or archive_path.with_name(archive_path.name + ".audit.json")
        output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, zipfile.BadZipFile, tarfile.TarError, ValueError) as exc:
        parser.error(f"archive audit failed: {exc}")

    print(f"Archive audit complete: {len(records)} image candidates")
    print(f"Report: {output}")
    print(f"Exact duplicate groups: {len(report['exact_duplicate_groups'])}")
    print(f"Warnings: {len(warnings)}")
    if any(item.get("decode_status") == "not_checked_pillow_missing" for item in records):
        print("Tip: install Pillow to verify image decoding and dimensions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
