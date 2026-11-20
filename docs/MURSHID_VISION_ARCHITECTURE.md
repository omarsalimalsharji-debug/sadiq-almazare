# Murshid vision architecture decision (ADR 001)

Status: **Accepted for research implementation; not yet trained or production-approved**  
Scope: independent, open-source computer vision for Omani crop health. No Gemini/Groq dependency in the final image-inference path.

## Decision

Do not force every visual task into one classifier. Build a small, testable ensemble with separate task heads:

1. **Leaf-condition classifier (primary first task):** benchmark ConvNeXt-Tiny against EfficientNetV2-S on crop-specific datasets. Keep MobileNetV3-Small as the low-compute/mobile baseline. Select the winner using farm-held-out macro-F1, per-class recall, calibration, latency and model size—not benchmark reputation.
2. **Visible pest detector (second task):** use an Apache-2.0 detector candidate such as RT-DETR/RT-DETRv2 or RF-DETR Small/Nano after checking the exact code, checkpoint and model-size licence. Train on bounding boxes for visible insects, colonies, mines, honeydew/sooty-mould evidence where labels support it. A leaf classifier cannot reliably localize tiny insects.
3. **Symptom segmentation (third task):** evaluate SegFormer or a compact U-Net-style model for lesion/necrosis/chlorosis masks only when pixel-level expert annotations exist. Use masks to estimate visible affected area; do not equate leaf area with whole-plant severity.
4. **Evidence retrieval:** retain source-linked reference cases and similar-image retrieval as a supporting explanation layer, never as proof of diagnosis.
5. **Decision fusion:** combine model outputs with crop, plant part, leaf age, symptom description and the existing agronomic differential rules. Add an explicit unknown/unsupported/poor-image outcome and abstain when evidence is weak or models disagree.

## Why this is stronger

- Classification answers “which visual pattern is most similar?”
- Detection answers “where is the insect or visible sign?”
- Segmentation answers “which pixels show the affected tissue?”
- Agronomic rules answer “what non-disease causes could mimic this pattern?”
- A final fusion layer can compare those independent signals without treating a single softmax score as a calibrated probability.

This is a more defensible architecture than a single general-purpose image classifier. It also allows each crop/task to be released only after its own validation.

## Open-source and licensing policy

- Prefer permissive Apache-2.0/BSD/MIT code and checkpoints for the closed-source app, subject to notices and third-party terms.
- Do not default to Ultralytics YOLO checkpoints or code: the upstream project is AGPL-3.0 unless a separate commercial licence is obtained. A technically strong model is not automatically a suitable product dependency.
- Verify the licence of **both implementation and exact pretrained weights**, plus datasets and export/runtime dependencies, before adoption. Never infer the weights' licence from the repository licence alone.
- Candidate references:
  - Hugging Face image-classification task/model architecture support: https://huggingface.co/docs/transformers/tasks/image_classification
  - RT-DETR official implementation: https://github.com/lyuwenyu/RT-DETR
  - RF-DETR official implementation and model-size/licence details: https://github.com/roboflow/rf-detr
  - Ultralytics repository licence: https://github.com/ultralytics/ultralytics
- This is an engineering screening decision, not legal advice. Recheck upstream licence files and model-card terms at the exact version used.

## Training plan

### Phase A — image classification
- Start with date-palm leaf disorders and citrus leaf/seedling disorders as separate datasets and separate label taxonomies.
- Benchmark ConvNeXt-Tiny, EfficientNetV2-S and MobileNetV3-Small on the same grouped splits and preprocessing.
- Preserve original images and source metadata; group by farm/tree/case and near-duplicate cluster before splitting.
- Keep each external geography as a separate domain report. Saudi/Iraq/Bangladesh datasets are transfer-learning sources, not Oman test evidence.
- Use class-balanced sampling or loss only after documenting class counts. Avoid aggressive augmentations that alter disease morphology.

### Phase B — visible pest detection
- Begin with date-palm Dubas and scale-insect examples only after confirming annotation quality and image scale.
- Annotate bounding boxes with two-pass review. Split by farm/tree/flight/source before training.
- Compare RT-DETRv2-R18/R34 and RF-DETR Nano/Small only after checking current checkpoint licensing, memory and inference latency.
- Report per-class precision/recall, mAP50-95, small-object recall, false positives per image and performance by camera distance.

### Phase C — symptom segmentation
- Collect expert-reviewed masks for a narrow set of symptoms (e.g. leaf spot/necrosis) before training.
- Report Dice/IoU and area-estimation error against human annotations.
- Do not claim causal diagnosis from a mask: segmentation detects appearance, not pathogen identity.

### Phase D — Oman validation and release
- Create a locked test set from farms/trees absent from training and validation.
- Include healthy plants, common lookalikes (salinity, heat, water stress, fertilizer injury, root problems), poor-quality images and unsupported classes.
- Have a plant pathologist/agronomist adjudicate high-impact labels. Keep suspected quarantine pests on an escalation-only pathway.
- Measure per-class precision, recall, macro-F1, confusion matrix, calibration/reliability, abstention coverage, latency and memory.
- Release one crop/task at a time only when the Oman holdout meets pre-agreed acceptance thresholds.
- Store model version, dataset manifest, preprocessing version and prediction audit metadata.

## Runtime design

The application should call a stable internal vision interface, independent of any cloud LLM provider:

`diagnoseImage(image, cropHint, context) -> { crop, findings[], boxes[], masks?, alternatives[], severity?, abstain, evidence, modelVersion }`

- Serve ONNX Runtime on the existing backend or a separately managed inference process only after measuring CPU/RAM and cold-start constraints. Do not add a paid service or new credential.
- Keep model files outside Git and outside ephemeral application storage; deploy model artifacts only through an explicitly approved, reproducible artifact path. Render's ephemeral filesystem must not be treated as durable model storage.
- Do not change the live diagnosis route until the local model has passed the release gate. During shadow evaluation, compare outputs without showing unvalidated predictions to farmers.
- Final image diagnosis must be able to run without Gemini/Groq. Text-only assistance can remain a separately controlled capability, but it must not be a hidden dependency for visual predictions.

## Current factual status

- Implemented: data catalogue, grouped/near-duplicate split scaffold, MobileNetV3-Small baseline trainer, ONNX export path, agronomic knowledge/rules, and description-only diagnosis UI/server handling.
- Not implemented: ConvNeXt/EfficientNet benchmark trainer, pest detector, segmentation model, downloaded archives, trained weights, Oman field dataset, model fusion, or local inference integration.
- No model accuracy is claimed. No production deployment is authorized by this document.
