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

## Data acquisition policy

- Download archives from the original landing pages and retain the original archive unchanged.
- Place extracted, unmodified files under `ml/datasets/<dataset-id>/raw/<class-name>/`.
- Keep original and augmented/processed folders separate. Never include augmented copies in the held-out test set.
- Preserve a source manifest for every image: dataset DOI, original filename, class label, geography, crop/plant part, capture mode, licence, and whether the label is expert-confirmed or source-reported.
- Do not copy images into the application repository or publish them. Dataset archives remain local to the training workspace.
- Obtain Omani field photos with farm-owner consent and an agronomist-confirmed label. Do not scrape random image search results or assume image copyright permits AI training.

## Train

Python 3.11+ recommended. Install `pip install -r ml/requirements.txt`.

```bash
python ml/train_palm_leaf.py --data-root ml/datasets/g684ghfxvg/raw --output-dir ml/runs/palm-leaf-madinah --epochs 20
```

The input directory must have one directory per class. The script creates grouped train/validation/test splits, deduplicates exact and near-identical images, trains MobileNetV3-Small, writes per-class metrics and exports ONNX. It uses original file groups where the source filenames encode a shared frond/plant; it also clusters perceptual near-duplicates before splitting. Review the generated split manifest before accepting results.

## Evaluate and release gate

- Never report training accuracy as field accuracy.
- Report macro-F1, per-class precision/recall/F1, confusion matrix, class counts, and test coverage.
- Keep source/geography visible in reports. A Madinah/Iraq model is not an Oman-validated model.
- Require a separate Omani farm holdout collected from different farms/trees and reviewed by a plant-health specialist before enabling a class in production.
- Include an abstain/uncertain outcome. Low-quality, unsupported crop, unfamiliar disease, and low-margin predictions must ask for another image or human review.
- Keep image classification separate from severity estimation. Do not infer red-palm-weevil internal infestation from a normal RGB leaf photo.
- No pesticide or fertilizer dosage may be generated from the classifier output.

## Current status

Pipeline code is a research scaffold. No image archives have been downloaded into this repository, no model has been trained, and no ONNX model is approved for production. The existing app diagnosis path is unchanged.
