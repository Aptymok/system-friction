#!/usr/bin/env python3
"""
Validador VHpD (Vigilancia Humana por Diseño) - System Friction Framework v1.1
"""

import json
import re
from pathlib import Path

BASE = Path(__file__).parent.parent
REQUIRED_FRONTMATTER = {"layout", "title", "version", "status", "origin"}
errors = []
warnings = []

def check_json(path, required_keys):
    if not path.exists():
        errors.append(f"MISSING: {path}")
        return None
    with open(path) as f:
        data = json.load(f)
    for key in required_keys:
        if key not in data:
            errors.append(f"MISSING KEY '{key}' in {path.name}")
    return data

def check_markdown(path):
    content = path.read_text()
    if "<<<<<<< HEAD" in content:
        errors.append(f"MERGE CONFLICT in {path.name}")
    fm_match = re.match(r"^---\n(.+?)\n---", content, re.DOTALL)
    if not fm_match:
        errors.append(f"NO FRONTMATTER in {path.name}")
        return
    fm_text = fm_match.group(1)
    fm_keys = set(re.findall(r"^(\w+):", fm_text, re.MULTILINE))
    for key in REQUIRED_FRONTMATTER:
        if key not in fm_keys:
            errors.append(f"MISSING KEY '{key}' in {path.name}")
    vm = re.search(r"^version:\s*(.+?)\s*$", fm_text, re.MULTILINE)
    if vm and vm.group(1).strip("'\"") != "1.1":
        warnings.append(f"VERSION != 1.1 in {path.name}")

print("=" * 50)
print("VHpD Validator - System Friction v1.1")
print("=" * 50)
check_json(BASE / "_meta/manifest.json", ["schema", "version", "nodes"])
check_json(BASE / "_meta/ags_metrics.json", ["schema", "system", "nodes", "monte_carlo_scenarios"])

for md_file in BASE.rglob("*.md"):
    if ".git" not in str(md_file):
        check_markdown(md_file)

if errors:
    print(f"\n[ERRORS] {len(errors)}:")
    for e in errors: print(f"  ERROR: {e}")
else:
    print("\n[OK] Sin errores criticos.")

if warnings:
    print(f"\n[WARNINGS] {len(warnings)}:")
    for w in warnings: print(f"  WARN: {w}")

print(f"\nValidacion completa. Errores: {len(errors)} | Warnings: {len(warnings)}")
