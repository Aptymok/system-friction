#!/usr/bin/env python3
"""
generate_docs_json.py
Generates meta/docs.json automatically from front matter of _docs/ and _nodo_ags/ files.
Run: python3 generate_docs_json.py
"""
import os, json, re

def parse_front_matter(filepath):
    with open(filepath) as f:
        content = f.read()
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return None
    fm = {}
    current_key = None
    for line in match.group(1).splitlines():
        if line.startswith('  - '):
            if current_key:
                fm.setdefault(current_key, []).append(line.strip('  - ').strip())
        elif ':' in line:
            key, _, val = line.partition(':')
            key = key.strip()
            val = val.strip().strip('"')
            if val:
                fm[key] = val
                current_key = None
            else:
                fm[key] = []
                current_key = key
    return fm

docs = []
for folder, node in [('_docs', 'docs'), ('_nodo_ags', 'nodo-ags')]:
    for fname in sorted(os.listdir(folder)):
        if not fname.endswith('.md') or fname == 'index.md':
            continue
        fm = parse_front_matter(os.path.join(folder, fname))
        if fm and fm.get('doc_id'):
            docs.append({
                "id": fm['doc_id'],
                "title": fm.get('title', ''),
                "summary": fm.get('summary', ''),
                "node": node,
                "patterns": fm.get('patterns', [])
            })

with open('meta/docs.json', 'w', encoding='utf-8') as f:
    json.dump(docs, f, ensure_ascii=False, indent=2)

print(f"Generated meta/docs.json with {len(docs)} documents.")
