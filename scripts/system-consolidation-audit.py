from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path('.')
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.md', '.json', '.yml', '.yaml'}
DB_IDENTIFIER = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
SURFACE_CONFIG = ROOT / 'config' / 'sfi-surfaces.json'
LEGACY_SCHEMA_CONFIG = ROOT / 'config' / 'sfi-legacy-live-schema.json'


def load_json(path: Path, fallback: dict) -> dict:
    try:
        value = json.loads(path.read_text())
        return value if isinstance(value, dict) else fallback
    except Exception:
        return fallback


SURFACES = load_json(SURFACE_CONFIG, {'public': [], 'rootOrgans': [], 'absorbedRoutes': {}})
CANONICAL_PAGES = {
    item.get('path') for item in SURFACES.get('public', []) if isinstance(item, dict) and isinstance(item.get('path'), str)
} | {item for item in SURFACES.get('rootOrgans', []) if isinstance(item, str)}
ABSORBED_ROUTES = SURFACES.get('absorbedRoutes', {}) if isinstance(SURFACES.get('absorbedRoutes'), dict) else {}
LEGACY_SCHEMA = load_json(LEGACY_SCHEMA_CONFIG, {'objects': []})
LEGACY_LIVE_OBJECTS = {item for item in LEGACY_SCHEMA.get('objects', []) if isinstance(item, str)}


def read_textfiles() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    for path in ROOT.rglob('*'):
        if not path.is_file() or '.git' in path.parts or 'node_modules' in path.parts:
            continue
        if path.suffix.lower() not in EXTENSIONS:
            continue
        try:
            text = path.read_text(errors='ignore')
        except Exception:
            continue
        files.append((path, text))
    return files


def classify_route(item: dict) -> tuple[str, str, str]:
    route = item['route']
    references = item['reference_count']
    if item['kind'] == 'PAGE':
        if route in ABSORBED_ROUTES:
            return 'ABSORB_DELETE_CANDIDATE', 'ABSORBED_ROUTE_STILL_PRESENT', f"Canonical owner: {ABSORBED_ROUTES[route]}"
        if route in CANONICAL_PAGES:
            return 'KEEP', 'CANONICAL_SURFACE', 'Explicit institutional surface owner'
        if route.startswith('/(auth)/'):
            return 'KEEP', 'AUTH_ENTRY', 'External entry point'
        if '[' in route:
            return 'REVIEW', 'DYNAMIC_ROUTE', 'May be constructed at runtime'
        if references == 0:
            return 'REVIEW', 'UNREFERENCED_PAGE', 'No literal inbound reference detected'
        return 'KEEP', 'REFERENCED_SURFACE', 'Has inbound code reference'
    if '[' in route:
        return 'REVIEW', 'DYNAMIC_ROUTE', 'Dynamic endpoint may be constructed at runtime'
    if '/webhooks/' in route:
        return 'KEEP', 'WEBHOOK', 'External caller expected'
    if '/cron/' in route or route.startswith('/api/cron-'):
        return 'KEEP', 'CRON', 'Scheduler caller expected'
    if references == 0:
        if item['lines'] <= 15:
            return 'DELETE_CANDIDATE', 'UNREFERENCED_THIN_API', 'No literal consumer and trivial implementation'
        return 'REVIEW', 'UNREFERENCED_API', 'Could be external/runtime-generated'
    return 'KEEP', 'REFERENCED_API', 'Has inbound code reference'


