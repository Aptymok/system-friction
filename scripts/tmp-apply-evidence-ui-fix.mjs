import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, v) => fs.writeFileSync(p, v);
const replaceOnce = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error(`PATCH_ANCHOR_MISSING:${label}`);
  return source.replace(from, to);
};

// 1) Evidence policy: internal object validation is not external corroboration.
{
  const path = 'src/lib/sfi/evidenceRequirementResolver.ts';
  let s = read(path);
  const oldBlock = `  const hasSlaToken = /\\bsla\\b/.test(blob);\n  const explicit = explicitPolicy(context.webPolicy) ?? explicitPolicy(context.externalEvidencePolicy);\n  const privacyBlocksWeb = context.webForbidden === true || /confidential only|private only|sin internet|no internet|no web|offline only/.test(blob);\n  const dynamicExternal = /latest|current|actual|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard/.test(blob) || hasSlaToken;\n  const verificationRequested = context.requiresExternalVerification === true\n    || context.requiresCorroboration === true\n    || claims.length > 0\n    || /verify|verification|corrobor|cotej|confirm|validar|contrastar.*fuente|fuente.*extern/.test(blob);\n  const authoritySensitive = /law|legal|regulat|norma|standard|gobierno|government|autoridad|official|oficial/.test(blob) || hasSlaToken;\n  const strictlyInternal = ['dataset', 'csv', 'json', 'document', 'code', 'api_response'].includes(kind)\n    && /internal|interno|dataset|archivo|file|registros|tickets|mesa de ayuda|repository|repo/.test(blob)\n    && !dynamicExternal\n    && !verificationRequested;`;
  const newBlock = `  const hasSlaToken = /\\bsla\\b/.test(blob);\n  const explicit = explicitPolicy(context.webPolicy) ?? explicitPolicy(context.externalEvidencePolicy);\n  const privacyBlocksWeb = context.webForbidden === true || /confidential only|private only|sin internet|no internet|no web|offline only/.test(blob);\n  const internalObjectContext = ['dataset', 'csv', 'json', 'document', 'code', 'api_response'].includes(kind)\n    && /internal|interno|dataset|archivo|file|registros|tickets|mesa de ayuda|repository|repo|workbook|xlsx|csv/.test(blob);\n  const explicitExternalIntent = /latest|current|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|internet|web\\b/.test(blob);\n  const dynamicExternal = explicitExternalIntent || (hasSlaToken && !internalObjectContext);\n  const verificationRequested = context.requiresExternalVerification === true\n    || context.requiresCorroboration === true\n    || /corrobor|cotej|contrastar.*fuente|fuente.*extern|verificar.*fuente|verify.*source|confirm.*source|internet|web\\b/.test(blob);\n  const internalValidationRequested = /validar|validation|validate|verify|verification|confirm|calidad de datos|data quality|semantica|timestamp|integridad|consistencia/.test(blob)\n    && internalObjectContext\n    && !verificationRequested\n    && !dynamicExternal;\n  const authoritySensitive = /law|legal|regulat|norma|standard|gobierno|government|autoridad|official|oficial/.test(blob) || (hasSlaToken && !internalObjectContext);\n  const strictlyInternal = internalObjectContext\n    && !dynamicExternal\n    && !verificationRequested;`;
  s = replaceOnce(s, oldBlock, newBlock, 'evidence-policy-classification');
  s = replaceOnce(
    s,
    `  else if (verificationRequested || dynamicExternal) webPolicy = 'WEB_REQUIRED';`,
    `  else if (verificationRequested || dynamicExternal) webPolicy = 'WEB_REQUIRED';\n  else if (internalValidationRequested) webPolicy = 'WEB_NOT_REQUIRED';`,
    'evidence-policy-order',
  );
  write(path, s);
}

