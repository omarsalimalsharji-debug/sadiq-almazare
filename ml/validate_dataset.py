#!/usr/bin/env python3
"""Audit a class-folder image dataset before training; writes a source inventory."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from PIL import Image

EXTS={".jpg",".jpeg",".png",".webp"}
p=argparse.ArgumentParser()
p.add_argument("--data-root",required=True,type=Path)
p.add_argument("--output",required=True,type=Path)
a=p.parse_args()
rows=[]; seen={}
for folder in sorted(x for x in a.data_root.iterdir() if x.is_dir()):
    for f in sorted(folder.rglob("*")):
        if f.suffix.lower() not in EXTS: continue
        try:
            with Image.open(f) as im:
                im.verify()
            digest=hashlib.sha256(f.read_bytes()).hexdigest()
            rows.append({"path":str(f),"class":folder.name,"sha256":digest,"duplicate_of":seen.get(digest)})
            seen.setdefault(digest,str(f))
        except Exception as e:
            rows.append({"path":str(f),"class":folder.name,"error":str(e)})
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps({"image_count":sum("error" not in r for r in rows),"class_counts":dict(Counter(r["class"] for r in rows if "error" not in r)),"records":rows},indent=2),encoding="utf-8")
print(a.output)