def table_constants(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for match in re.finditer(r"\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]", text):
        values[match.group(1)] = match.group(2)
    return values


def main() -> None:
    textfiles = read_textfiles()
    pages: list[dict] = []
    apis: list[dict] = []
    table_refs: dict[str, set[str]] = {}
    created_tables: set[str] = set()
    schema_refs: dict[str, set[str]] = {}

    for path, text in textfiles:
        source = path.as_posix()
        if source.startswith('src/app/') and path.name == 'page.tsx':
            route = '/' + path.parent.relative_to('src/app').as_posix()
            route = '/' if route == '/.' else route
            pages.append({'kind': 'PAGE', 'route': route, 'file': source, 'lines': text.count('\n') + 1})
        if source.startswith('src/app/api/') and path.name == 'route.ts':
            route = '/' + path.parent.relative_to('src/app').as_posix()
            apis.append({'kind': 'API', 'route': route, 'file': source, 'lines': text.count('\n') + 1})

        constants = table_constants(text)
        for match in re.finditer(r"\.from\(\s*['\"]([^'\"]+)['\"]\s*\)", text):
            table = match.group(1)
            prefix = text[max(0, match.start() - 80):match.start()]
            if '.storage' in prefix or not DB_IDENTIFIER.fullmatch(table):
                continue
            table_refs.setdefault(table, set()).add(source)
        for match in re.finditer(r"\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)", text):
            prefix = text[max(0, match.start() - 80):match.start()]
            if '.storage' in prefix:
                continue
            table = constants.get(match.group(1))
            if table and DB_IDENTIFIER.fullmatch(table):
                table_refs.setdefault(table, set()).add(source)

        if source.startswith('supabase/migrations/') and path.suffix == '.sql':
            for statement in re.split(r';', text):
                cleaned = re.sub(r'--.*?(?:\n|$)', ' ', statement)
                created = re.search(r'\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?[\"`]?([A-Za-z_][A-Za-z0-9_]*)', cleaned, re.I)
                if created:
                    created_tables.add(created.group(1))
                created_view = re.search(r'\bcreate\s+(?:or\s+replace\s+)?view\s+(?:public\.)?[\"`]?([A-Za-z_][A-Za-z0-9_]*)', cleaned, re.I)
                if created_view:
                    created_tables.add(created_view.group(1))
            for dependency in re.finditer(r'\breferences\s+(?:public\.)?[\"`]?([A-Za-z_][A-Za-z0-9_]*)', text, re.I):
                schema_refs.setdefault(dependency.group(1), set()).add(source)

    route_objects = pages + apis
    for item in route_objects:
        references: list[str] = []
        needle = item['route']
        if needle != '/':
            for path, text in textfiles:
                source = path.as_posix()
                if source == item['file']:
                    continue
                if needle in text:
                    references.append(source)
        item['references'] = sorted(set(references))
        item['reference_count'] = len(item['references'])

    matrix: list[dict] = []
    for item in route_objects:
        destination, reason, note = classify_route(item)
        matrix.append({**item, 'destination': destination, 'reason': reason, 'note': note})

    tables: list[dict] = []
    for table in sorted(set(table_refs) | created_tables | set(schema_refs) | LEGACY_LIVE_OBJECTS):
        references = sorted(table_refs.get(table, set()))
        schema_references = sorted(schema_refs.get(table, set()))
        has_migration = table in created_tables
        legacy_contract = table in LEGACY_LIVE_OBJECTS
        if references and has_migration:
            destination, reason = 'KEEP', 'CODE_AND_MIGRATION'
        elif references and legacy_contract:
            destination, reason = 'KEEP', 'CODE_AND_LIVE_SCHEMA_CONTRACT'
        elif references and not has_migration:
            destination, reason = 'RECONCILE', 'CODE_WITHOUT_TRACKED_CREATE'
        elif has_migration and schema_references:
            destination, reason = 'KEEP', 'SCHEMA_DEPENDENCY'
        elif has_migration:
            destination, reason = 'REVIEW_DELETE_OR_ABSORB', 'MIGRATION_WITHOUT_CODE_OR_SCHEMA_CONSUMER'
        elif legacy_contract:
            destination, reason = 'KEEP', 'LIVE_SCHEMA_CONTRACT'
        else:
            destination, reason = 'REVIEW', 'SCHEMA_REFERENCE_WITHOUT_TRACKED_CREATE'
        tables.append({
            'table': table,
            'reference_count': len(references),
            'references': references,
            'schema_reference_count': len(schema_references),
            'schema_references': schema_references,
            'has_migration': has_migration,
            'legacy_live_schema_contract': legacy_contract,
            'destination': destination,
            'reason': reason,
        })

    output = Path('artifacts/system-consolidation')
    output.mkdir(parents=True, exist_ok=True)
    counts = {
        'pages': len(pages),
        'apis': len(apis),
        'tables_union': len(tables),
        'page_delete_or_absorb_candidates': sum(1 for item in matrix if item['kind'] == 'PAGE' and 'CANDIDATE' in item['destination']),
        'api_delete_candidates': sum(1 for item in matrix if item['kind'] == 'API' and item['destination'] == 'DELETE_CANDIDATE'),
        'api_review': sum(1 for item in matrix if item['kind'] == 'API' and item['destination'] == 'REVIEW'),
        'tables_reconcile': sum(1 for item in tables if item['destination'] == 'RECONCILE'),
        'tables_review_delete_or_absorb': sum(1 for item in tables if item['destination'] == 'REVIEW_DELETE_OR_ABSORB'),
        'tables_kept_by_schema_dependency': sum(1 for item in tables if item['reason'] == 'SCHEMA_DEPENDENCY'),
        'legacy_live_schema_contracts': sum(1 for item in tables if item['legacy_live_schema_contract']),
    }
    (output / 'summary.json').write_text(json.dumps(counts, indent=2))
    (output / 'routes.json').write_text(json.dumps(matrix, indent=2))
    (output / 'tables.json').write_text(json.dumps(tables, indent=2))

    with (output / 'routes.csv').open('w', newline='') as handle:
        fields = ['kind', 'route', 'file', 'lines', 'reference_count', 'destination', 'reason', 'note']
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for item in matrix:
            writer.writerow({key: item.get(key, '') for key in fields})

    with (output / 'tables.csv').open('w', newline='') as handle:
        fields = ['table', 'reference_count', 'schema_reference_count', 'has_migration', 'legacy_live_schema_contract', 'destination', 'reason']
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for item in tables:
            writer.writerow({key: item.get(key, '') for key in fields})

    print(json.dumps(counts, indent=2))
    print('\nABSORBED ROUTES STILL PRESENT')
    for item in matrix:
        if item['reason'] == 'ABSORBED_ROUTE_STILL_PRESENT':
            print(item['route'], '->', ABSORBED_ROUTES.get(item['route']))
    print('\nTHIN UNREFERENCED API DELETE CANDIDATES')
    for item in matrix:
        if item['destination'] == 'DELETE_CANDIDATE':
            print(item['route'], item['file'], item['lines'])
    print('\nTABLES CODE WITHOUT TRACKED CREATE OR LIVE CONTRACT')
    for item in tables:
        if item['destination'] == 'RECONCILE':
            print(item['table'], item['reference_count'])
    print('\nTABLES CREATED BUT NO CODE OR SCHEMA CONSUMER')
    for item in tables:
        if item['destination'] == 'REVIEW_DELETE_OR_ABSORB':
            print(item['table'])


if __name__ == '__main__':
    main()