// 2) SFI console: selected language controls interface-owned labels and scene copy.
{
  const path = 'src/components/sfi/SfiConsole.tsx';
  let s = read(path);
  s = replaceOnce(s, `import { SessionControls } from './SessionControls';`, `import { SessionControls } from './SessionControls';\nimport { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';`, 'console-i18n-import');
  s = replaceOnce(s, ` const spec=SCENES[scene],auth=useAuthState();`, ` const spec=SCENES[scene],auth=useAuthState();\n const {language}=useSfiLanguage();\n const ui=(value:string)=>translateUiText(value,language);`, 'console-i18n-hook');
  s = s.replace(`<button className="menu" onClick={()=>setOpen(v=>!v)}>INDEX</button>`, `<button className="menu" onClick={()=>setOpen(v=>!v)}>{ui('ÍNDICE')}</button>`);
  s = s.replace(`<span className="liveDot">LIVE</span>`, `<span className="liveDot">{ui('EN VIVO')}</span>`);
  s = s.replace(`{SCENES[k].label}<small>{SCENES[k].title}</small>`, `{ui(SCENES[k].label)}<small>{ui(SCENES[k].title)}</small>`);
  s = s.replace(`<section className="caption"><span>{spec.label}</span><h1>{spec.title}</h1><p>{spec.subtitle}</p><div className="chips">{spec.markers.map(x=><b key={x}>{x}</b>)}</div></section>`, `<section className="caption"><span>{ui(spec.label)}</span><h1>{ui(spec.title)}</h1><p>{ui(spec.subtitle)}</p><div className="chips">{spec.markers.map(x=><b key={x}>{ui(x)}</b>)}</div></section>`);
  s = s.replace(`<small>FUENTE VIVA</small>`, `<small>{ui('FUENTE VIVA')}</small>`);
  s = s.replace(`<small>ESTADO</small>`, `<small>{ui('ESTADO')}</small>`);
  s = s.replace(`<small>AUTORIDAD</small>`, `<small>{ui('AUTORIDAD')}</small>`);
  s = s.replace(`<small>PROPOSICIONES</small>`, `<small>{ui('PROPOSICIONES')}</small>`);
  s = s.replace(`<strong>{live?.ok===false?'DEGRADED':live?'OBSERVADO':'CONECTANDO'}</strong>`, `<strong>{ui(live?.ok===false?'DEGRADADO':live?'OBSERVADO':'CONECTANDO')}</strong>`);
  s = s.replace(`const authorityLabel=viewerAuthority==='root'?'ROOT · AUTORIDAD SOBERANA':viewerAuthority==='controller'?'CONTROLLER · DECISIÓN DELEGADA':'SIN AUTORIDAD DE DECISIÓN';`, `const authorityLabel=ui(viewerAuthority==='root'?'ROOT · AUTORIDAD SOBERANA':viewerAuthority==='controller'?'CONTROLLER · DECISIÓN DELEGADA':'SIN AUTORIDAD DE DECISIÓN');`);
  s = s.replace(`<strong>{proposals.length} · {actionableProposals.length} por decidir · {postDecisionProposals.length} en curso · {resolvedProposals.length} resueltas</strong>`, `<strong>{ui(\`${'${proposals.length}'} · ${'${actionableProposals.length}'} por decidir · ${'${postDecisionProposals.length}'} en curso · ${'${resolvedProposals.length}'} resueltas\`)}</strong>`);
  s = s.replace(`<span>GOVERNANCE QUEUE · COGNITIVE TWIN / ACP</span>`, `<span>{ui('COLA DE GOBERNANZA · COGNITIVE TWIN / ACP')}</span>`);
  s = s.replace(`<b>{actionableProposals.length} por decidir · {postDecisionProposals.length} en ejecución/retorno</b>`, `<b>{ui(\`${'${actionableProposals.length}'} por decidir · ${'${postDecisionProposals.length}'} en ejecución/retorno\`)}</b>`);
  s = s.replace(`<p>Decidir no es canonizar. ROOT ve todo y conserva la promoción canónica exclusiva. Un controller sólo puede decidir propuestas operativas delegables. ACEPTAR es una sola decisión: SFI la envía directamente a la cola de ejecución y espera RETURN.</p>`, `<p>{ui('Decidir no es canonizar. ROOT ve todo y conserva la promoción canónica exclusiva. Un controller sólo puede decidir propuestas operativas delegables. ACEPTAR es una sola decisión: SFI la envía directamente a la cola de ejecución y espera RETURN.')}</p>`);
  write(path, s);
}

