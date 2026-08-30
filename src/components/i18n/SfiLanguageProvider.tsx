'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type SfiLanguage = 'es' | 'en';

type LanguageContextValue = {
  language: SfiLanguage;
  setLanguage: (language: SfiLanguage) => void;
  text: (es: string, en: string) => string;
};

const STORAGE_KEY = 'sfi-language';

const LanguageContext = createContext<LanguageContextValue>({
  language: 'es',
  setLanguage: () => undefined,
  text: (es) => es,
});

// Every tuple is [Spanish, English]. This catalog is intentionally a pure lookup
// only. It never walks or rewrites document.body: institutional identifiers,
// evidence, object names, source values and user content are not UI copy.
const UI_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['PRIVACIDAD Y POLÍTICA DE DATOS PARA AGENTES EXTERNOS', 'PRIVACY & EXTERNAL AGENT DATA POLICY'],
  ['OBSERVATORIO MUNDIAL EN VIVO', 'LIVE WORLD OBSERVATORY'],
  ['FIELD · SYSTEM FRICTION INSTITUTE', 'FIELD · SYSTEM FRICTION INSTITUTE'],
  ['Campo de observación', 'Observation field'],
  ['La Tierra es el instrumento. Los datos aparecen donde ocurren.', 'The Earth is the instrument. Data appears where it occurs.'],
  ['SISTEMAS', 'SYSTEMS'],
  ['Qué es un sistema', 'What a system is'],
  ['Relaciones, frontera, intercambio, estado y persistencia.', 'Relations, boundary, exchange, state and persistence.'],
  ['ARCHIVO', 'ARCHIVE'],
  ['Archivo, fuente y contexto', 'Archive, source and context'],
  ['La memoria externa conserva linaje; las pérdidas se muestran.', 'External memory preserves lineage; losses remain visible.'],
  ['FALSACIÓN', 'FALSIFICATION'],
  ['Campo de falsación', 'Falsification field'],
  ['Las hipótesis se sostienen sólo mientras sobreviven al contraste.', 'Hypotheses stand only while they survive contrast.'],
  ['OPCIONALIDAD', 'OPTIONALITY'],
  ['Conservar futuros abiertos', 'Keep futures open'],
  ['Reserva, memoria, redundancia y reversibilidad mantienen opciones.', 'Reserve, memory, redundancy and reversibility preserve options.'],
  ['GOBERNANZA', 'GOVERNANCE'],
  ['Arquitectura canónica de gobernanza', 'Canonical governance architecture'],
  ['Observar → evidenciar → evaluar → inferir → autorizar → ejecutar → retornar → memorizar.', 'Observe → evidence → evaluate → infer → authorize → execute → return → remember.'],
  ['AUTORIDAD', 'AUTHORITY'],
  ['Autoridad · evidencia · recuperación', 'Authority · evidence · recovery'],
  ['La autoridad sólo es sostenible si la evidencia y el retorno pueden alcanzarla.', 'Authority is sustainable only when evidence and return can reach it.'],
  ['AGENTES', 'AGENTS'],
  ['Envolvente de autoridad agéntica', 'Agent authority envelope'],
  ['Identidad, alcance, herramienta, tiempo, consecuencia y retorno.', 'Identity, scope, tool, time, consequence and return.'],
  ['IDENTIDAD', 'IDENTITY'],
  ['Tarea · profesión · identidad', 'Task · profession · identity'],
  ['Cuando cambia una capacidad, cambia la forma de ser útil.', 'When a capability changes, the way of being useful changes.'],
  ['MODELOS', 'MODELS'],
  ['Modelo generativo observable', 'Observable generative model'],
  ['La inferencia se trata como proceso inspeccionable, no como caja negra.', 'Inference is treated as an inspectable process, not a black box.'],
  ['GENAI', 'GENAI'],
  ['Anatomía de una aplicación GenAI', 'Anatomy of a GenAI application'],
  ['Entrada, contexto, modelo, herramientas, memoria y controles.', 'Input, context, model, tools, memory and controls.'],
  ['SFI · director operativo', 'SFI · operating director'],
  ['ROOT observa todo, puede intervenir y conserva en exclusiva la promoción a canon; la revisión operativa puede delegarse con trazabilidad.', 'ROOT observes everything, may intervene, and exclusively retains promotion to canon; operational review may be delegated with traceability.'],
  ['FUENTE VIVA', 'LIVE SOURCE'],
  ['ESTADO', 'STATUS'],
  ['PROPOSICIONES', 'PROPOSALS'],
  ['ROOT · AUTORIDAD SOBERANA', 'ROOT · SOVEREIGN AUTHORITY'],
  ['CONTROLLER · DECISIÓN DELEGADA', 'CONTROLLER · DELEGATED DECISION'],
  ['SIN AUTORIDAD DE DECISIÓN', 'NO DECISION AUTHORITY'],
  ['OBSERVADO', 'OBSERVED'],
  ['CONECTANDO', 'CONNECTING'],
  ['DEGRADADO', 'DEGRADED'],
  ['EN VIVO', 'LIVE'],
  ['COLA DE GOBERNANZA · COGNITIVE TWIN / ACP', 'GOVERNANCE QUEUE · COGNITIVE TWIN / ACP'],
  ['Decidir no es canonizar. ROOT ve todo y conserva la promoción canónica exclusiva. Un controller sólo puede decidir propuestas operativas delegables. ACEPTAR es una sola decisión: SFI la envía directamente a la cola de ejecución y espera RETURN.', 'Deciding is not canonizing. ROOT sees everything and retains exclusive canonical promotion. A controller may decide only delegable operational proposals. ACCEPT is one decision: SFI sends it directly to the execution queue and waits for RETURN.'],
  ['BITÁCORA', 'LOGBOOK'],
  ['COLA + REPORTES', 'QUEUE + REPORTS'],
  ['DECISIÓN DELEGADA · PROMOCIÓN CANÓNICA BLOQUEADA', 'DELEGATED DECISION · CANONICAL PROMOTION BLOCKED'],
  ['CONFIRMANDO PRESENCIA…', 'CONFIRMING PRESENCE…'],
  ['PRESENCIA ACP ACTIVA · RENOVAR', 'ACP PRESENCE ACTIVE · RENEW'],
  ['HACERME VISTO · CONFIRMAR PRESENCIA ACP', 'MARK ME SEEN · CONFIRM ACP PRESENCE'],
  ['EN CURSO · EJECUCIÓN / RETURN', 'IN PROGRESS · EXECUTION / RETURN'],
  ['TRAZA RECIENTE · DECISIONES Y CIERRES', 'RECENT TRACE · DECISIONS AND CLOSURES'],
  ['No hay propuestas visibles para esta autoridad.', 'There are no proposals visible to this authority.'],
  ['PROPUESTA DEL SISTEMA', 'SYSTEM PROPOSAL'],
  ['DECISIÓN YA TOMADA', 'DECISION ALREADY MADE'],
  ['TRAZA DE GOBERNANZA', 'GOVERNANCE TRACE'],
  ['Estado', 'Status'],
  ['Riesgo', 'Risk'],
  ['Clase de decisión', 'Decision class'],
  ['Decidida por', 'Decided by'],
  ['Autoridad', 'Authority'],
  ['Creada', 'Created'],
  ['Ejecutada', 'Executed'],
  ['ACEPTAR · ENVIAR A EJECUCIÓN', 'ACCEPT · SEND TO EXECUTION'],
  ['RECHAZAR', 'REJECT'],
  ['PEDIR EVIDENCIA', 'REQUEST EVIDENCE'],
  ['CANCELAR / CONGELAR', 'CANCEL / FREEZE'],
  ['DETENER / CONGELAR', 'STOP / FREEZE'],
  ['ENVIAR A EJECUCIÓN · LEGACY', 'SEND TO EXECUTION · LEGACY'],
  ['CERRAR', 'CLOSE'],
  ['ORIGEN → AHORA', 'ORIGIN → NOW'],
  ['HISTORIA TEMPORAL', 'TIME HISTORY'],
  ['LECTURA MUNDIAL', 'WORLD READING'],
  ['NODOS', 'NODES'],
  ['HIPÓTESIS', 'HYPOTHESES'],
  ['CONTRASTES', 'CONTRASTS'],
  ['CICLOS ROOT', 'ROOT CYCLES'],
  ['ABRIR SATÉLITE', 'OPEN SATELLITE'],
  ['HISTORIA', 'HISTORY'],
  ['LECTURA DEL CAMPO', 'FIELD READING'],
  ['NODO ACTIVO', 'ACTIVE NODE'],
  ['FRICCIÓN', 'FRICTION'],
  ['VECINOS', 'NEIGHBORS'],
  ['PERSISTENCIA', 'PERSISTENCE'],
  ['HUBS VIVOS', 'LIVE HUBS'],
  ['LECTURA DIARIA', 'DAILY READING'],
  ['MUNDO · 10D', 'WORLD · 10D'],
  ['APRENDIZAJE', 'LEARNING'],
  ['10 DIMENSIONES', '10 DIMENSIONS'],
  ['Abrir observatorio del satélite', 'Open satellite observatory'],
  ['Satélite del observatorio SFI', 'SFI observatory satellite'],
  ['Tierra observada por System Friction Institute', 'Earth observed by System Friction Institute'],
  ['ÍNDICE', 'INDEX'],
  ['SESIÓN', 'SESSION'],
  ['CERRAR SESIÓN', 'LOG OUT'],
  ['INICIAR SESIÓN', 'SIGN IN'],
  ['INICIAR SESIÓN', 'LOGIN'],
  ['CONTINUAR', 'CONTINUE'],
  ['GUARDAR', 'SAVE'],
  ['CANCELAR', 'CANCEL'],
  ['ABRIR', 'OPEN'],
  ['CERRAR', 'CLOSE'],
  ['BUSCAR', 'SEARCH'],
  ['FILTRAR', 'FILTER'],
  ['CARGANDO', 'LOADING'],
  ['ERROR', 'ERROR'],
  ['ADVERTENCIA', 'WARNING'],
  ['EVIDENCIA', 'EVIDENCE'],
  ['FUENTE', 'SOURCE'],
  ['FUENTES', 'SOURCES'],
  ['OBSERVACIÓN', 'OBSERVATION'],
  ['OBSERVACIONES', 'OBSERVATIONS'],
  ['DECISIÓN', 'DECISION'],
  ['DECISIONES', 'DECISIONS'],
  ['EJECUCIÓN', 'EXECUTION'],
  ['RETURN', 'RETURN'],
  ['FIELD', 'FIELD'],
  ['ROOT', 'ROOT'],
];

const FRAGMENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['por decidir', 'to decide'],
  ['en ejecución/retorno', 'in execution/return'],
  ['en curso', 'in progress'],
  ['resueltas', 'resolved'],
  ['abiertas', 'open'],
  ['eventos', 'events'],
  ['contrastes', 'contrasts'],
  ['dimensiones con lectura', 'dimensions with readings'],
  ['cortes', 'snapshots'],
  ['riesgo', 'risk'],
  ['no indicado', 'not specified'],
  ['aún no decidida', 'not decided yet'],
  ['actor registrado', 'recorded actor'],
  ['esperando RETURN', 'waiting for RETURN'],
  ['propuesta aprobada', 'approved proposal'],
  ['Propuesta aprobada', 'Approved proposal'],
  ['Propuesta resuelta', 'Resolved proposal'],
  ['Propuesta', 'Proposal'],
];

function replaceAllLiteral(value: string, source: string, target: string) {
  return source && value.includes(source) ? value.split(source).join(target) : value;
}

export function translateUiText(value: string, language: SfiLanguage): string {
  if (!value.trim()) return value;
  let output = value;
  for (const [es, en] of UI_PAIRS) {
    const source = language === 'en' ? es : en;
    const target = language === 'en' ? en : es;
    if (output === source) return target;
  }
  for (const [es, en] of FRAGMENT_PAIRS) {
    output = replaceAllLiteral(output, language === 'en' ? es : en, language === 'en' ? en : es);
  }
  return output;
}

