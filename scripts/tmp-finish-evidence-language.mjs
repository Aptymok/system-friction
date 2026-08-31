import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
function rep(s,a,b,label){if(!s.includes(a))throw new Error(`ANCHOR_MISSING:${label}`);return s.replace(a,b)}

// Evidence resolver: Spanish regulatory language remains external authority-sensitive.
{
  const p='src/lib/sfi/evidenceRequirementResolver.ts';
  let s=read(p);
  s=rep(s,
    `/latest|current|hoy|mercad|market|law|legal|regulat|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|internet|web\\b/.test(blob)`,
    `/latest|current|hoy|mercad|market|law|legal|regulat|regulacion|regulatorio|precio|price|compet|benchmark|trend|tendenc|public|social|release|lanzamiento|geopolit|world|mundo|extern|industry|sector|norma|standard|internet|web\\b/.test(blob)`,
    'external-intent-regulation');
  s=rep(s,
    `/law|legal|regulat|norma|standard|gobierno|government|autoridad|official|oficial/.test(blob)`,
    `/law|legal|regulat|regulacion|regulatorio|regulatory|norma|standard|gobierno|government|autoridad|official|oficial/.test(blob)`,
    'authority-regulation');
  write(p,s);
}

// Observatory: finish interface-owned bilingual copy; source/object payloads remain verbatim.
{
  const p='src/components/sfi/ObservatoryConsole.tsx';
  let s=read(p);
  s=rep(s,
    `const hubs:[SatelliteHub,string,string][]=[['daily','LECTURA DIARIA',\`WSV ${'${wsi==null?\'n/d\':wsi.toFixed(3)}'} · NTI ${'${nti==null?\'n/d\':nti.toFixed(3)}'}\`],['world10d','MUNDO · 10D',\`${'${frame?.vectors?.filter(v=>v.value!=null).length??vectors.length}'}/10 dimensiones con lectura\`],['hypotheses','HIPÓTESIS',\`${'${hypotheses.filter(h=>[\'OPEN\',\'AWAITING_OUTCOME\'].includes(String(h.status))).length}'} abiertas\`],['learning','APRENDIZAJE',\`${'${learning.length}'} eventos · ${'${outcomes.length}'} contrastes\`]];`,
    `const hubs:[SatelliteHub,string,string][]=[['daily',ownedText('LECTURA DIARIA','DAILY READING'),\`WSV ${'${wsi==null?\'n/d\':wsi.toFixed(3)}'} · NTI ${'${nti==null?\'n/d\':nti.toFixed(3)}'}\`],['world10d',ownedText('MUNDO · 10D','WORLD · 10D'),ownedText(\`${'${frame?.vectors?.filter(v=>v.value!=null).length??vectors.length}'}/10 dimensiones con lectura\`,\`${'${frame?.vectors?.filter(v=>v.value!=null).length??vectors.length}'}/10 dimensions observed\`)],['hypotheses',ownedText('HIPÓTESIS','HYPOTHESES'),ownedText(\`${'${hypotheses.filter(h=>[\'OPEN\',\'AWAITING_OUTCOME\'].includes(String(h.status))).length}'} abiertas\`,\`${'${hypotheses.filter(h=>[\'OPEN\',\'AWAITING_OUTCOME\'].includes(String(h.status))).length}'} open\`)],['learning',ownedText('APRENDIZAJE','LEARNING'),ownedText(\`${'${learning.length}'} eventos · ${'${outcomes.length}'} contrastes\`,\`${'${learning.length}'} events · ${'${outcomes.length}'} contrasts\`)]];`,
    'observatory-hubs');
  s=s.replace(`<dt>{ui('HISTORIA')}</dt><dd>{frames.length} cortes</dd>`,`<dt>{ui('HISTORIA')}</dt><dd>{frames.length} {ownedText('cortes','snapshots')}</dd>`);
  s=s.replace(`${'${auth.status===\'authenticated\'?`${tables.filter(t=>t?.ok).length} tablas críticas responden; ${degradedTables.length} presentan advertencias.`:\'La salud ROOT detallada requiere sesión institucional; la observación pública permanece activa.\'}'}`,
    `${'${auth.status===\'authenticated\'?ownedText(`${tables.filter(t=>t?.ok).length} tablas críticas responden; ${degradedTables.length} presentan advertencias.`,`${tables.filter(t=>t?.ok).length} critical tables respond; ${degradedTables.length} report warnings.`):ownedText(\'La salud ROOT detallada requiere sesión institucional; la observación pública permanece activa.\',\'Detailed ROOT health requires an institutional session; public observation remains active.\')}'}`);
  s=s.replace(`<small>SFI-OBS-01 · HUBS VIVOS</small>`,`<small>SFI-OBS-01 · {ownedText('HUBS VIVOS','LIVE HUBS')}</small>`);
  s=s.replace(`<><h2>{ui('LECTURA DIARIA')}</h2><p>{\`WSV ${'${wsi==null?\'n/d\':wsi.toFixed(3)}'} y NTI ${'${nti==null?\'n/d\':nti.toFixed(3)}'}. El campo contiene ${'${nodes.length}'} observaciones georreferenciadas, ${'${hypotheses.length}'} hipótesis y ${'${outcomes.length}'} contrastes.\`}</p></>`,
    `<><h2>{ui('LECTURA DIARIA')}</h2><p>{ownedText(\`WSV ${'${wsi==null?\'n/d\':wsi.toFixed(3)}'} y NTI ${'${nti==null?\'n/d\':nti.toFixed(3)}'}. El campo contiene ${'${nodes.length}'} observaciones georreferenciadas, ${'${hypotheses.length}'} hipótesis y ${'${outcomes.length}'} contrastes.\`,\`WSV ${'${wsi==null?\'n/d\':wsi.toFixed(3)}'} and NTI ${'${nti==null?\'n/d\':nti.toFixed(3)}'}. The field contains ${'${nodes.length}'} georeferenced observations, ${'${hypotheses.length}'} hypotheses and ${'${outcomes.length}'} contrasts.\`)}</p></>`);
  s=s.replace(`<h2>HIPÓTESIS ABIERTAS</h2>`,`<h2>{ownedText('HIPÓTESIS ABIERTAS','OPEN HYPOTHESES')}</h2>`);
  s=s.replace(`<h2>APRENDIZAJE / RETORNO</h2>`,`<h2>{ownedText('APRENDIZAJE / RETORNO','LEARNING / RETURN')}</h2>`);
  s=s.replace(`<small>TIME HISTORY · NODO</small>`,`<small>{ownedText('HISTORIA TEMPORAL · NODO','TIME HISTORY · NODE')}</small>`);
  write(p,s);
}