// 3) Observatory: localize SFI-owned navigation/HUD and generated narrative; source data remains untouched.
{
  const path = 'src/components/sfi/ObservatoryConsole.tsx';
  let s = read(path);
  s = replaceOnce(s, `import { SessionControls } from './SessionControls';`, `import { SessionControls } from './SessionControls';\nimport { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';`, 'observatory-i18n-import');
  s = s.replace(/function nodeNarrative\(node:WorldNode,neighbors:WorldNode\[\]\)\{[\s\S]*?\}\n\nasync function fetchJson/, `function nodeNarrative(node:WorldNode,neighbors:WorldNode[],language:'es'|'en'){\n  const r=node.reading||{};\n  const friction=num(r.systemic_friction),density=num(r.interaction_density),coherence=num(r.systemic_coherence),gradient=num(r.friction_gradient);\n  const tension=compact(r.tension),trajectory=compact(r.trajectory);\n  const systems=node.affectedSystems.slice(0,3).join(', ');\n  const parts:string[]=[];\n  if(language==='es'){\n    parts.push(\`Se observa ${'${node.title}'}.\`);\n    if(systems)parts.push(\`El evento toca ${'${systems}'}.\`);\n    if(friction!=null)parts.push(\`La fricción es ${'${frictionBand(friction)}'} (${'${friction.toFixed(3)}'})${'${density!=null?`; la densidad de interacción es ${density.toFixed(3)}`:\'\'}'}${'${gradient!=null?`; el gradiente es ${gradient.toFixed(3)}`:\'\'}'}${'${coherence!=null?`; la coherencia es ${coherence.toFixed(3)}`:\'\'}'}.\`);\n    if(tension)parts.push(\`La tensión se concentra en ${'${tension}'}.\`);\n    if(trajectory)parts.push(\`La trayectoria registrada apunta a ${'${trajectory}'}.\`);\n    if(neighbors.length)parts.push(\`Los nodos más próximos por estructura/campo son ${'${neighbors.slice(0,3).map(n=>n.title).join(\'; \')}'}.\`);\n  }else{\n    parts.push(\`Observed: ${'${node.title}'}.\`);\n    if(systems)parts.push(\`The event affects ${'${systems}'}.\`);\n    if(friction!=null)parts.push(\`Systemic friction is ${'${frictionBand(friction)}'} (${'${friction.toFixed(3)}'})${'${density!=null?`; interaction density is ${density.toFixed(3)}`:\'\'}'}${'${gradient!=null?`; gradient is ${gradient.toFixed(3)}`:\'\'}'}${'${coherence!=null?`; coherence is ${coherence.toFixed(3)}`:\'\'}'}.\`);\n    if(tension)parts.push(\`Tension concentrates in ${'${tension}'}.\`);\n    if(trajectory)parts.push(\`The recorded trajectory points to ${'${trajectory}'}.\`);\n    if(neighbors.length)parts.push(\`The nearest structural/field nodes are ${'${neighbors.slice(0,3).map(n=>n.title).join(\'; \')}'}.\`);\n  }\n  return parts.join(' ');\n}\n\nasync function fetchJson`);
  s = replaceOnce(s, `  const auth=useAuthState();`, `  const auth=useAuthState();\n  const {language,text:ownedText}=useSfiLanguage();\n  const ui=(value:string)=>translateUiText(value,language);`, 'observatory-i18n-hook');
  s = s.replace(/  const narrative=selected\?[\s\S]*?;\n  const hubs=/, `  const narrative=selected?nodeNarrative(selected,neighbors,language):nodes.length?ownedText(\`Se observan ${'${nodes.length}'} eventos georreferenciados. ${'${hypotheses.length}'} hipótesis están vinculadas al campo y ${'${outcomes.length}'} ya tienen contraste. Selecciona un nodo: aparecerán su vecindad, fricción e historia.\`,\`There are ${'${nodes.length}'} georeferenced observations. ${'${hypotheses.length}'} hypotheses are linked to the field and ${'${outcomes.length}'} already have contrast. Select a node to inspect its neighborhood, friction and history.\`):ownedText(\`La serie WorldSpect contiene ${'${frames.length}'} cortes históricos. Abre el satélite para la lectura diaria, las diez dimensiones, hipótesis y aprendizaje.\`,\`The WorldSpect series contains ${'${frames.length}'} historical snapshots. Open the satellite for the daily reading, ten dimensions, hypotheses and learning.\`);\n  const hubs=`);
  s = s.replace(`aria-label="Abrir observatorio del satélite"`, `aria-label={ui('Abrir observatorio del satélite')}`);
  s = s.replace(`alt="Satélite del observatorio SFI"`, `alt={ui('Satélite del observatorio SFI')}`);
  s = s.replace(`alt="Tierra observada por System Friction Institute"`, `alt={ui('Tierra observada por System Friction Institute')}`);
  s = s.replace(`<span>FIELD · SYSTEM FRICTION INSTITUTE</span><small>LIVE WORLD OBSERVATORY</small>`, `<span>{ui('FIELD · SYSTEM FRICTION INSTITUTE')}</span><small>{ui('OBSERVATORIO MUNDIAL EN VIVO')}</small>`);
  s = s.replace(`>{k==='time'?'TIME HISTORY':k.toUpperCase()}</button>`, `>{k==='time'?ui('HISTORIA TEMPORAL'):k==='tensions'?ownedText('TENSIONES','TENSIONS'):k==='evidence'?ownedText('EVIDENCIA','EVIDENCE'):k==='lab'?'LAB':k.toUpperCase()}</button>`);
  s = s.replace(`<Link href="/history">ORIGIN → NOW</Link>`, `<Link href="/history">{ui('ORIGEN → AHORA')}</Link>`);
  for (const literal of ['LECTURA MUNDIAL','NODOS','HIPÓTESIS','CONTRASTES','CICLOS ROOT','ABRIR SATÉLITE','HISTORIA','LECTURA DEL CAMPO','NODO ACTIVO','FRICCIÓN','VECINOS','PERSISTENCIA','HUBS VIVOS','LECTURA DIARIA','10 DIMENSIONES']) {
    s = s.split(`>${literal}<`).join(`>{ui('${literal}')}<`);
  }
  write(path, s);
}

