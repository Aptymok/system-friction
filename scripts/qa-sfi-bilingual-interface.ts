import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = (message: string): never => {
  console.error(`SFI language-boundary QA failed: ${message}`);
  process.exit(1);
};
const requireText = (haystack: string, needle: string, label: string) => {
  if (!haystack.includes(needle)) fail(`${label} is missing: ${needle}`);
};
const rejectText = (haystack: string, needle: string, label: string) => {
  if (haystack.includes(needle)) fail(`${label} must not contain: ${needle}`);
};

const provider = read('src/components/i18n/SfiLanguageProvider.tsx');
const layout = read('src/app/layout.tsx');
const entry = read('src/components/sfi/PublicEntryGateway.tsx');
const publicSceneManifest = read('src/components/sfi/publicSceneManifest.ts');
const session = read('src/components/sfi/SessionControls.tsx');
const consoleUi = read('src/components/sfi/SfiConsole.tsx');
const observatory = read('src/components/sfi/ObservatoryConsole.tsx');
const consent = read('src/components/analytics/SfiConsentBanner.tsx');
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };

// One language owner remains available for internal/private surfaces.
// Public human routes are a stricter English-only projection.
requireText(provider, "export type SfiLanguage = 'es' | 'en'", 'language contract');
requireText(provider, "const STORAGE_KEY = 'sfi-language'", 'persistent private language preference');
requireText(provider, 'document.documentElement.lang = language', 'document language synchronization');
requireText(provider, 'export function SfiUiText', 'owned-copy translation primitive');
requireText(provider, '// Every tuple is [Spanish, English].', 'catalog direction contract');
requireText(provider, 'const publicEnglishOnly = useMemo', 'public English-only route boundary');
requireText(provider, "const language: SfiLanguage = publicEnglishOnly ? 'en' : privateLanguage", 'public English language lock');
requireText(provider, 'if (publicEnglishOnly) return;', 'public language mutation block');
requireText(provider, '{!publicEnglishOnly ? <div', 'public language control suppression');
requireText(provider, "'/observatory'", 'Observatory public route lock');
requireText(provider, "'/publications'", 'Publications public route lock');
requireText(provider, "'/library'", 'Library public route lock');
requireText(provider, "'/institution'", 'Institute public route lock');
requireText(provider, "'/history'", 'History public route lock');
requireText(provider, "'/privacy'", 'Privacy public route lock');
requireText(provider, "'/login'", 'Login public route lock');
requireText(provider, "'/field'", 'FIELD public route lock');

if (provider.includes('MutationObserver')) fail('global MutationObserver translation must not be reintroduced');
if (provider.includes('localizeNode(document.body')) fail('document.body must never be rewritten by localization');
if (provider.includes('createTreeWalker')) fail('arbitrary rendered data must not be traversed for translation');
if (!provider.includes('It never walks or rewrites document.body')) fail('non-mutation boundary must remain explicit');

// Root public shell: English is the document contract; provider stays mounted so private descendants
// can retain the internal language owner without exposing a public switch.
requireText(layout, "import { SfiLanguageProvider }", 'root layout language provider import');
rejectText(layout, 'SfiUiText', 'root public layout');
requireText(layout, '<html lang="en">', 'root document English declaration');
requireText(layout, '<SfiLanguageProvider>', 'root layout provider mount');
requireText(layout, '</SfiLanguageProvider>', 'root layout provider boundary');
requireText(layout, 'PRIVACY & EXTERNAL AGENT DATA POLICY', 'English public privacy footer');
rejectText(layout, 'PRIVACIDAD', 'root public layout Spanish privacy copy');

// Public entry is intentionally English-only and must remain independent from runtime language choice.
rejectText(entry, 'useSfiLanguage', 'public entry');
requireText(entry, 'SYSTEM FRICTION INSTITUTE', 'public entry institution identity');
requireText(entry, 'MOVE BETWEEN SCENES', 'scene navigation instruction');
requireText(entry, 'CHANGE PERSPECTIVE', 'horizontal scene interaction');
requireText(entry, 'SHIFT DEPTH', 'pointer parallax interaction');
requireText(publicSceneManifest, "primaryHref:'/observatory'", 'public Observatory route');
requireText(publicSceneManifest, "secondaryHref:'/world-vector'", 'public World Vector route');
requireText(publicSceneManifest, "secondaryHref:'/institution'", 'public Institute route');
requireText(entry, 'href="/login"', 'public sign-in route');

// Public Observatory is hard English; underlying epistemic/data values are not translated.
rejectText(observatory, 'useSfiLanguage', 'public Observatory language hook');
requireText(observatory, "const language='en' as const", 'Observatory English lock');
requireText(observatory, "'LIVE WORLD OBSERVATORY'", 'Observatory English identity');
requireText(observatory, "'REFRESH'", 'Observatory refresh action');
requireText(observatory, "'FIELD READING'", 'Observatory field lens');
rejectText(observatory, 'ACTUALIZAR', 'Observatory Spanish refresh copy');
rejectText(observatory, 'OBSERVATORIO MUNDIAL EN VIVO', 'Observatory Spanish title');

// Public consent is hard English and may not expose the internal language switch.
rejectText(consent, 'useSfiLanguage', 'public privacy banner language hook');
requireText(consent, 'PRIVACY & MEASUREMENT', 'English privacy banner');
requireText(consent, 'REJECT', 'English privacy rejection action');
requireText(consent, 'ACCEPT', 'English privacy acceptance action');
rejectText(consent, 'RECHAZAR', 'public privacy banner Spanish rejection action');
rejectText(consent, 'ACEPTAR', 'public privacy banner Spanish acceptance action');

// Authenticated/internal surfaces may continue to consume the singular language owner.
requireText(session, 'useSfiLanguage', 'session controls language owner');
requireText(session, "text('INICIAR SESIÓN', 'SIGN IN')", 'internal/session bilingual copy');
requireText(consoleUi, 'translateUiText, useSfiLanguage', 'authenticated console translation owner');

// The internal lookup catalog is preserved for private surfaces; it does not authorize Spanish
// on the public projection.
const requiredPairs: Array<[string, string]> = [
  ['PRIVACIDAD Y POLÍTICA DE DATOS PARA AGENTES EXTERNOS', 'PRIVACY & EXTERNAL AGENT DATA POLICY'],
  ['OBSERVATORIO MUNDIAL EN VIVO', 'LIVE WORLD OBSERVATORY'],
  ['ORIGEN → AHORA', 'ORIGIN → NOW'],
  ['LECTURA DEL CAMPO', 'FIELD READING'],
  ['HIPÓTESIS', 'HYPOTHESES'],
  ['SESIÓN', 'SESSION'],
];
for (const [es, en] of requiredPairs) {
  const serialized = `['${es.replaceAll("'", "\\'")}', '${en.replaceAll("'", "\\'")}']`;
  requireText(provider, serialized, `ordered internal bilingual pair ${es} / ${en}`);
}

const build = pkg.scripts?.build ?? '';
const qa = pkg.scripts?.['qa:sfi-bilingual-interface'] ?? '';
if (!qa.includes('qa-sfi-bilingual-interface.ts')) fail('package script qa:sfi-bilingual-interface is not wired');
if (!build.includes('qa:sfi-bilingual-interface')) fail('language-boundary QA is not part of the canonical build');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-LANGUAGE-BOUNDARY-3.0',
  publicLanguage: 'en',
  publicLanguageSwitchVisible: false,
  internalBilingualOwnerRetained: true,
  arbitraryRenderedDataMutation: false,
}, null, 2));
