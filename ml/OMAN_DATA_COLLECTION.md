# Omani field image collection protocol

## Priority crops and cases
Start with date palm (Dubas signs, scale insects, leaf spots, nutrient symptoms, healthy), citrus (young and old leaf nutrient patterns, leaf miner, scale, canker-like symptoms, healthy), and nursery seedlings (damping-off/root damage, irrigation stress, salinity and fertilizer injury). Expand only after each first set is sufficiently represented.

## Required capture set per case
- One full-plant photo showing overall growth and affected extent.
- One close-up of the main symptom with a scale reference if useful.
- Leaf upper and lower surfaces; stem/crown/root-zone images where safe and relevant.
- A healthy comparison plant of the same crop and cultivar where possible.
- Several distances and natural lighting; avoid filters, sharpening, and screenshots.
- Capture original files, not images re-saved through messaging apps where possible.

## Metadata for every image/case
- Consent record and a random case ID; do not store farmer names, phone numbers, exact home coordinates, or faces in the ML dataset.
- Governorate/wilayat only unless more precise location is separately consented.
- Crop, cultivar if known, plant part, age/stage, date/season, indoor/outdoor/shade, irrigation source, recent fertilizer/pesticide history.
- Symptoms, onset/progression, extent and intensity.
- Expert-reviewed label, differential diagnoses, and evidence source (field inspection/lab test/visual-only).
- Label certainty: confirmed, probable, or unknown. Visual-only labels must not be treated as laboratory-confirmed.

## Quality and governance
- The farm owner must consent to collection and intended model-training use.
- A plant pathologist/agronomist should review labels, especially quarantine pests and high-impact disease claims.
- Keep all images from one farm/tree/case in a single split. Do not let near-duplicates cross train/validation/test.
- Hold out entire farms from Oman test evaluation.
- Retain original image and annotation provenance. Never use synthetic/AI-generated plant photos as ground-truth disease examples.
- Do not identify the farm or farmer in public reports.
- For possible regulated/quarantine pests, follow the current Oman official reporting and inspection pathway; the model must not declare an official diagnosis.
