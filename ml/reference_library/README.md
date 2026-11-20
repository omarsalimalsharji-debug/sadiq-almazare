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