// 4) ROOT workboard: translate owned headings only; operational payload remains verbatim.
{
  const path = 'src/components/sfi/RootOperationalWorkboard.tsx';
  let s = read(path);
  s = replaceOnce(s, `import { CognitiveSpineAnatomy, type CognitiveSpineFocus } from '@/components/root/cognitive-spine/CognitiveSpineAnatomy';`, `import { CognitiveSpineAnatomy, type CognitiveSpineFocus } from '@/components/root/cognitive-spine/CognitiveSpineAnatomy';\nimport { translateUiText, useSfiLanguage } from '@/components/i18n/SfiLanguageProvider';`, 'workboard-i18n-import');
  s = replaceOnce(s, `function Lane({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {\n  return <section className="workLane"><header><span>{title}</span>{typeof count === 'number' && <b>{count}</b>}</header><div className="workLaneBody">{children}</div></section>;\n}`, `function Lane({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {\n  const {language}=useSfiLanguage();\n  return <section className="workLane"><header><span>{translateUiText(title,language)}</span>{typeof count === 'number' && <b>{count}</b>}</header><div className="workLaneBody">{children}</div></section>;\n}`, 'workboard-lane');
  s = replaceOnce(s, `export function RootOperationalWorkboard({ enabled }: Props) {`, `export function RootOperationalWorkboard({ enabled }: Props) {\n  const {language}=useSfiLanguage();\n  const ui=(value:string)=>translateUiText(value,language);`, 'workboard-hook');
  s = s.replace(`<div><small>ROOT OPERATIONAL HOME</small><strong>TRABAJO QUE REQUIERE ATENCIÓN</strong></div>`, `<div><small>{ui('INICIO OPERATIVO ROOT')}</small><strong>{ui('TRABAJO QUE REQUIERE ATENCIÓN')}</strong></div>`);
  s = s.replace(` · SYSTEM HEALTH {systemHealth}`, ` · {ui('SALUD DEL SISTEMA')} {systemHealth}`);
  const summaryPairs = [['ROOT AHORA','ROOT AHORA'],['AUTO NEXT','SIGUIENTE AUTOMÁTICO'],['EJECUCIÓN','EJECUCIÓN'],['DEGRADED LANES','CARRILES DEGRADADOS'],['RETURNS','RETURNS'],['WARNINGS','ADVERTENCIAS']];
  for (const [oldValue,newValue] of summaryPairs) s = s.replace(`<small>${oldValue}</small>`, `<small>{ui('${newValue}')}</small>`);
  s = s.replace(`title="QUÉ SIGUE / NEXT EXPECTED EVENT"`, `title="QUÉ SIGUE / EVENTO ESPERADO"`);
  s = s.replace(`title="MIS DECISIONES / DELEGABLES"`, `title="MIS DECISIONES / DELEGABLES"`);
  s = s.replace(`title="EJECUCIONES / ASSIGNMENT"`, `title="EJECUCIONES / ASIGNACIÓN"`);
  s = s.replace(`title="PROJECTS / CASE EXECUTION"`, `title="PROYECTOS / EJECUCIÓN DE CASOS"`);
  s = s.replace(`title="TWIN / CICLOS ABIERTOS"`, `title="TWIN / CICLOS ABIERTOS"`);
  s = s.replace(`title="BLOQUEOS / WARNINGS"`, `title="BLOQUEOS / ADVERTENCIAS"`);
  s = s.replace(`title="REPORTES / DEGRADED LANES"`, `title="REPORTES / CARRILES DEGRADADOS"`);
  write(path, s);
}

