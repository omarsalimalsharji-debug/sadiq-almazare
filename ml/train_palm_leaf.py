#!/usr/bin/env python3
"""Train a conservative MobileNetV3-Small image classifier from curated folders.

Input: data-root/<class_name>/*.(jpg|jpeg|png|webp)
Only original images should be present. The script clusters perceptual duplicates
and source filename groups before splitting to reduce train/test leakage.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from collections import Counter
from pathlib import Path

import imagehash
import numpy as np
import torch
from PIL import Image, ImageFile
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from tqdm import tqdm

try:
    from quarantine import is_quarantined, load_quarantine_manifest
except ModuleNotFoundError:  # Support `python -m ml.train_palm_leaf` as well.
    from ml.quarantine import is_quarantined, load_quarantine_manifest

DEFAULT_QUARANTINE_MANIFEST = Path(__file__).resolve().parent / "quarantine" / "saudi_date_palm_leaf_v2.json"

ImageFile.LOAD_TRUNCATED_IMAGES = False
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SEED = 42


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def source_group(path: Path, root: Path) -> str:
    """Group filename siblings such as 2.1, 2.2 from the same frond."""
    rel = path.relative_to(root)
    stem = path.stem
    match = re.match(r"^(\d+)[._-]\d+", stem)
    group_stem = match.group(1) if match else stem
    return f"{rel.parent.as_posix()}::{group_stem}"


def load_records(root: Path, quarantine_manifest: Path = DEFAULT_QUARANTINE_MANIFEST):
    records = []
    quarantine_index = load_quarantine_manifest(quarantine_manifest)
    quarantined_count = 0
    classes = sorted(p.name for p in root.iterdir() if p.is_dir())
    if len(classes) < 2:
        raise SystemExit("Expected at least two class folders under --data-root")
    for label, class_name in enumerate(classes):
        for path in sorted((root / class_name).rglob("*")):
            if path.suffix.lower() not in EXTENSIONS:
                continue
            relative_path = path.relative_to(root).as_posix()
            if is_quarantined(relative_path, class_name, quarantine_index):
                print(f"QUARANTINE {relative_path}: HOLD_PENDING_REVIEW")
                quarantined_count += 1
                continue
            try:
                with Image.open(path) as im:
                    im.verify()
                with Image.open(path) as im:
                    phash = str(imagehash.phash(im.convert("RGB")))
                records.append({"path": path, "label": label, "class": class_name,
                                "group": source_group(path, root), "sha": sha256(path),
                                "phash": phash})
            except Exception as exc:
                print(f"SKIP unreadable image {path}: {exc}")
    if not records:
        raise SystemExit("No readable images found")
    print(f"Quarantine excluded images: {quarantined_count}")
    return classes, records, quarantined_count


def hamming(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


def merge_duplicate_groups(records, max_distance=4):
    """Union exact/near duplicates so they cannot leak across data splits."""
    parent = list(range(len(records)))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra
    # First group known source siblings (e.g. several views/crops from one frond).
    source_groups = {}
    for i, r in enumerate(records):
        source_groups.setdefault(r["group"], []).append(i)
    for indices in source_groups.values():
        for i in indices[1:]:
            union(indices[0], i)

    seen_sha = {}
    for i, r in enumerate(records):
        if r["sha"] in seen_sha:
            union(i, seen_sha[r["sha"]])
        else:
            seen_sha[r["sha"]] = i

    # Four perceptual-hash bands catch close duplicates even if one prefix differs.
    buckets = {}
    for i, r in enumerate(records):
        value = r["phash"]
        for band in range(4):
            key = (band, value[band * 4:(band + 1) * 4])
            for j in buckets.get(key, []):
                if hamming(value, records[j]["phash"]) <= max_distance:
                    union(i, j)
            buckets.setdefault(key, []).append(i)

    # Duplicate images from different classes/sources still share one split group.
    for i, r in enumerate(records):
        r["group"] = f"duplicate-cluster-{find(i)}"


def grouped_split(records):
    y = np.array([r["label"] for r in records])
    groups = np.array([r["group"] for r in records])
    group_counts = {
        label: len(set(groups[y == label]))
        for label in np.unique(y)
    }
    min_groups = min(group_counts.values())
    if min_groups < 3:
        raise SystemExit(
            "At least 3 independent source/duplicate groups per class are required; "
            f"observed group counts: {group_counts}"
        )
    folds = min(5, min_groups)
    # Grouped folds keep all views and near-duplicates from one source together.
    outer = StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=SEED)
    trainval_idx, test_idx = next(outer.split(np.zeros(len(y)), y, groups))
    y_tv, g_tv = y[trainval_idx], groups[trainval_idx]
    inner_group_counts = {
        label: len(set(g_tv[y_tv == label]))
        for label in np.unique(y_tv)
    }
    inner_folds = min(5, min(inner_group_counts.values()))
    if inner_folds < 2:
        raise SystemExit("Not enough independent groups left for a validation split.")
    inner = StratifiedGroupKFold(n_splits=inner_folds, shuffle=True, random_state=SEED + 1)
    train_rel, val_rel = next(inner.split(np.zeros(len(y_tv)), y_tv, g_tv))
    train_idx = trainval_idx[train_rel]
    val_idx = trainval_idx[val_rel]
    return train_idx.tolist(), val_idx.tolist(), test_idx.tolist()


class ImageRows(Dataset):
    def __init__(self, records, indices, transform):
        self.records, self.indices, self.transform = records, indices, transform
    def __len__(self):
        return len(self.indices)
    def __getitem__(self, item):
        r = self.records[self.indices[item]]
        with Image.open(r["path"]) as im:
            image = im.convert("RGB")
        return self.transform(image), r["label"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--learning-rate", type=float, default=0.0003)
    parser.add_argument("--quarantine-manifest", type=Path, default=DEFAULT_QUARANTINE_MANIFEST,
                        help="Fail-closed image quarantine JSON manifest")
    args = parser.parse_args()
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    if args.data_root.name.lower() != "raw":
        raise SystemExit("--data-root must point to a raw/ folder; augmented/processed images are not accepted.")
    forbidden = {"augmented", "processed", "analyzed", "validation", "test"}
    if any(part.lower() in forbidden for part in args.data_root.parts):
        raise SystemExit("Do not train from augmented/processed or evaluation folders.")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    classes, records, quarantined_count = load_records(args.data_root, args.quarantine_manifest)
    (args.output_dir / "quarantine_summary.json").write_text(json.dumps({
        "manifest": str(args.quarantine_manifest),
        "excluded_images": quarantined_count,
        "policy": "Only CLEARED_AFTER_REVIEW entries may enter any split."
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    merge_duplicate_groups(records)
    counts = Counter(r["label"] for r in records)
    if any(counts[i] < 5 for i in range(len(classes))):
        raise SystemExit("Each class needs at least 5 original images; collect more before training.")
    train_idx, val_idx, test_idx = grouped_split(records)
    for name, idx in [("train", train_idx), ("validation", val_idx), ("test", test_idx)]:
        split_counts = Counter(records[i]["label"] for i in idx)
        missing = [classes[c] for c in range(len(classes)) if split_counts[c] == 0]
        if missing:
            raise SystemExit(f"{name} split lacks classes {missing}; collect more independent groups or revise grouping.")

    split_manifest = []
    for split, indices in [("train", train_idx), ("validation", val_idx), ("test", test_idx)]:
        for i in indices:
            r = records[i]
            split_manifest.append({"split": split, "path": str(r["path"]), "class": r["class"],
                                   "sha256": r["sha"], "group": r["group"]})
    (args.output_dir / "split_manifest.json").write_text(json.dumps(split_manifest, indent=2), encoding="utf-8")
    (args.output_dir / "classes.json").write_text(json.dumps(classes, ensure_ascii=False, indent=2), encoding="utf-8")

    train_tf = transforms.Compose([
        transforms.Resize((args.image_size, args.image_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.08),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    eval_tf = transforms.Compose([
        transforms.Resize((args.image_size, args.image_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    device = "cuda" if torch.cuda.is_available() else "cpu"
    train_loader = DataLoader(ImageRows(records, train_idx, train_tf), batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(ImageRows(records, val_idx, eval_tf), batch_size=args.batch_size, shuffle=False, num_workers=2)
    test_loader = DataLoader(ImageRows(records, test_idx, eval_tf), batch_size=args.batch_size, shuffle=False, num_workers=2)

    weights = models.MobileNet_V3_Small_Weights.DEFAULT
    model = models.mobilenet_v3_small(weights=weights)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(classes))
    model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    criterion = nn.CrossEntropyLoss()
    best_f1, best_state, patience = -1.0, None, 5

    for epoch in range(args.epochs):
        model.train()
        running = 0.0
        for x, y in tqdm(train_loader, desc=f"epoch {epoch+1}/{args.epochs}"):
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running += loss.item() * len(y)
        model.eval(); val_true, val_pred = [], []
        with torch.no_grad():
            for x, y in val_loader:
                pred = model(x.to(device)).argmax(1).cpu().numpy().tolist()
                val_true.extend(y.numpy().tolist()); val_pred.extend(pred)
        val_f1 = f1_score(val_true, val_pred, average="macro", zero_division=0)
        print(f"epoch={epoch+1} train_loss={running/max(1,len(train_idx)):.4f} val_macro_f1={val_f1:.4f}")
        if val_f1 > best_f1:
            best_f1, best_state, patience = val_f1, {k:v.detach().cpu().clone() for k,v in model.state_dict().items()}, 5
        else:
            patience -= 1
            if patience == 0: break

    if best_state is None:
        raise SystemExit("Training did not produce a valid checkpoint.")
    model.load_state_dict(best_state); model.to(device).eval()
    y_true, y_pred, y_scores = [], [], []
    with torch.no_grad():
        for x, y in test_loader:
            logits = model(x.to(device))
            probs = torch.softmax(logits, dim=1).cpu().numpy()
            y_scores.extend(probs.tolist())
            y_pred.extend(probs.argmax(axis=1).tolist())
            y_true.extend(y.numpy().tolist())

    report = classification_report(y_true, y_pred, labels=list(range(len(classes))),
                                   target_names=classes, output_dict=True, zero_division=0)
    matrix = confusion_matrix(y_true, y_pred, labels=list(range(len(classes)))).tolist()
    metrics = {
        "model": "mobilenet_v3_small",
        "device": device,
        "classes": classes,
        "counts": {classes[i]: counts[i] for i in range(len(classes))},
        "quarantined_excluded": quarantined_count,
        "split_sizes": {"train":len(train_idx),"validation":len(val_idx),"test":len(test_idx)},
        "validation_macro_f1": best_f1,
        "test_macro_f1": f1_score(y_true, y_pred, average="macro", zero_division=0),
        "per_class": report,
        "confusion_matrix": matrix,
        "test_max_softmax_mean": float(np.mean(np.max(y_scores, axis=1))),
        "warning": "Softmax scores are not calibrated probabilities. Non-Oman test results are not Oman field accuracy."
    }
    (args.output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    torch.save({"state_dict": best_state, "classes": classes, "image_size": args.image_size}, args.output_dir / "model.pt")
    dummy = torch.randn(1, 3, args.image_size, args.image_size)
    model_cpu = model.to("cpu").eval()
    torch.onnx.export(model_cpu, dummy, args.output_dir / "model.onnx",
                      input_names=["image"], output_names=["logits"],
                      dynamic_axes={"image":{0:"batch"},"logits":{0:"batch"}},
                      opset_version=17)
    print(json.dumps({"output_dir":str(args.output_dir),"metrics":metrics}, indent=2))


if __name__ == "__main__":
    main()
