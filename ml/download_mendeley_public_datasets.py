#!/usr/bin/env python3
"""Download public Mendeley Data ZIP archives with streaming integrity checks.

No Mendeley account token is requested. Public dataset downloads are attempted
through Mendeley's documented public ZIP redirect endpoint. If the endpoint
requires authentication or the archive is still being prepared, the script
stops with a clear error and never saves an HTML error page as a ZIP.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

DATASETS = {
    "iraq-dubas": ("2nh364p2bc", 2, "iraq-dubas-date-palm-v2.zip"),
    "saudi-date-palm": ("g684ghfxvg", 2, "saudi-date-palm-leaf-diseases-v2.zip"),
}
CHUNK = 1024 * 1024
USER_AGENT = "Murshid-Reference-Library/1.0 (public dataset retrieval)"


class DownloadError(RuntimeError):
    pass


def request(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(req, timeout=60)


def download_one(key: str, out_dir: Path, force: bool = False) -> Path:
    dataset_id, version, filename = DATASETS[key]
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / filename
    partial = target.with_suffix(target.suffix + ".part")
    if target.exists() and not force:
        raise DownloadError(f"{target} already exists; use --force to replace it")

    url = (
        f"https://api.data.mendeley.com/datasets/{dataset_id}/zip/"
        f"file_downloaded?version={version}"
    )
    print(f"[{key}] Requesting official Mendeley Data archive…", flush=True)
    digest = hashlib.sha256()
    total = 0
    try:
        with request(url) as response:
            status = getattr(response, "status", 200)
            content_type = response.headers.get("Content-Type", "").lower()
            content_length = response.headers.get("Content-Length")
            print(f"[{key}] HTTP {status}; content-type={content_type or 'unknown'}", flush=True)
            first = response.read(CHUNK)
            if not first.startswith(b"PK\\x03\\x04") and not first.startswith(b"PK\\x05\\x06"):
                preview = first[:200].decode("utf-8", errors="replace").replace("\\n", " ")
                raise DownloadError(
                    "The server did not return a ZIP archive. "
                    f"Response preview: {preview!r}"
                )
            with partial.open("wb") as stream:
                stream.write(first)
                digest.update(first)
                total += len(first)
                while True:
                    block = response.read(CHUNK)
                    if not block:
                        break
                    stream.write(block)
                    digest.update(block)
                    total += len(block)
                    if total % (20 * CHUNK) < CHUNK:
                        print(f"[{key}] Downloaded {total / (1024 * 1024):.1f} MiB", flush=True)
        if not zipfile.is_zipfile(partial):
            raise DownloadError("Downloaded content failed ZIP integrity validation")
        if content_length and int(content_length) != total:
            raise DownloadError(
                f"Content-Length mismatch: expected {content_length}, received {total}"
            )
        if target.exists() and force:
            target.unlink()
        partial.replace(target)
        print(
            f"[{key}] COMPLETE: {target} | {total} bytes | SHA-256 {digest.hexdigest()}",
            flush=True,
        )
        return target
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, DownloadError) as exc:
        try:
            partial.unlink(missing_ok=True)
        except OSError:
            pass
        raise DownloadError(f"{key}: {exc}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "datasets", nargs="*", choices=tuple(DATASETS),
        help="Datasets to download; omit to download both",
    )
    parser.add_argument("--output-dir", type=Path, default=Path("murshid-datasets"))
    parser.add_argument("--force", action="store_true", help="Replace existing archives")
    args = parser.parse_args()

    selected = args.datasets or list(DATASETS)
    failures = 0
    for key in selected:
        try:
            archive = download_one(key, args.output_dir.expanduser(), args.force)
            print(f"[{key}] Next: python ml/audit_image_archive.py \"{archive}\"", flush=True)
        except DownloadError as exc:
            failures += 1
            print(f"ERROR: {exc}", file=sys.stderr)
    if failures:
        print(
            "One or more downloads did not complete. Check network access and retry; "
            "no incomplete archive was kept.",
            file=sys.stderr,
        )
        return 1
    print("All requested public dataset archives downloaded and ZIP-validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
