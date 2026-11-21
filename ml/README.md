# Murshid vision training pipeline

This directory is an offline/free-first research pipeline for building a crop-specific image classifier. It is deliberately separate from the production Node service. No model is considered deployable until a held-out, locally relevant test set passes review.

## First image sources to acquire

1. **Date-palm leaf disorders — Madinah, Saudi Arabia**  
   Mendeley Data DOI: `10.17632/g684ghfxvg.2`  
   Landing page: https://data.mendeley.com/datasets/g684ghfxvg/2  
   The paper reports 608 original field images from 10 farms and 3,089 processed/augmented images across healthy leaves, potassium/manganese/magnesium deficiencies, black scorch, leaf spots, Fusarium wilt, rachis blight and Parlatoria scale. **Use only the 608 original images for primary evaluation/training**; do not mix the augmented derivatives into the same split. CC BY 4.0. The data are from Saudi Arabia, not Oman.
2. **Dubas-affected date-palm leaves — Karbala, Iraq**  
   Mendeley Data DOI: `10.17632/2nh364p2bc.2`  
   Landing page: https://data.mendeley.com/datasets/2nh364p2bc/2  
   Reports 3,000 drone images in four labels: healthy, bugs only, honeydew only, and mixed. CC BY 4.0. This is an Iraq dataset and a different image scale/task; train/evaluate it as a separate task, not as proof of Omani field performance.
3. **Red-palm-weevil tree status — Khairpur, Pakistan**  
   Figshare: https://figshare.com/articles/dataset/A_Dataset_of_Date_Palm_Trees_Thermal_and_RGB_Images_for_Pest_Management_/25974295  
   Reports 832 RGB/thermal images from 179 trees, with labels based partly on farmer feedback. Use as a separate tree-level research task only. Ordinary RGB leaf photos cannot rule out internal trunk infestation.


4. **Large-scale lemon leaf disorders — Bangladesh (2026)**  
   https://data.mendeley.com/datasets/8d9fv6kpt3/3 · DOI `10.17632/8d9fv6kpt3.3` · CC BY 4.0  
   Reports 17,586 original images across 18 classes, including healthy, diseases, pest-related and deficiency-related damage. Images were captured against a plain background. This is useful for citrus label coverage but will have a major background/domain gap versus Omani orchard photos.
5. **LemonLENS — Bangladesh (2025)**  
   https://data.mendeley.com/datasets/ccwh64fr2r/2 · DOI `10.17632/ccwh64fr2r.2` · CC BY 4.0  
   Reports 4,500 images across nine lemon-leaf classes.
6. **BDLemonLeaf — Bangladesh (2025)**  
   https://data.mendeley.com/datasets/643f5bbc2t/6 · DOI `10.17632/643f5bbc2t.6` · CC BY 4.0  
   Reports 3,431 images including healthy, disease, pest and deficiency labels.

Keep each source as a separate task until the label taxonomy, image provenance and near-duplicate relationships have been audited. These sources do not establish performance in Oman.

## Data acquisition policy

- Download archives from the original landing pages and retain the original archive unchanged.
- Place extracted, unmodified files under `ml/datasets/<dataset-id>/raw/<class-name>/`.
- Keep original and augmented/processed folders separate. Never include augmented copies in the held-out test set.
- Preserve a source manifest for every image: dataset DOI, original filename, class label, geography, crop/plant part, capture mode, licence, and whether the label is expert-confirmed or source-reported.
- Do not copy images into the application repository or publish them. Dataset archives remain local to the training workspace.
- Obtain Omani field photos with farm-owner consent and an agronomist-confirmed label. Do not scrape random image search results or assume image copyright permits AI training.

## Download public research archives

The downloader uses the official Mendeley Data public-dataset ZIP endpoint and verifies the SHA-256 hash when the source provides one. It does not commit images to Git.

```bash
python ml/download_mendeley_dataset.py --dataset-id g684ghfxvg --version 2 --output /tmp/date-palm-madinah-v2.zip
python ml/download_mendeley_dataset.py --dataset-id 2nh364p2bc --version 2 --output /tmp/dubas-karbala-v2.zip
```

If the public API requires authorization, download the same archive using **Download All** on the original Mendeley page. No token is required by the app and no credentials should be added to Render. Keep source archives outside the application repository and extract only the original/raw folders for training.

## Train

Python 3.11+ recommended. Install `pip install -r ml/requirements.txt`.

```bash
python -m unittest ml.test_quarantine -v
python ml/train_palm_leaf.py --data-root ml/datasets/g684ghfxvg/raw --output-dir ml/runs/palm-leaf-madinah --epochs 20 --quarantine-manifest ml/quarantine/saudi_date_palm_leaf_v2.json
```

The input directory must have one directory per class. Before any split is created, the script applies the fail-closed quarantine manifest and excludes every image not explicitly marked CLEARED_AFTER_REVIEW. The Saudi dataset manifest currently holds 24 cross-class visual-similarity candidates. The script then creates grouped train/validation/test splits, deduplicates exact and near-identical images, trains MobileNetV3-Small as a lightweight baseline, writes per-class metrics and exports ONNX. It is not the final high-capacity architecture; see `docs/MURSHID_VISION_ARCHITECTURE.md` for the selected multi-model roadmap. It uses original file groups where the source filenames encode a shared frond/plant; it also clusters perceptual near-duplicates before splitting. Review the generated split manifest before accepting results.

## Evaluate and release gate

- Never report training accuracy as field accuracy.
- Report macro-F1, per-class precision/recall/F1, confusion matrix, class counts, and test coverage.
- Keep source/geography visible in reports. A Madinah/Iraq model is not an Oman-validated model.
- Require a separate Omani farm holdout collected from different farms/trees and reviewed by a plant-health specialist before enabling a class in production.
- Include an abstain/uncertain outcome. Low-quality, unsupported crop, unfamiliar disease, and low-margin predictions must ask for another image or human review.
- Keep image classification separate from severity estimation. Do not infer red-palm-weevil internal infestation from a normal RGB leaf photo.
- No pesticide or fertilizer dosage may be generated from the classifier output.

## Current status

Pipeline code is a research scaffold. No image archives have been downloaded into this repository, no model has been trained, and no ONNX model is approved for production. MobileNetV3-Small is a baseline only; the production direction is a crop-specific classifier plus a separate pest detector and (later) symptom segmentation model. The existing app diagnosis path is unchanged.


## Description-only diagnosis
The existing diagnosis view also accepts a written symptom description without an image (minimum 20 characters). The server prompt explicitly forbids visual claims in this mode. This is still an AI-assisted differential assessment, not a trained local vision model or a lab diagnosis.


## Image quarantine

See [`quarantine/README_AR.md`](quarantine/README_AR.md) for the Arabic review and release procedure. The trainer reads `ml/quarantine/saudi_date_palm_leaf_v2.json` before loading/splitting images. If the manifest is missing or invalid, training stops; only the explicit status `CLEARED_AFTER_REVIEW` releases an image. The output directory includes `quarantine_summary.json` and `metrics.json` records the number excluded. Run `python -m unittest ml.test_quarantine -v` to test the quarantine rules.


## Iraq Dubas dataset (separate task)

See [Arabic dataset review guide](datasets/IRAQ_DUBAS_V2_AR.md). Use the dedicated quarantine manifest `ml/quarantine/iraq_dubas_v2.json` and a separate output directory/model head. The trainer excludes exact byte-identical copies in memory (without deleting originals) and fails closed if identical bytes carry conflicting class labels. Near-duplicate clusters are kept within one split; inspect cross-class candidates before considering this dataset ready for production.
