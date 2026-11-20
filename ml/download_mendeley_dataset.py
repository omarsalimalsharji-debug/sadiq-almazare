#!/usr/bin/env python3
"""Download a public Mendeley Data dataset archive without committing images.

Public dataset endpoints may require an access token depending on repository
policy. If so, use the original dataset landing page's Download All button.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def request_json(url: str, token: str | None):
    headers = {"Accept": "application/json", "User-Agent": "Murshid-Agronomy-Research/0.1"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers)
    with urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8")), response.geturl()


def download_stream(url: str, target: Path, token: str | None):
    headers = {"User-Agent": "Murshid-Agronomy-Research/0.1"}
    if token and "api.data.mendeley.com" in url:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers)
    digest = hashlib.sha256()
    target.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(req, timeout=120) as response, target.open("wb") as output:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-id", required=True, help="Mendeley short ID, e.g. g684ghfxvg")
    parser.add_argument("--version", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    token = os.getenv("MENDELEY_ACCESS_TOKEN")
    base = f"https://api.data.mendeley.com/datasets/{args.dataset_id}/zip?version={args.version}"
    try:
        metadata = None
        for attempt in range(18):
            metadata, _ = request_json(base, token)
            status = str(metadata.get("status", "")).upper()
            if status in {"READY", "COMPLETED", "AVAILABLE"} and metadata.get("url"):
                break
            if status in {"FAILED", "ERROR"}:
                raise SystemExit(f"Mendeley archive preparation failed: {metadata}")
            if attempt == 17:
                raise SystemExit(f"Archive is not ready yet; try again later: {metadata}")
            time.sleep(10)

        download_url = metadata.get("url")
        if not download_url:
            download_endpoint = f"https://api.data.mendeley.com/datasets/{args.dataset_id}/zip/file_downloaded?version={args.version}"
            request = Request(download_endpoint, headers={"User-Agent": "Murshid-Agronomy-Research/0.1"})
            if token:
                request.add_header("Authorization", f"Bearer {token}")
            with urlopen(request, timeout=60) as response:
                download_url = response.geturl()

        actual_hash = download_stream(download_url, args.output, token)
        expected_hash = metadata.get("sha256_hash")
        if expected_hash and actual_hash.lower() != str(expected_hash).lower():
            args.output.unlink(missing_ok=True)
            raise SystemExit("Downloaded archive SHA-256 does not match Mendeley metadata; file removed.")
        print(json.dumps({
            "dataset_id": args.dataset_id,
            "version": args.version,
            "output": str(args.output),
            "sha256": actual_hash,
            "verified_against_source_hash": bool(expected_hash),
            "licence_and_attribution": "Check the dataset landing page and retain its CC BY attribution."
        }, indent=2))
    except HTTPError as exc:
        if exc.code in (401, 403):
            raise SystemExit(
                "Mendeley public API requires authorization in this environment. "
                "Download the archive from the official dataset page's Download All button; "
                "do not enter credentials into the app."
            )
        raise SystemExit(f"Mendeley download failed with HTTP {exc.code}.")
    except (URLError, TimeoutError) as exc:
        raise SystemExit(f"Could not reach Mendeley Data: {exc}")


if __name__ == "__main__":
    main()
