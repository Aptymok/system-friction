import fs from 'node:fs';
import path from 'node:path';

// Read-only projection. It never changes canonical requirements, receipts or statuses.
const ROOT = process.cwd();
const auditPath = path.join(ROOT, 'docs/audits/SFI-P01-P25-CIERRE-MEDIBLE-2026-11-15.md');
const OUTPUT = path.join(ROOT, 'artifacts/program-completion');
const SPANISH_SOURCE = path.join(ROOT, 'docs/audits/SFI-205-REQUISITOS-OBJETIVOS-ES-2026-11-15.md');
function loadSpanishMeanings() {
  if (!fs.existsSync(SPANISH_SOURCE)) return new Map();
  const lines=fs.readFileSync(SPANISH_SOURCE,'utf8').split('\n');
  const meanings=new Map();
  let id=null, meaning=null, original=null;
  const flush=()=>{if(id && meaning && original)meanings.set(id,{meaning,original});};
  for(const line of lines){
    const heading=line.match(/^### ((?:MASTER|WS|LEGACY154|ISSUE154|CTRL405)-[0-9-]+) — /);
    if(heading){flush();id=heading[1];meaning=null;original=null;continue;}
    if(!id)continue;
    if(line.startsWith('**Objetivo o significado contextual:** '))meaning=line.slice('**Objetivo o significado contextual:** '.length);
    if(line.startsWith('**Texto original extraído:** '))original=line.slice('**Texto original extraído:** '.length);
  }
  flush();return meanings;
}

const meanings = {
  P:'Programa institucional de la auditoría P01–P25', E:'Entregable verificable de un programa P', MASTER:'Criterio numerado de la definición de cierre del programa maestro',
  WS:'Workstream: frente operativo definido en docs/program/workstreams/', LEGACY154:'Requisito heredado del expediente GitHub #154 o del documento ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md',
  ISSUE154:'Requisito extraído del expediente GitHub #154', CTRL405:'Directiva institucional aceptada expresamente en comentarios de GitHub #405',
  SFI:'System Friction Institute', ROOT:'Órgano de gobierno e interfaz soberana SFI; no confundir con permisos de ejecución de terceros',
  CI:'Integración continua; conjunto de verificaciones automatizadas', QA:'Aseguramiento de calidad mediante pruebas verificables',
  RETURN:'Registro del resultado posterior a acción o predicción, con evidencia atribuible; no equivale a ejecutar un proceso',
  SATISFIED:'Requisito satisfecho mediante recibo independiente aceptado por el controlador',
  IN_PROGRESS:'Existe trayectoria activa, todavía no existe cierre acreditado',
  PARTIAL:'Hay indicios de implementación, insuficientes para cierre acreditado',
  MISSING:'No se hallaron indicios de implementación según el clasificador; no demuestra inexistencia',
  EXTERNAL_ACTION:'La comprobación requiere intervención o evidencia externa real',
  SUPERSEDED_BY_AUTHORIZED_DECISION:'Requisito sustituido mediante una decisión de autoridad registrada',
  UNCLASSIFIED:'Requisito sin estado válido; problema de integridad',
  INVALID:'Recibo rechazado, no confiere avance',
  RETURN_PASS:'Resultado de verificación admitido con referencia de evidencia',
  DOI:'Identificador digital persistente de objetos científicos',
  ORCID:'Identificador persistente de investigadores',
  ROR:'Registro de identificadores de organizaciones de investigación',
  MCP:'Model Context Protocol; interfaz de recursos o herramientas para clientes',
  OAuth:'Estándar para concesión de acceso limitado',
  MIHM:'Modelo de Interacción Homeostática Multinodal',
  T0:'Momento de cierre anticipado de una predicción o preregistro',
  UDR:'Métrica de recuperación no marcada (sin usar el nombre SFI)',
  EIC:'Métrica de coherencia de identidad de entidad',
  IRD:'Métrica de disponibilidad del registro/índice de recuperación',
  ACR:'Familia de métricas de recuperación por agentes o sistemas de IA',
  ECR:'Familia de métricas de colisión o confusión de identidad',
  MPD:'Métrica de propagación o distribución de proyecciones públicas',
  ERR:'Métrica de reconstrucción externa',
  IHG:'Índice histórico utilizado por SFI; su fórmula/versión requiere evidencia propia',
  JSON:'Formato estructurado de intercambio de datos', JSONLD:'Datos estructurados enlazados para buscadores',
  RLS:'Row-Level Security: controles de acceso por fila en base de datos',
  SHA:'Identificador de contenido de un commit o archivo',
  HEAD:'Revisión actual utilizada para ejecutar el controlador',
  SFI08:'Frente de aseguramiento independiente WS-08',
};

const WS_PROGRAMS = {
  'SFI-00':['P09','P24','P25'],
  'SFI-01':['P03','P08','P20','P25'],
  'SFI-02':['P05','P06','P08','P17'],
  'SFI-03':['P13','P16','P18','P23'],
  'SFI-04':['P09','P20','P24'],
  'SFI-05':['P07','P10','P11','P14','P15'],
  'SFI-06':['P09','P17'],
  'SFI-07':['P11','P13','P15','P16'],
  'SFI-08':['P02','P19','P24','P25'],
};
const MASTER_PROGRAMS = {
  1:['P05','P17'],2:['P03','P20'],3:['P03','P20'],4:['P03','P24'],
  5:['P08','P25'],6:['P08','P25'],7:['P07','P18'],8:['P01','P21'],
  9:['P06','P17'],10:['P09','P24'],11:['P05','P24'],12:['P07','P18'],
  13:['P01','P21'],14:['P10','P13'],15:['P13','P16'],16:['P09','P20'],
  17:['P09','P24'],18:['P10','P14'],19:['P13','P16'],20:['P13','P16'],
  21:['P05','P17'],22:['P09','P17'],23:['P11','P12'],24:['P24','P25'],
};
function proposedLinks(r) {
  if (/^MASTER-\d{2}$/.test(r.id)) return MASTER_PROGRAMS[Number(r.id.slice(7))] ?? [];
  return WS_PROGRAMS[r.owner] ?? [];
}
function sourceLocation(r, repo) {
  const s = String(r.source || '');
  if (s.includes('issue #405')) return 'https://github.com/' + repo + '/issues/405';
  if (s.includes('issue #154')) return 'https://github.com/' + repo + '/issues/154';
  const p = s.split('#')[0];
  return p.startsWith('docs/') ? 'https://github.com/' + repo + '/blob/' + (r.head || 'main') + '/' + p : s;
}
function readChecklist() {
  if (!fs.existsSync(auditPath)) return {rows:[],issue:'CHECKLIST_FILE_NOT_FOUND'};
  const src=fs.readFileSync(auditPath,'utf8');
  const lines=src.split('\n');
  const rows=[];let current=null;
  for (const line of lines) {
    const header=line.match(/^## (P\d{2}) · (.+?) — (\d+)% acreditado$/);
    if(header){if(current)rows.push(current);current={id:header[1],name:header[2],declaredPercent:Number(header[3]),deliverables:[],goal:null};continue;}
    if(!current)continue;
    const goal=line.match(/^\*\*100% declarado:\*\* (.+)$/);
    if(goal)current.goal=goal[1];
    const deliverable=line.match(/^- \[([ x])\] \*\*(\d+)% · (E\d):\*\* (.+)$/);
    if(deliverable)current.deliverables.push({id:deliverable[3],checklistChecked:deliverable[1]==='x',description:deliverable[4]});
  }
  if(current)rows.push(current);
  return {rows,issue:rows.length===25 && rows.every(r=>r.deliverables.length===4)?null:'CHECKLIST_SHAPE_INVALID'};
}
function escapeMd(value){return String(value??'').replace(/\|/g,'\\|').replace(/\n/g,' ');}
export function buildTransparency(report) {
  if(!Array.isArray(report.requirements))throw Error('REQUIREMENT_ARRAY_MISSING');
  const checklist=readChecklist();
  const spanish=loadSpanishMeanings();
  const items=report.requirements.map((r)=>{
    const proposals=proposedLinks(r);
    const translation=spanish.get(r.id);
    const translationCurrent=translation?.original===String(r.requirement).trim();
    const receipt=r.completionReceipt ?? {state:'NOT_EVALUATED',error:null};
    return {
      id:r.id, objectiveLiteral:r.requirement,
      objectiveMeaningES:translationCurrent?translation.meaning:null,
      spanishMeaningStatus:translationCurrent?'PROPOSED_TRANSLATION_SOURCE_MATCH':'SOURCE_CHANGED_OR_NOT_TRANSLATED',
      source:r.source,
      sourceUrl:sourceLocation({...r,head:report.head},report.repository),
      canonicalOwner:r.owner, ownerMeaning:'Responsable del frente ' + (r.owner || 'desconocido'),
      class:r.class, classification:r.status,
      completionReceiptState:receipt.state, completionReceiptError:receipt.error,
      evidence:Array.isArray(r.evidence)?r.evidence:[],
      nextAction:r.nextAction ?? null, returnCondition:r.returnCondition ?? null,
      trajectoryRef:r.trajectoryRef ?? null,
      candidatePrograms:proposals,
      programLinkAuthority: 'CANDIDATE_NOT_VERIFIED',
      unambiguousGoal:typeof r.requirement==='string' && r.requirement.trim().length>0,
    };
  });
  if(new Set(items.map(r=>r.id)).size!==items.length)throw Error('DUPLICATE_REQUIREMENT_ID');
  const candidateIndex={};
  for(const p of checklist.rows){
    const matches=items.filter(r=>r.candidatePrograms.includes(p.id));
    const satisfied=matches.filter(r=>r.classification==='SATISFIED').length;
    candidateIndex[p.id]={
      goal:p.goal,deliverables:p.deliverables,declaredChecklistPercent:p.deliverables.filter(e=>e.checklistChecked).length*25,
      candidateRequirementCount:matches.length,candidateSatisfiedCount:satisfied,
      candidateRequirementCoveragePercent:matches.length?Number((100*satisfied/matches.length).toFixed(2)):null,
      certificationPercent:null,
      certificationReason:'Los vínculos entre requisitos y programas son candidatos, no relaciones de autoridad validadas; no derivar cierre P del cociente.',
    };
  }
  const unknown=items.filter(r=>r.candidatePrograms.length===0);
  const json={contract:'SFI-REQUIREMENT-TRANSPARENCY-1.0',generatedAt:new Date().toISOString(),
    head:report.head,repository:report.repository,requirementCount:items.length,expectedPreviousCount:205,
    countDrift:items.length!==205, terms:meanings,
    sourceContract:report.contract,receiptState:report.completionReceiptState ?? null,
    mappingAuthority:'CANDIDATE_NOT_VERIFIED',unmappedRequirementIds:unknown.map(r=>r.id),
    programIndex:candidateIndex,requirements:items,
    constraints:['The original literal objective is authoritative; paraphrases are not replacements.','No receipt is promoted in this projection.','Candidate links are not certified causal ownership.','Checklist progress is independent from verified canonical receipt coverage.']};
  const md=[
    '# SFI — Los requisitos del controlador, explicados uno por uno',
    '', '**Corte:** ' + json.generatedAt,
    '**Revisión:** ' + report.head,
    '**Cantidad observada:** ' + items.length,
    '**Valor de referencia anterior:** 205. ' + (json.countDrift?'Hay variación: investigar la fuente antes de explicar la diferencia.':'Coincide con el último corte de 205.'),
    '',
    'La frase de **Objetivo literal** se conserva exactamente como figura en el requisito canónico. La traducción, si se incorpora, nunca podrá sustituirla. Los vínculos Pxx son candidaturas de clasificación, no mapeo certificado. Las pruebas y recibos proceden del controlador existente y no se recalifican aquí.',
    '',
    '## Glosario de nomenclatura',...Object.entries(meanings).map(([key,value])=>'- **'+key+'**: '+value),
    '', '## Programas P01–P25: condición final y cobertura',
    ...Object.entries(candidateIndex).flatMap(([key,v])=>[
      '### '+key+' — checklist '+v.declaredChecklistPercent+'%; cobertura de requisitos candidatos '+(v.candidateRequirementCoveragePercent===null?'NO_CALCULABLE':v.candidateRequirementCoveragePercent+'%')+' (no certificación)',
      '**100% declarado:** '+v.goal,
      '**Requisitos candidatos:** '+v.candidateRequirementCount+'; recibos SATISFIED: '+v.candidateSatisfiedCount+'. **% de cierre institucional certificado:** NO_CALCULABLE sin mapeo validado.',
      ...v.deliverables.map(d=>'- '+(d.checklistChecked?'[x] ':'[ ] ')+d.id+': '+d.description),''
    ]),
    '## Catálogo exhaustivo de requisitos',
    ...items.flatMap(r=>[
      '### '+r.id+' — '+r.classification,
      '**Identificador:** '+r.id+'. **Tipo:** '+r.class+'. **Responsable:** '+r.canonicalOwner+'.',
      '**Significado operativo en español:** '+(r.objectiveMeaningES||'REQUIERE_REVISIÓN: fuente nueva, cambiada o sin traducción.'),
      '**Objetivo literal (de la fuente):** '+r.objectiveLiteral,
      '**Integridad de traducción:** '+r.spanishMeaningStatus,
      '**Fuente verificable:** '+r.source+' — '+r.sourceUrl,
      '**Programas propuestos, NO certificados:** '+(r.candidatePrograms.join(', ')||'SIN_ASIGNAR'),
      '**Recibo:** '+r.completionReceiptState+(r.completionReceiptError?' — '+r.completionReceiptError:''),
      '**Qué falta o qué mantener:** '+(r.nextAction||'NO_DETERMINADO'),
      '**Condición de retorno:** '+(r.returnCondition||'NO_DETERMINADA'),
      '**Trayectoria / expediente:** '+(r.trajectoryRef||'NO_REGISTRADO'),
      '**Referencias técnicas:** '+(r.evidence.join('; ')||'SIN_REFERENCIAS_REGISTRADAS'),
      ''
    ]),
    '## Integridad del catálogo',
    '- Traducciones cotejadas contra fuente literal: '+items.filter(x=>x.spanishMeaningStatus==='PROPOSED_TRANSLATION_SOURCE_MATCH').length,
    '- Traducciones ausentes o desactualizadas: '+items.filter(x=>x.spanishMeaningStatus!=='PROPOSED_TRANSLATION_SOURCE_MATCH').map(x=>x.id).join(', '),
    '- Total: '+items.length,
    '- Sin programa candidato: '+unknown.length+' ('+(unknown.map(x=>x.id).join(', ')||'ninguno')+')',
    '- Mapeo certificado P↔requisito: NO',
    '- Esta proyección no escribe recibos, no modifica decisiones y no concede permisos.',
    ''
  ].join('\n');
  return {json,markdown:md};
}
export function writeTransparency(report) {
  const built=buildTransparency(report);fs.mkdirSync(OUTPUT,{recursive:true});
  fs.writeFileSync(path.join(OUTPUT,'requirement-transparency.json'),JSON.stringify(built.json,null,2)+'\n');
  fs.writeFileSync(path.join(OUTPUT,'requirement-transparency.md'),built.markdown+'\n');
  return {count:built.json.requirementCount,unmapped:built.json.unmappedRequirementIds.length,programs:Object.keys(built.json.programIndex).length};
}
