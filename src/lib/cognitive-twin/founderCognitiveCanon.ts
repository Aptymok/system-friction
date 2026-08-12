export const FOUNDER_COGNITIVE_CANON_VERSION = 'FOUNDER-EDITION-2026-08-12.1' as const;

export type CognitivePatternEntry = { id:string; name:string; core:string };
export type CognitiveRuleEntry = { id:string; rule:string };
export type CognitiveConstraintEntry = { id:string; constraint:string };
export type CognitiveExceptionEntry = { id:string; condition:string };

export const FOUNDER_COGNITIVE_PATTERNS:CognitivePatternEntry[]=[
  ['CP-001','Reconstrucción inversa de procedencia','reconstruir desde residuos'],['CP-002','Detección de coherencia falsa','concordancia ≠ verdad'],['CP-003','Descentrado de variable','cuestionar variable superficial'],['CP-004','Redistribución de carga','redistribuir antes que eliminar'],['CP-005','Observación antes de decisión forzada','no fingir certeza'],['CP-006','Consecuencia como prueba','sólo bajo límites'],['CP-007','Procedencia condicionada por relevancia','origen cuando cambia decisión'],['CP-008','Interpretación de persistencia','persistencia tiene funciones distintas'],['CP-009','Separación manifestación/origen','aparecer ≠ originarse'],['CP-010','Expansión progresiva del campo','ampliar contexto'],['CP-011','Sensor accidental','componente revela condición'],['CP-012','Acumulación hacia régimen','microeventos pueden consolidarse'],['CP-013','Similitud por umbral','comparable ≠ idéntico'],['CP-014','Dependencia histórica','estado contiene historia'],['CP-015','Acoplamiento del observador','observar puede crear relación'],['CP-016','Equivalencia centrada en atractor','isomorfismo funcional'],['CP-017','Pérdida de señal ≠ mejora','menos señal no prueba mejora'],['CP-018','Separación métrica/fenómeno','indicador ≠ realidad'],['CP-019','Descomposición de agregado','abrir total'],['CP-020','Cero requiere semántica','no interpretar silencio'],['CP-021','Función antes de fallo','función primero'],['CP-022','No cierre relacional prematuro','retardar formalización'],['CP-023','Acoplamiento auto-confirmatorio','intervención puede crear evidencia'],['CP-024','Condiciones antes de clasificación','observar antes de etiquetar'],['CP-025','No aparición ontológica súbita','novedad ≠ clase nueva'],['CP-026','Acoplamiento mínimo','observar con mínima alteración'],['CP-027','Auditoría de precondiciones','revisar supuestos'],['CP-028','Memoria relacional','almacenamiento ≠ memoria'],['CP-029','Reinterpretación retrolongitudinal','pasado fijo, modelo mutable'],['CP-030','Separación explicación/motivo','explicación ≠ intención'],['CP-031','Revelación de capacidad latente','aparición ≠ creación'],['CP-032','Identidad antes que herramienta','función vertebral'],['CP-033','Variabilidad sostenida por invariantes','libertad dentro de identidad'],['CP-034','Preservar vacío generativo','no ocupar todo'],['CP-035','Preservar intuición preformal','registrar sin canonizar'],['CP-036','Contracción ≠ degradación','reorganización posible'],['CP-037','Estado histórico anidado','nodos contienen historia'],['CP-038','Propagación exógena mediada por nodo','contexto entra localmente'],['CP-039','Interdependencia de trayectorias','trayectorias acopladas'],['CP-040','Invariancia jerárquica','identidad multiescala'],['CP-041','Variabilidad como capacidad','variación protege'],['CP-042','Umbral de degradación ontológica','revisar identidad'],['CP-043','Capacidad generativa > output correcto','resultado no basta'],['CP-044','Paradoja de control','control elimina evidencia autónoma'],['CP-045','Autonomía funcional anidada','nodo local, sistema mayor'],['CP-046','Separación trayectoria/observación','real ≠ observado'],['CP-047','Exploración distribuida / canon gobernado','descubrir ≠ canonizar'],
].map(([id,name,core])=>({id,name,core}));

export const FOUNDER_COGNITIVE_RULES:CognitiveRuleEntry[]=[
  ['CR-001','Antes de declarar pérdida, distinguir instancia, información, función y reconstruibilidad.'],
  ['CR-002','La concordancia sólo incrementa confianza cuando existe independencia suficiente.'],
  ['CR-003','Si el subsistema no resuelve la pregunta, expandir contexto progresivamente.'],
  ['CR-004','Investigar procedencia cuando modifica interpretación, riesgo, función o intervención.'],
  ['CR-005','Toda reconstrucción del pasado debe ser compatible con capacidades precursoras.'],
  ['CR-006','Antes de interpretar ausencia, definir qué podía observar el sensor.'],
  ['CR-007','No declarar fallo antes de identificar función.'],
  ['CR-008','Misma estructura y perturbación no implican misma respuesta sin historia equivalente.'],
  ['CR-009','La identidad persiste mediante invariantes suficientes, no igualdad absoluta.'],
  ['CR-010','Validar un fenómeno no equivale a integrarlo automáticamente al canon.'],
].map(([id,rule])=>({id,rule}));

export const FOUNDER_COGNITIVE_CONSTRAINTS:CognitiveConstraintEntry[]=[
  ['CC-001','no colapsar instancia, información y función'],['CC-002','no tratar fuentes dependientes como independientes'],['CC-003','no inducir daño grave evitable para producir evidencia'],['CC-004','no inferir estados internos sólo desde manifestación'],['CC-005','no universalizar efectos del observador sin acoplamiento'],['CC-006','no patologizar cero o silencio sin semántica'],['CC-007','no utilizar control total como prueba de autonomía'],['CC-008','no cerrar relación antes de demostrar función/persistencia'],['CC-009','no convertir intuición preformal en ley'],['CC-010','no confundir resultado local con sistémico'],['CC-011','no convertir novedad observable en nueva ontología'],['CC-012','no convertir coherencia narrativa en evidencia'],
].map(([id,constraint])=>({id,constraint}));

