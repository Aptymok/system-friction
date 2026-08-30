import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = (message: string): never => {
  console.error(`SFI bilingual interface QA failed: ${message}`);
  process.exit(1);
};
const requireText = (haystack: string, needle: string, label: string) => {
  if (!haystack.includes(needle)) fail(`${label} is missing: ${needle}`);
};

const provider = read('src/components/i18n/SfiLanguageProvider.tsx');
const layout = read('src/app/layout.tsx');
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

requireText(provider, "export type SfiLanguage = 'es' | 'en'", 'language contract');
requireText(provider, "const STORAGE_KEY = 'sfi-language'", 'persistent language preference');
requireText(provider, 'document.documentElement.lang = language', 'document language synchronization');
requireText(provider, 'MutationObserver', 'dynamic interface localization');
requireText(provider, "(['es', 'en'] as const)", 'ES/EN switch');
requireText(provider, 'data-sfi-no-translate="true"', 'canonical/no-translate escape hatch');
requireText(layout, "import { SfiLanguageProvider }", 'root layout provider import');
requireText(layout, '<SfiLanguageProvider>', 'root layout provider mount');
requireText(layout, '</SfiLanguageProvider>', 'root layout provider boundary');

const requiredPairs: Array<[string, string]> = [
  ['Campo de observación', 'Observation field'],
  ['FUENTE VIVA', 'LIVE SOURCE'],
  ['ESTADO', 'STATUS'],
  ['AUTORIDAD', 'AUTHORITY'],
  ['PROPOSICIONES', 'PROPOSALS'],
  ['LECTURA MUNDIAL', 'WORLD READING'],
  ['HIPÓTESIS', 'HYPOTHESES'],
  ['CONTRASTES', 'CONTRASTS'],
  ['LECTURA DEL CAMPO', 'FIELD READING'],
  ['PRIVACY & EXTERNAL AGENT DATA POLICY', 'PRIVACIDAD Y POLÍTICA DE DATOS PARA AGENTES EXTERNOS'],
];
for (const [es, en] of requiredPairs) {
  requireText(provider, `'${es.replaceAll("'", "\\'")}'`, `Spanish UI phrase ${es}`);
  requireText(provider, `'${en.replaceAll("'", "\\'")}'`, `English UI phrase ${en}`);
}

const build = pkg.scripts?.build ?? '';
const qa = pkg.scripts?.['qa:sfi-bilingual-interface'] ?? '';
if (!qa.includes('qa-sfi-bilingual-interface.ts')) fail('package script qa:sfi-bilingual-interface is not wired');
if (!build.includes('qa:sfi-bilingual-interface')) fail('bilingual QA is not part of the canonical build');

// Keep canonical institution identifiers stable across languages. These are names,
// not UI prose, and must not be redefined by the localization layer.
for (const canonical of ['ROOT', 'FIELD', 'RETURN', 'MIHM', 'Cognitive Twin', 'WSV', 'NTI']) {
  if (!provider.includes(canonical)) fail(`canonical identifier boundary is not represented: ${canonical}`);
}

console.log('SFI bilingual interface QA: OK');