// 5) Extend controlled catalog for scene markers and workboard headings.
{
  const path = 'src/components/i18n/SfiLanguageProvider.tsx';
  let s = read(path);
  const anchor = `  ['ROOT', 'ROOT'],\n];`;
  const additions = `  ['ROOT', 'ROOT'],\n  ['INICIO OPERATIVO ROOT', 'ROOT OPERATIONAL HOME'],\n  ['TRABAJO QUE REQUIERE ATENCIÓN', 'WORK REQUIRING ATTENTION'],\n  ['SALUD DEL SISTEMA', 'SYSTEM HEALTH'],\n  ['ROOT AHORA', 'ROOT NOW'],\n  ['SIGUIENTE AUTOMÁTICO', 'AUTO NEXT'],\n  ['CARRILES DEGRADADOS', 'DEGRADED LANES'],\n  ['RETURNS', 'RETURNS'],\n  ['ADVERTENCIAS', 'WARNINGS'],\n  ['QUÉ SIGUE / EVENTO ESPERADO', 'WHAT NEXT / EXPECTED EVENT'],\n  ['MIS DECISIONES / DELEGABLES', 'MY DECISIONS / DELEGABLE'],\n  ['EJECUCIONES / ASIGNACIÓN', 'EXECUTIONS / ASSIGNMENT'],\n  ['PROYECTOS / EJECUCIÓN DE CASOS', 'PROJECTS / CASE EXECUTION'],\n  ['TWIN / CICLOS ABIERTOS', 'TWIN / OPEN CYCLES'],\n  ['BLOQUEOS / ADVERTENCIAS', 'BLOCKERS / WARNINGS'],\n  ['REPORTES / CARRILES DEGRADADOS', 'REPORTS / DEGRADED LANES'],\n  ['observación', 'observation'],\n  ['persistencia', 'persistence'],\n  ['emergencia', 'emergence'],\n  ['frontera', 'boundary'],\n  ['intercambio', 'exchange'],\n  ['estado', 'state'],\n  ['fuente', 'source'],\n  ['índice', 'index'],\n  ['archivo', 'archive'],\n  ['síntesis', 'synthesis'],\n  ['hipótesis', 'hypothesis'],\n  ['instrumentos', 'instruments'],\n  ['umbrales', 'thresholds'],\n  ['rivales', 'rivals'],\n  ['reserva', 'reserve'],\n  ['memoria', 'memory'],\n  ['redundancia', 'redundancy'],\n  ['reversibilidad', 'reversibility'],\n  ['evidencia', 'evidence'],\n  ['autorización', 'authorization'],\n  ['retorno', 'return'],\n  ['recuperación', 'recovery'],\n  ['identidad', 'identity'],\n  ['herramienta', 'tool'],\n  ['consecuencia', 'consequence'],\n  ['humano', 'human'],\n  ['máquina', 'machine'],\n  ['sistema', 'system'],\n  ['contexto', 'context'],\n  ['capas', 'layers'],\n  ['atención', 'attention'],\n  ['salida', 'output'],\n  ['supervisión', 'oversight'],\n  ['traza', 'trace'],\n  ['delegación', 'delegation'],\n  ['canon', 'canon'],\n];`;
  s = replaceOnce(s, anchor, additions, 'provider-catalog-anchor');
  write(path, s);
}

