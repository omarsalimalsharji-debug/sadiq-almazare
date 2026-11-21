# Murshid reference library ingestion

This directory defines a **rights-aware, traceable ingestion layer** for agricultural books, technical guides, research papers and diagnostic photographs.

## Two separate collections

- `sources.json`: bibliographic and rights metadata for each source.
- `images.jsonl`: one JSON object per candidate image, linked to a source.

A text fact may be summarized with a page-level citation even when the source's figures cannot be reused. Public access is not permission to copy images or train a commercial model.

## Image review lifecycle

1. Register the source and record the exact licence/permission evidence.
2. Add candidate image metadata; do not place image binaries in Git.
3. Keep the original URL or archive reference, page/figure number, attribution and checksum.
4. A qualified reviewer verifies the crop, plant part, label and diagnostic identity.
5. Only records marked `approved` with `commercial_training_allowed: true` and an approved source licence may enter commercial training.
6. Keep `reference_only`, `permission_required`, `restricted` and `rejected` records out of training.
7. Split by `group_id` (plant/tree/source specimen), never by randomly splitting near-duplicate photographs.

## Offline archive audit

The archive auditor inventories ZIP/TAR image archives without extracting files or modifying the source archive. It records the archive and image SHA-256 hashes, original member paths, file sizes, exact duplicates, and (when Pillow is installed) image decode status and dimensions. Unsafe paths, encrypted files, oversized members and unsupported formats are skipped or reported. Folder names are only label candidates.

```bash
python ml/audit_image_archive.py /path/to/dataset.zip
python ml/audit_image_archive.py /path/to/dataset.tar.gz --output /path/to/audit-report.json
python -m pip install Pillow  # optional: image decoding and dimensions
```

The JSON report is an inventory, not an approved image manifest. Every candidate remains `pending` and `training_eligible: false`; no images are extracted, relabelled, added to `images.jsonl`, or sent to training. Review archive terms, image-level rights, attribution, specimen grouping and diagnostic labels separately.

## Commands

```bash
python ml/validate_reference_manifest.py --self-test
python ml/validate_reference_manifest.py
python ml/validate_reference_manifest.py --strict-training
```

The default command validates metadata integrity. `--strict-training` additionally fails if any candidate marked for training lacks approved rights, reviewer approval, a checksum, or a valid train/validation/test split.

## Required discipline

- Do not scrape or download entire books without checking access and reuse terms.
- OCR output is a transcription candidate, not a verified agronomic fact.
- Preserve page numbers and figure identifiers for every extracted claim.
- Keep country/region occurrence evidence separate from disease identity.
- Record negative and uncertain cases; do not force every image into a disease class.
- Never treat a model prediction as a confirmed diagnosis.


## Regional image datasets registered (2026-11-20)

Two date-palm image datasets have been registered with explicit CC BY 4.0 evidence:

| Source ID | Region | Dataset facts | Initial use decision |
|---|---|---|---|
| `saudi-date-palm-leaf-diseases-v2` | Madinah, Saudi Arabia | 608 raw images; 3,089 processed/cropped/augmented derivatives; healthy plus eight disorder classes | Candidate for expert review. Prefer raw originals for independent sampling; link every derivative to its parent specimen and keep them in the same split. |
| `iraq-dubas-date-palm-images-v2` | Karbala, Iraq | 3,000 images; healthy, bugs, honeydew and mixed categories; DSLR and drone imagery | Candidate for expert review. Preserve capture modality; do not interpret the four folders as a complete severity scale or species-level confirmation. |

Dataset records and licence evidence are in `sources.json`. Attribution and CC BY 4.0 conditions must be preserved in any redistribution or derived dataset. Rights approval does not equal agronomic label approval: all candidate images still require integrity checks, grouping, expert label review and local validation.

### Import and review sequence

1. Obtain the dataset archive from its cited repository and retain the original archive and version identifier.
2. Verify archive integrity and record a SHA-256 checksum before extraction.
3. Inventory file types, dimensions, corrupt files, exact duplicates and perceptual near-duplicates.
4. Preserve original class folder and file path as provenance; never silently rename or relabel.
5. For the Saudi dataset, separate the 608 raw originals from the 3,089 processed/augmented derivatives. Do not count derivatives as independent field observations.
6. For the Iraq dataset, preserve camera/modality metadata where available and keep aerial imagery distinct from close-up imagery during evaluation.
7. Assign plant/specimen/session `group_id` values before splitting. All related images and derivatives must stay in one split.
8. Place uncertain labels in a review queue; do not auto-promote them into training.
9. Keep a geographically independent Oman/GCC holdout for later evaluation. Foreign datasets alone cannot establish local diagnostic performance.

**Current execution status:** sources are registered, but archive files have not been downloaded or hashed, image-level labels have not been reviewed, and no model has been trained.
