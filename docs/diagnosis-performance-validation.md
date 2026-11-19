# Agricultural diagnosis performance validation

The unified diagnosis flow remains on the detailed primary vision model, with the existing stable fallback retained for transient service failures.

## Changes in release 1.0.8

- Use a 64 x 64 exposure sample before touching full-resolution pixels.
- Skip full-resolution pixel reads and writes for normally lit photos to preserve natural symptom and insect colors.
- If the primary model returns a transient availability/rate-limit error, start the fallback immediately instead of repeating the same slow request first.
- Return `diagnosisDurationMs` and log duration, cache status, image count, and diagnosis mode for performance measurement.

## Acceptance checks before release

- TypeScript check and production build pass.
- Signed Android APK build completes and the update manifest remains inactive until the signed asset exists.
- Measure cold and cached requests separately.
- Compare image-preparation time on daylight and low-light photos.
- Validate diagnostic correctness on representative date-palm pests, vegetable/fruit symptoms, nutrient deficiencies, and beneficial insects.
- Do not trade confidence or safety for speed; unclear images must continue to request clarification rather than inventing a diagnosis.

No target accuracy or response-time claim should be published until it is measured on a representative, reviewed test set.