// 6) QA: internal validation must not require web; truly external intent still must.
{
  const path = 'scripts/qa-sfi-web-source-extraction.ts';
  let s = read(path);
  const old = `const explicitSla = resolveUniversalEvidenceRequirements({\n  signal: { kind: 'dataset', name: 'mesa-ayuda.xlsx' },\n  question: 'Validar el SLA de atención con el estándar vigente',\n  objective: 'Contrastar cumplimiento del SLA',\n  context: {},\n});\nassert.equal(explicitSla.webPolicy, 'WEB_REQUIRED', 'SLA as a complete token must still trigger external verification');\nassert.equal(explicitSla.authoritySensitive, true, 'SLA as a complete token must remain authority-sensitive');`;
  const replacement = `const internalSla = resolveUniversalEvidenceRequirements({\n  signal: { kind: 'dataset', name: '2025_2026.xlsx' },\n  question: 'Validar calidad de datos, tiempos y SLA de Mesa de Ayuda usando el workbook interno',\n  objective: 'Identificar fricciones y qué definiciones internas faltan antes de medir SLA real',\n  context: { missingEvidence: ['Definición autoritativa interna de timestamps', 'Reglas internas de SLA'] },\n});\nassert.equal(internalSla.webPolicy, 'WEB_NOT_REQUIRED', 'internal dataset/SLA validation must not be converted into mandatory web corroboration');\nassert.equal(internalSla.authoritySensitive, false, 'internal SLA semantics require internal authority, not web authority');\nconst externalSla = resolveUniversalEvidenceRequirements({\n  signal: { kind: 'dataset', name: 'mesa-ayuda.xlsx' },\n  question: 'Comparar el SLA interno contra benchmarks públicos del sector y regulación vigente',\n  objective: 'Contrastar cumplimiento externo',\n  context: {},\n});\nassert.equal(externalSla.webPolicy, 'WEB_REQUIRED', 'explicit benchmark/regulatory intent must still require external verification');\nassert.equal(externalSla.authoritySensitive, true, 'regulatory external intent remains authority-sensitive');\nconst forcedWeb = resolveUniversalEvidenceRequirements({\n  signal: { kind: 'dataset', name: 'mesa-ayuda.xlsx' },\n  question: 'Validar el dataset interno',\n  objective: 'Validación interna',\n  context: { webPolicy: 'WEB_REQUIRED' },\n});\nassert.equal(forcedWeb.webPolicy, 'WEB_REQUIRED', 'explicit operator WEB_REQUIRED policy must remain authoritative');`;
  s = replaceOnce(s, old, replacement, 'web-qa-sla-policy');
  write(path, s);
}

// 7) QA: require real consumers while keeping the non-mutation boundary.
{
  const path = 'scripts/qa-sfi-bilingual-interface.ts';
  let s = read(path);
  s = replaceOnce(s, `const layout = read('src/app/layout.tsx');`, `const layout = read('src/app/layout.tsx');\nconst entry = read('src/components/sfi/PublicEntryGateway.tsx');\nconst session = read('src/components/sfi/SessionControls.tsx');\nconst consoleUi = read('src/components/sfi/SfiConsole.tsx');\nconst observatory = read('src/components/sfi/ObservatoryConsole.tsx');\nconst workboard = read('src/components/sfi/RootOperationalWorkboard.tsx');\nconst consent = read('src/components/analytics/SfiConsentBanner.tsx');`, 'bilingual-qa-consumers');
  const anchor = `requireText(layout, 'en="PRIVACY & EXTERNAL AGENT DATA POLICY"', 'English owned shell copy');`;
  const extra = `${anchor}\nrequireText(entry, 'useSfiLanguage', 'public entry must consume language context');\nrequireText(entry, "text('COMIENZA AQUÍ · SYSTEM FRICTION INSTITUTE'", 'public entry Spanish/English copy');\nrequireText(session, 'useSfiLanguage', 'session controls must consume language context');\nrequireText(consoleUi, 'translateUiText, useSfiLanguage', 'SFI console must translate owned copy explicitly');\nrequireText(observatory, 'translateUiText, useSfiLanguage', 'observatory must translate owned copy explicitly');\nrequireText(workboard, 'translateUiText, useSfiLanguage', 'ROOT workboard headings must translate explicitly');\nrequireText(consent, 'useSfiLanguage', 'privacy banner must consume language context');`;
  s = replaceOnce(s, anchor, extra, 'bilingual-qa-real-consumers');
  write(path, s);
}

console.log('SFI governed evidence/UI repair applied');