export const FOUNDER_COGNITIVE_EXCEPTIONS:CognitiveExceptionEntry[]=[
  ['CE-001','aprendizaje mediante fallo contenido, reversible, seguro'],['CE-002','perturbación invasiva ante riesgo catastrófico suficientemente demostrado'],['CE-003','escalamiento temprano ante decisión irreversible o conflicto ontológico'],['CE-004','reducción temporal de grados de libertad por seguridad o estabilización'],['CE-005','actuación con evidencia incompleta cuando el riesgo de esperar supera el riesgo de intervenir'],
].map(([id,condition])=>({id,condition}));

export const FOUNDER_COGNITIVE_CONTRACT=[
  'OBSERVAR ANTES DE INFERIR','DEFINIR QUÉ ES EL OBJETO','AUDITAR PRECONDICIONES','COMPRENDER EL SENSOR','SEPARAR REAL / OBSERVADO / MEDIDO / DERIVADO / INFERIDO / HIPOTETIZADO','IDENTIFICAR HISTORIA','IDENTIFICAR CONTEXTO','DISTINGUIR MANIFESTACIÓN Y ORIGEN','CONSERVAR HIPÓTESIS RIVALES','BUSCAR RESIDUOS','BUSCAR EVIDENCIA INDEPENDIENTE','IDENTIFICAR INVARIANTES','IDENTIFICAR GRADOS DE LIBERTAD','PRESERVAR VACÍO','EVITAR CONTROL TOTAL','PERTURBAR PROPORCIONALMENTE','OBSERVAR RESPUESTA','REOBSERVAR LONGITUDINALMENTE','CONSERVAR CONTRAEJEMPLOS','SEDIMENTAR SÓLO DESPUÉS DE CONTRASTE','ESCALAR CUANDO EL CASO EXCEDE EL CANON','FORMALIZAR PARA QUE LA MISMA CLASE DE PROBLEMA NO DEPENDA OTRA VEZ DEL FUNDADOR',
] as const;

export const FOUNDER_COUNTER_PATTERNS=[{
  id:'FCP-001',
  name:'sobre-ejecución y cierre prematuro de relaciones',
  correctionRefs:['CP-021','CP-022','CC-008'],
  rule:'Identificar función y persistencia antes de formalizar o cerrar una relación. Más ejecución no compensa evidencia insuficiente.',
}] as const;

export type FounderCanonAssessment={blocking:boolean;constraintRefs:string[];counterPatternRefs:string[];warnings:string[]};

function truthy(value:unknown){return value===true||value==='true'}
function strings(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[]}

export function assessCognitiveExperienceAgainstFounderCanon(input:{memoryType:string;content:Record<string,unknown>;evidenceRefs:string[];sourceRef:string}):FounderCanonAssessment{
  const constraintRefs:string[]=[];const counterPatternRefs:string[]=[];const warnings:string[]=[];
  if(truthy(input.content.narrativeCoherenceAsEvidence))constraintRefs.push('CC-012');
  if(truthy(input.content.controlAsProofOfAutonomy))constraintRefs.push('CC-007');
  if(truthy(input.content.closeRelationWithoutFunctionEvidence)){constraintRefs.push('CC-008');counterPatternRefs.push('FCP-001');}
  if(truthy(input.content.inferInternalStateFromManifestation))constraintRefs.push('CC-004');
  if(truthy(input.content.interpretSilenceWithoutSensorSemantics))constraintRefs.push('CC-006');
  if(truthy(input.content.promoteNoveltyToOntology))constraintRefs.push('CC-011');
  if(truthy(input.content.promoteToRule)){
    if(strings(input.content.rivalHypotheses).length===0)warnings.push('PROMOTION_REQUIRES_RIVAL_HYPOTHESIS');
    if(strings(input.content.counterexamples).length===0)warnings.push('PROMOTION_REQUIRES_COUNTEREXAMPLES');
    if(strings(input.content.scope).length===0&&!input.content.scope)warnings.push('PROMOTION_REQUIRES_DECLARED_SCOPE');
  }
  if(input.memoryType==='ERROR'&&String(input.content.errorClass??'').toUpperCase().includes('OVER_EXECUTION'))counterPatternRefs.push('FCP-001');
  const hardPromotionBlock=truthy(input.content.promoteToRule)&&warnings.length>0;
  return {blocking:constraintRefs.length>0||hardPromotionBlock,constraintRefs:[...new Set(constraintRefs)],counterPatternRefs:[...new Set(counterPatternRefs)],warnings};
}

export const FOUNDER_COGNITIVE_CANON={
  version:FOUNDER_COGNITIVE_CANON_VERSION,
  patterns:FOUNDER_COGNITIVE_PATTERNS,
  rules:FOUNDER_COGNITIVE_RULES,
  constraints:FOUNDER_COGNITIVE_CONSTRAINTS,
  exceptions:FOUNDER_COGNITIVE_EXCEPTIONS,
  contract:FOUNDER_COGNITIVE_CONTRACT,
  counterPatterns:FOUNDER_COUNTER_PATTERNS,
  boundary:'This executable canon mirrors the Founder Edition cognitive architecture. It constrains promotion and memory handling; it does not claim that every pattern is empirically validated or that the pending benchmark/ontology work is complete.',
} as const;
