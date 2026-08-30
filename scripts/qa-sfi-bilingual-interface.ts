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
requireText(provider, "(['es', 'en'] as const)", 'ES/EN switch');
requireText(provider, 'data-sfi-ui-copy="language-control"', 'interface-owned language control');
requireText(provider, "language === 'es' ? 'IDIOMA' : 'LANGUAGE'", 'visible bilingual control copy');
requireText(provider, '// Every tuple is [Spanish, English].', 'catalog direction contract');
requireText(layout, "import { SfiLanguageProvider }", 'root layout provider import');
requireText(layout, '<SfiLanguageProvider>', 'root layout provider mount');
requireText(layout, '</SfiLanguageProvider>', 'root layout provider boundary');

if (provider.includes('MutationObserver')) fail('global MutationObserver translation must not be reintroduced');
if (provider.includes('localizeNode(document.body')) fail('document.body must never be rewritten by localization');
if (provider.includes('createTreeWalker')) fail('arbitrary rendered data must not be traversed for translation');

const requiredPairs: Array<[string, string]> = [
  ['PRIVACIDAD Y POLÍTICA DE DATOS PARA AGENTES EXTERNOS', 'PRIVACY & EXTERNAL AGENT DATA POLICY'],
  ['OBSERVATORIO MUNDIAL EN VIVO', 'LIVE WORLD OBSERVATORY'],
  ['Campo de observación', 'Observation field'],
  ['SISTEMAS', 'SYSTEMS'],
  ['ARCHIVO', 'ARCHIVE'],
  ['FALSACIÓN', 'FALSIFICATION'],
  ['GOBERNANZA', 'GOVERNANCE'],
  ['FUENTE VIVA', 'LIVE SOURCE'],
  ['ESTADO', 'STATUS'],
  ['AUTORIDAD', 'AUTHORITY'],
  ['PROPOSICIONES', 'PROPOSALS'],
  ['ORIGEN → AHORA', 'ORIGIN → NOW'],
  ['HISTORIA TEMPORAL', 'TIME HISTORY'],
  ['LECTURA MUNDIAL', 'WORLD READING'],
  ['HIPÓTESIS', 'HYPOTHESES'],
  ['CONTRASTES', 'CONTRASTS'],
  ['LECTURA DEL CAMPO', 'FIELD READING'],
  ['ÍNDICE', 'INDEX'],
  ['SESIÓN', 'SESSION'],
];
for (const [es, en] of requiredPairs) {
  const serialized = `['${es.replaceAll("'", "\\'")}', '${en.replaceAll("'", "\\'")}']`;
  requireText(provider, serialized, `ordered bilingual pair ${es} / ${en}`);
}

const build = pkg.scripts?.build ?? '';
const qa = pkg.scripts?.['qa:sfi-bilingual-interface'] ?? '';
if (!qa.includes('qa-sfi-bilingual-interface.ts')) fail('package script qa:sfi-bilingual-interface is not wired');
if (!build.includes('qa:sfi-bilingual-interface')) fail('bilingual QA is not part of the canonical build');

for (const canonical of ['ROOT', 'FIELD', 'RETURN', 'MIHM', 'Cognitive Twin', 'WSV', 'NTI']) {
  if (!provider.includes(canonical)) fail(`canonical identifier boundary is not represented: ${canonical}`);
}

console.log('SFI bilingual interface QA: OK');