// ROOT workboard: translate interface instructions while preserving IDs/status payloads.
{
  const p='src/components/sfi/RootOperationalWorkboard.tsx';
  let s=read(p);
  s=rep(s,`const {language}=useSfiLanguage();\n  const ui=(value:string)=>translateUiText(value,language);`,`const {language,text:ownedText}=useSfiLanguage();\n  const ui=(value:string)=>translateUiText(value,language);`,'root-hook');
  s=s.replace(`if (!enabled) return <aside className="rootWorkboard"><div className="workboardLoading">WORKBOARD · esperando sesión / presencia gobernada</div></aside>;`,`if (!enabled) return <aside className="rootWorkboard"><div className="workboardLoading">{ownedText('PANEL DE TRABAJO · esperando sesión / presencia gobernada','WORKBOARD · waiting for session / governed presence')}</div></aside>;`);
  s=s.replace(`aria-label="ROOT operational workboard"`,`aria-label={ownedText('Panel operativo ROOT','ROOT operational workboard')}`);
  s=s.replace(`<p className="workboardError">DEGRADED · {error}</p>`,`<p className="workboardError">{ownedText('DEGRADADO','DEGRADED')} · {error}</p>`);
  s=s.replace(/<small>owner: \{short\(item\.owner\)\} · ROOT: \{item\.rootActionRequired \? 'ACCIÓN REQUERIDA' : 'ninguna'\}<\/small>/g,`<small>{ownedText('responsable','owner')}: {short(item.owner)} · ROOT: {item.rootActionRequired ? ownedText('ACCIÓN REQUERIDA','ACTION REQUIRED') : ownedText('ninguna','none')}</small>`);
  s=s.replace(/<small>BLOCKER · \{short\(([^)]*)\)\}<\/small>/g,`<small>{ownedText('BLOQUEO','BLOCKER')} · {short($1)}</small>`);
  s=s.replace(`>REVISAR EVIDENCIA →</a>`,`>{ownedText('REVISAR EVIDENCIA →','REVIEW EVIDENCE →')}</a>`);
  s=s.replace(`<em>Sin objetos no-terminales con transición pendiente.</em>`,`<em>{ownedText('Sin objetos no terminales con transición pendiente.','No non-terminal objects have a pending transition.')}</em>`);
  s=s.replace(`<em>Sin decisiones visibles para esta autoridad.</em>`,`<em>{ownedText('Sin decisiones visibles para esta autoridad.','No decisions are visible for this authority.')}</em>`);
  write(p,s);
}

