#!/usr/bin/env python3
"""Extrae señales de tiempo/opacidad del Nodo AGS usando meta/manifest.json."""

from __future__ import annotations
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "meta" / "manifest.json"
OUTPUT_PATH = ROOT / "meta" / "ags_metrics.json"


@dataclass
class DocMetrics:
    doc_id: str
    source: str
    version: str
    first_published: str
    mihm_variable: str
    sf_pattern: str
    time_score: int
    opacity_score: int
    evidence: List[str]
    vhpd_status: str
    vhpd_notes: List[str]


def parse_front_matter(text: str) -> Dict[str, str]:
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    front = parts[1]
    data: Dict[str, str] = {}
    for raw in front.splitlines():
        if ":" not in raw:
            continue
        k, v = raw.split(":", 1)
        data[k.strip()] = v.strip().strip('"')
    return data


def tokenize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower())


def keyword_score(text: str, groups: Dict[str, List[str]]) -> int:
    score = 0
    for terms in groups.values():
        for term in terms:
            score += len(re.findall(re.escape(term.lower()), text))
    return score


def collect_evidence(text: str, terms: List[str], window: int) -> List[str]:
    snippets = []
    lower = text.lower()
    for term in terms:
        start = 0
        while True:
            idx = lower.find(term.lower(), start)
            if idx == -1:
                break
            a = max(0, idx - window // 2)
            b = min(len(text), idx + len(term) + window // 2)
            snippet = text[a:b].replace("\n", " ").strip()
            snippets.append(snippet)
            start = idx + len(term)
            if len(snippets) >= 5:
                return snippets
    return snippets


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    src_glob = manifest["source_glob"]
    base = ROOT
    files = sorted(base.glob(src_glob))

    time_groups = manifest["normalization"]["time_keywords"]
    opacity_groups = manifest["normalization"]["opacity_keywords"]
    required = set(manifest["vhpd_validation"]["required_fields"])
    window = int(manifest["vhpd_validation"].get("evidence_window", 180))
    target_version = manifest["normalization"].get("version_target")

    docs: List[DocMetrics] = []
    all_terms = [t for g in [*time_groups.values(), *opacity_groups.values()] for t in g]

    for path in files:
        text = path.read_text(encoding="utf-8")
        front = parse_front_matter(text)
        body = tokenize(text)

        missing = sorted(list(required - set(front.keys())))
        notes = []
        if missing:
            notes.append(f"Faltan campos requeridos: {', '.join(missing)}")
        if target_version and front.get("version") != target_version:
            notes.append(
                f"Versión fuera de objetivo ({front.get('version', 'N/A')} != {target_version})"
            )

        evidence = collect_evidence(text, all_terms, window)
        if not evidence:
            notes.append("Sin evidencia textual para variables de tiempo/opacidad")

        status = "ok" if not notes else "review"

        docs.append(
            DocMetrics(
                doc_id=front.get("doc_id", path.stem),
                source=str(path.relative_to(ROOT)),
                version=front.get("version", "N/A"),
                first_published=front.get("first_published", "N/A"),
                mihm_variable=front.get("mihm_variable", "N/A"),
                sf_pattern=front.get("sf_pattern", "N/A"),
                time_score=keyword_score(body, time_groups),
                opacity_score=keyword_score(body, opacity_groups),
                evidence=evidence,
                vhpd_status=status,
                vhpd_notes=notes,
            )
        )

    payload = {
        "node": manifest.get("node"),
        "manifest_version": manifest.get("manifest_version"),
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "documents": [d.__dict__ for d in docs],
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {OUTPUT_PATH.relative_to(ROOT)} with {len(docs)} documents")


if __name__ == "__main__":
    main()