export function SfiUiText({ es, en }: { es: string; en: string }) {
  const { text } = useContext(LanguageContext);
  return <>{text(es, en)}</>;
}

export function SfiLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SfiLanguage>('es');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial: SfiLanguage = stored === 'en' || stored === 'es'
      ? stored
      : window.navigator.language.toLowerCase().startsWith('es')
        ? 'es'
        : 'en';
    setLanguageState(initial);
  }, []);

  const setLanguage = useCallback((next: SfiLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLanguageState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.sfiLanguage = language;
  }, [language]);

  const text = useCallback((es: string, en: string) => language === 'es' ? es : en, [language]);
  const value = useMemo(() => ({ language, setLanguage, text }), [language, setLanguage, text]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <div
        role="group"
        aria-label={language === 'es' ? 'Idioma de la interfaz' : 'Interface language'}
        data-sfi-ui-copy="language-control"
        style={{
          position: 'fixed',
          right: 14,
          top: 14,
          zIndex: 2147483000,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: 3,
          border: '1px solid rgba(205,164,93,.32)',
          borderRadius: 999,
          background: 'rgba(8,8,6,.88)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 28px rgba(0,0,0,.28)',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <span style={{ padding: '0 6px', fontSize: 9, letterSpacing: '.08em', color: '#c7b58f' }}>
          {language === 'es' ? 'IDIOMA' : 'LANGUAGE'}
        </span>
        {(['es', 'en'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={language === option}
            aria-label={option === 'es' ? 'Español' : 'English'}
            onClick={() => setLanguage(option)}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '6px 9px',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.08em',
              color: language === option ? '#0b0906' : '#c7b58f',
              background: language === option ? '#cda45d' : 'transparent',
            }}
          >
            {option.toUpperCase()}
          </button>
        ))}
      </div>
    </LanguageContext.Provider>
  );
}

export function useSfiLanguage() {
  return useContext(LanguageContext);
}