// Main scene console: make governance controls/readable prose obey selected language.
{
  const p='src/components/sfi/SfiConsole.tsx';
  let s=read(p);
  s=rep(s,`const {language}=useSfiLanguage();\n const ui=(value:string)=>translateUiText(value,language);`,`const {language,text:ownedText}=useSfiLanguage();\n const ui=(value:string)=>translateUiText(value,language);`,'console-owned-text');
  s=s.replace(`>{presenceBusy?'CONFIRMANDO PRESENCIA…':rootPresenceReady?'PRESENCIA ACP ACTIVA · RENOVAR':'HACERME VISTO · CONFIRMAR PRESENCIA ACP'}</button>`,`>{presenceBusy?ownedText('CONFIRMANDO PRESENCIA…','CONFIRMING PRESENCE…'):rootPresenceReady?ownedText('PRESENCIA ACP ACTIVA · RENOVAR','ACP PRESENCE ACTIVE · RENEW'):ownedText('HACERME VISTO · CONFIRMAR PRESENCIA ACP','MARK ME SEEN · CONFIRM ACP PRESENCE')}</button>`);
  s=s.replace(`<span>DECISIÓN DELEGADA · PROMOCIÓN CANÓNICA BLOQUEADA</span>`,`<span>{ownedText('DECISIÓN DELEGADA · PROMOCIÓN CANÓNICA BLOQUEADA','DELEGATED DECISION · CANONICAL PROMOTION BLOCKED')}</span>`);
  s=s.replace(`>BITÁCORA</a>`,`>{ownedText('BITÁCORA','LOGBOOK')}</a>`);
  s=s.replace(`>COLA + REPORTES</a>`,`>{ownedText('COLA + REPORTES','QUEUE + REPORTS')}</a>`);
  s=s.replace(`<small>EN CURSO · EJECUCIÓN / RETURN</small>`,`<small>{ownedText('EN CURSO · EJECUCIÓN / RETURN','IN PROGRESS · EXECUTION / RETURN')}</small>`);
  s=s.replace(`<small>TRAZA RECIENTE · DECISIONES Y CIERRES</small>`,`<small>{ownedText('TRAZA RECIENTE · DECISIONES Y CIERRES','RECENT TRACE · DECISIONS AND CLOSURES')}</small>`);
  s=s.replace(`<em>No hay propuestas visibles para esta autoridad.</em>`,`<em>{ownedText('No hay propuestas visibles para esta autoridad.','No proposals are visible for this authority.')}</em>`);
  s=s.replace(`selectedResolved?'TRAZA DE GOBERNANZA':selectedPostDecision?'DECISIÓN YA TOMADA':'PROPUESTA DEL SISTEMA'`,`selectedResolved?ownedText('TRAZA DE GOBERNANZA','GOVERNANCE TRACE'):selectedPostDecision?ownedText('DECISIÓN YA TOMADA','DECISION ALREADY TAKEN'):ownedText('PROPUESTA DEL SISTEMA','SYSTEM PROPOSAL')`);
  s=s.replace(`selectedActionable?'Esta propuesta aún requiere decisión. Aceptar la envía directamente a ejecución; rechazar la cierra. Ninguna de las dos acciones la convierte en canon.':selectedState==='design_approved'?'Estado legacy: la decisión ya fue tomada antes del nuevo flujo. Sólo falta enviarla a ejecución una vez.':selectedState==='queued'?'La decisión ya terminó. No tienes otro paso administrativo: un ejecutor debe realizar el alcance autorizado y devolver RETURN/evidencia. No marques executed_at a mano.':'Esta propuesta ya tiene una decisión/cierre registrado. La promoción a canon, cuando aplique, sigue siendo exclusiva de ROOT.'`,
    `selectedActionable?ownedText('Esta propuesta aún requiere decisión. Aceptar la envía directamente a ejecución; rechazar la cierra. Ninguna de las dos acciones la convierte en canon.','This proposal still requires a decision. Accepting sends it directly to execution; rejecting closes it. Neither action makes it canon.'):selectedState==='design_approved'?ownedText('Estado legacy: la decisión ya fue tomada antes del nuevo flujo. Sólo falta enviarla a ejecución una vez.','Legacy state: the decision was already taken before the new flow. It only needs to be sent to execution once.'):selectedState==='queued'?ownedText('La decisión ya terminó. No tienes otro paso administrativo: un ejecutor debe realizar el alcance autorizado y devolver RETURN/evidencia. No marques executed_at a mano.','The decision is complete. There is no further administrative step: an executor must perform the authorized scope and return RETURN/evidence. Do not set executed_at manually.'):ownedText('Esta propuesta ya tiene una decisión/cierre registrado. La promoción a canon, cuando aplique, sigue siendo exclusiva de ROOT.','This proposal already has a recorded decision/closure. Canonical promotion, when applicable, remains exclusive to ROOT.')`);
  const labels=[['Estado','Status'],['Riesgo','Risk'],['Clase de decisión','Decision class'],['Decidida por','Decided by'],['Autoridad','Authority'],['Creada','Created'],['Ejecutada','Executed']];
  for(const [es,en] of labels)s=s.replace(`<dt>${es}</dt>`,`<dt>{ownedText('${es}','${en}')}</dt>`);
  const buttons=[['ACEPTAR · ENVIAR A EJECUCIÓN','ACCEPT · SEND TO EXECUTION'],['RECHAZAR','REJECT'],['PEDIR EVIDENCIA','REQUEST EVIDENCE'],['CANCELAR / CONGELAR','CANCEL / FREEZE'],['ENVIAR A EJECUCIÓN · LEGACY','SEND TO EXECUTION · LEGACY'],['DETENER / CONGELAR','STOP / FREEZE'],['CERRAR','CLOSE']];
  for(const [es,en] of buttons)s=s.replace(`>${es}</button>`,`>{ownedText('${es}','${en}')}</button>`);
  write(p,s);
}

console.log('final SFI evidence/language patch applied');
