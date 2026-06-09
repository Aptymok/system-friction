'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AmvScopeState } from '@/lib/amv/core/amvScopeStateTypes';

type Row = Record<string, unknown>;

type ScoreFrictionSelectedContext = {
  case_id?: string | null;
  latest_observation?: Row | null;
  latest_vectors?: Row | null;
  evidence_count?: number;
  source_coverage?: number;
  warnings?: string[];
  trust?: string;
  manual_test?: boolean;
  tables?: {
    observations?: number;
    vectors?: number;
    prototypes?: number;
    verifications?: number;
    events?: number;
  };
};

type EvaluationResponse = {
  ok?: boolean;
  data?: {
    normalized?: Row;
    vectors?: {
      acoustic_vector?: Row;
      semantic_vector?: Row;
      memetic_vector?: Row;
      platform_vector?: Row;
      mihm_cultural_vector?: Row;
    };
  };
  error?: string;
  details?: string;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function stringValue(value: unknown, fallback = 'sin dato') {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function selectedContextFrom(state: AmvScopeState): ScoreFrictionSelectedContext {
  return record(state.selectedContext) as ScoreFrictionSelectedContext;
}

function stateExplanation(state: AmvScopeState) {
  if (state.state === 'live') return 'Hay una observacion conectada al scope ScoreFriction. La lectura puede operar como observatorio, con cautela sobre cobertura.';
  if (state.state === 'sandbox') return 'El circuito esta disponible, pero la evidencia pertenece a sandbox. No sostiene regimen cultural.';
  if (state.state === 'missing') return 'No hay estado observable para este scope.';
  return 'Estado degradado: el contrato responde, pero falta evidencia suficiente o fuente confiable para leer campo cultural fuerte.';
}

function warningText(warning: string) {
  const map: Record<string, string> = {
    scorefriction_manual_test_not_regime_evidence: 'Esta evidencia prueba el circuito, pero no sostiene regimen cultural fuerte.',
    scorefriction_service_role_missing: 'Falta acceso server-side para leer evidencia viva. La lectura queda degradada.',
    scorefriction_vectors_missing: 'No existe vector calculado; registre evidencia o metadata.',
    scorefriction_logbook_missing: 'No hay evento ScoreFriction conectado a bitacora.',
  };
  if (map[warning]) return map[warning];
  if (warning.includes('no hay observaciones')) return 'No hay observaciones reales registradas para sostener lectura cultural.';
  return warning;
}

function frictionLevel(input: { coverage: number; evidenceCount: number; manualTest?: boolean; vector?: Row | null }) {
  if (input.manualTest || input.evidenceCount === 0 || input.coverage <= 0) return 'insuficiente';
  const vector = input.vector ?? {};
  const pressure = (
    numberValue(vector.FS_C) +
    numberValue(vector.SCR) +
    numberValue(vector.ICE_C) +
    numberValue(vector.CRM_C)
  ) / 4;
  if (pressure >= 0.66 || input.coverage >= 0.9) return 'alta';
  if (pressure >= 0.38 || input.coverage >= 0.35) return 'media';
  return 'baja';
}

function protoattractor(input: { canSupportAttractor: boolean; evidenceCount: number; coverage: number; manualTest?: boolean; vector?: Row | null }) {
  if (input.manualTest || input.evidenceCount === 0 || input.coverage <= 0) return 'insuficiente';
  if (!input.canSupportAttractor) return 'latente';
  const vector = input.vector ?? {};
  const pull = (numberValue(vector.PAC) + numberValue(vector.LCP) + numberValue(vector.VFE)) / 3;
  if (pull >= 0.66) return 'emergente';
  if (pull >= 0.34) return 'latente';
  return 'ausente';
}

function productionDirection(input: { state: AmvScopeState; friction: string; proto: string; tables?: ScoreFrictionSelectedContext['tables'] }) {
  if (!input.state.latestReading) return 'registrar mas evidencia';
  if (input.state.state !== 'live') return 'mantener en sandbox';
  if ((input.tables?.observations ?? 0) <= 1) return 'enviar a Wave';
  if (input.friction === 'insuficiente') return 'comparar contra otro caso';
  if (input.proto === 'emergente') return 'generar brief creativo';
  return 'enviar a Wide';
}

function observationText(context: ScoreFrictionSelectedContext, state: AmvScopeState, friction: string, proto: string) {
  const observation = record(context.latest_observation);
  const vectors = record(context.latest_vectors);
  const acoustic = record(vectors.acoustic_vector);
  const semantic = record(vectors.semantic_vector);
  const memetic = record(vectors.memetic_vector);
  const platform = record(vectors.platform_vector);
  const mihm = record(vectors.mihm_cultural_vector);
  const caseId = context.case_id ?? state.latestReading?.label ?? 'sin caso';
  const source = state.latestReading?.source ?? stringValue(observation.source_name, 'fuente no declarada');

  if (!state.latestReading) return 'Todavia no hay una senal cultural observable. El sistema solo puede confirmar que el circuito existe.';

  const signals = [
    numberValue(acoustic.energy) > 0 ? 'rasgos acusticos' : null,
    numberValue(semantic.density) > 0 || numberValue(semantic.agency) > 0 ? 'presion semantica' : null,
    numberValue(memetic.reuse_potential) > 0 || numberValue(memetic.replication) > 0 ? 'potencial memetico' : null,
    numberValue(platform.source_coverage) > 0 ? 'cobertura de fuente' : null,
    numberValue(mihm.PAC) > 0 || numberValue(mihm.LCP) > 0 ? 'vector MIHM-Cultural' : null,
  ].filter(Boolean);

  const basis = signals.length ? signals.join(', ') : 'evidencia inicial sin vector suficiente';
  return `Se observa ${caseId} desde ${source}. La lectura combina ${basis}. La friccion aparece como ${friction} y el protoatractor queda ${proto}; no es juicio estetico, es lectura de campo y persistencia posible.`;
}

function zeroExplanations(state: AmvScopeState, context: ScoreFrictionSelectedContext) {
  const tables = context.tables ?? {};
  const rows: Array<[string, string]> = [];
  if ((tables.prototypes ?? 0) === 0) rows.push(['Prototypes: 0', 'Todavia no hay propuesta/prototipo cultural generado.']);
  if ((tables.verifications ?? 0) === 0) rows.push(['Verifications: 0', 'Todavia no existe validacion longitudinal.']);
  if (state.evidenceSummary.sourceCoverage <= 0.2) rows.push(['Coverage bajo', state.latestReading ? 'La senal existe, pero la cobertura es inicial.' : 'No hay cobertura suficiente para sostener lectura cultural.']);
  if ((tables.events ?? 0) === 0) rows.push(['Events: 0', 'No hay evento ScoreFriction conectado a bitacora.']);
  if ((tables.vectors ?? 0) === 0) rows.push(['Vectors: 0', 'No existe vector calculado; registre evidencia o metadata.']);
  return rows;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-[#2b261d] bg-[#080706] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f8678]">{label}</div>
      <div className="mt-2 font-serif text-2xl text-[#ead8aa]">{value}</div>
      <p className="mt-1 text-xs leading-5 text-[#918877]">{note}</p>
    </div>
  );
}

export function ScoreFrictionInterpretationPanel({ initialState }: { initialState: AmvScopeState }) {
  const [state, setState] = useState(initialState);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const context = useMemo(() => selectedContextFrom(state), [state]);
  const mihmVector = record(record(context.latest_vectors).mihm_cultural_vector);
  const friction = frictionLevel({
    coverage: state.evidenceSummary.sourceCoverage,
    evidenceCount: state.evidenceSummary.count,
    manualTest: Boolean(context.manual_test),
    vector: mihmVector,
  });
  const proto = protoattractor({
    canSupportAttractor: state.canSupportAttractor,
    coverage: state.evidenceSummary.sourceCoverage,
    evidenceCount: state.evidenceSummary.count,
    manualTest: Boolean(context.manual_test),
    vector: mihmVector,
  });
  const direction = productionDirection({ state, friction, proto, tables: context.tables });
  const zeros = zeroExplanations(state, context);

  async function refreshState() {
    const response = await fetch('/api/amv/state?scope=scorefriction', { cache: 'no-store' });
    const json = await response.json() as AmvScopeState;
    if (json.ok) setState(json);
    return json;
  }

  async function evaluateSignal() {
    setBusy(true);
    setMessage(null);
    setEvaluation(null);
    try {
      const liveState = await refreshState();
      if (!liveState.latestReading?.id) {
        setMessage('No hay senal suficiente. Registra evidencia primero.');
        return;
      }
      const response = await fetch('/api/scorefriction/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ observation_id: liveState.latestReading.id }),
      });
      const json = await response.json() as EvaluationResponse;
      if (!response.ok || !json.ok) throw new Error(json.error ?? json.details ?? 'scorefriction_evaluate_failed');
      setEvaluation(json);
      setMessage('Evaluacion generada como lectura cultural, no como calificacion estetica.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo evaluar la senal.');
    } finally {
      setBusy(false);
    }
  }

  const evaluatedVectors = evaluation?.data?.vectors;
  const evaluatedMihm = record(evaluatedVectors?.mihm_cultural_vector);
  const evalFriction = frictionLevel({
    coverage: numberValue(record(evaluatedVectors?.platform_vector).source_coverage, state.evidenceSummary.sourceCoverage),
    evidenceCount: state.evidenceSummary.count,
    manualTest: Boolean(context.manual_test),
    vector: evaluatedMihm,
  });
  const evalProto = protoattractor({
    canSupportAttractor: state.canSupportAttractor,
    coverage: numberValue(record(evaluatedVectors?.platform_vector).source_coverage, state.evidenceSummary.sourceCoverage),
    evidenceCount: state.evidenceSummary.count,
    manualTest: Boolean(context.manual_test),
    vector: evaluatedMihm,
  });

  return (
    <section className="grid gap-4">
      <div className="border border-[#2b261d] bg-[#0c0b09] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b8924b]">Lectura interpretativa</p>
            <h2 className="mt-2 font-serif text-3xl text-[#ead8aa]">Que esta pasando con esta senal cultural</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8ad98]">
              {observationText(context, state, friction, proto)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void evaluateSignal()}
            disabled={busy}
            className="w-fit border border-[#b8924b]/70 bg-[#17130d] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ead8aa] disabled:opacity-45"
          >
            {busy ? 'Evaluando...' : 'Evaluar senal'}
          </button>
        </div>

        {message ? <p className="mt-4 border border-[#2b261d] bg-[#080706] px-3 py-2 text-sm text-[#b8ad98]">{message}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric label="Estado" value={state.state} note={stateExplanation(state)} />
          <Metric label="Friccion cultural" value={friction} note="Interpretada desde cobertura, evidencia y vector MIHM-Cultural disponible." />
          <Metric label="Protoatractor" value={proto} note="No se declara fuerte si la evidencia es manual, degradada o sin cobertura." />
          <Metric label="Ruta sugerida" value={direction} note="Recomendacion no ejecutiva para continuar observando." />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="border border-[#2b261d] bg-[#0c0b09] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Caso observado</h3>
          <dl className="mt-3 grid gap-3 text-sm leading-6 text-[#b8ad98] md:grid-cols-2">
            <div><dt className="text-[#8f8678]">case_id</dt><dd>{context.case_id ?? 'sin caso'}</dd></div>
            <div><dt className="text-[#8f8678]">lectura</dt><dd>{state.latestReading?.label ?? 'sin lectura viva'}</dd></div>
            <div><dt className="text-[#8f8678]">source</dt><dd>{state.latestReading?.source ?? 'sin fuente'}</dd></div>
            <div><dt className="text-[#8f8678]">observedAt</dt><dd>{state.latestReading?.observedAt ?? state.evidenceSummary.latestObservedAt ?? 'sin fecha'}</dd></div>
          </dl>
        </div>

        <div className="border border-[#2b261d] bg-[#0c0b09] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Alertas</h3>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[#b8ad98]">
            {state.warnings.length ? state.warnings.map((warning) => (
              <p key={warning} className="border border-[#3a3022] bg-[#100d09] px-3 py-2">{warningText(warning)}</p>
            )) : <p>Sin alertas activas.</p>}
          </div>
        </div>
      </div>

      {evaluation?.data?.vectors ? (
        <div className="border border-[#2b261d] bg-[#0c0b09] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Resultado evaluado</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Metric label="Friccion" value={evalFriction} note={`FS_C ${numberValue(evaluatedMihm.FS_C).toFixed(2)} / SCR ${numberValue(evaluatedMihm.SCR).toFixed(2)}`} />
            <Metric label="Coherencia" value={numberValue(evaluatedMihm.CRM_C).toFixed(2)} note="Coherencia ritmica/cultural inferida desde la observacion." />
            <Metric label="Disonancia" value={numberValue(evaluatedMihm.FS_C).toFixed(2)} note="Friccion o saturacion interna; no implica calidad musical." />
            <Metric label="Protoatractor" value={evalProto} note={`PAC ${numberValue(evaluatedMihm.PAC).toFixed(2)} / LCP ${numberValue(evaluatedMihm.LCP).toFixed(2)}`} />
            <Metric label="Riesgo saturacion" value={numberValue(evaluatedMihm.SCR).toFixed(2)} note="Riesgo de repeticion, sobreexposicion o agotamiento de senal." />
            <Metric label="Persistencia" value={numberValue(evaluatedMihm.LCP).toFixed(2)} note="Lectura inicial de continuidad cultural posible." />
            <Metric label="Ruta sugerida" value={productionDirection({ state, friction: evalFriction, proto: evalProto, tables: context.tables })} note="Accion de observacion, no mandato de produccion." />
          </div>
        </div>
      ) : null}

      {zeros.length ? (
        <div className="border border-[#2b261d] bg-[#0c0b09] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Por que hay ceros</h3>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[#b8ad98] md:grid-cols-2">
            {zeros.map(([label, explanation]) => (
              <p key={label} className="border border-[#2b261d] bg-[#080706] px-3 py-2"><span className="text-[#ead8aa]">{label}</span><br />{explanation}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
        <Link href="/scorefriction/wave" className="border border-[#2b261d] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]">Ir a Wave</Link>
        <Link href="/scorefriction/wide" className="border border-[#2b261d] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]">Ir a Wide</Link>
        <Link href="/scorefriction/lab" className="border border-[#2b261d] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]">Registrar evidencia</Link>
      </div>

      <details className="border border-[#2b261d] bg-[#080706] p-4">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Ver JSON tecnico</summary>
        <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#9c927f]">{JSON.stringify({ state, evaluation }, null, 2)}</pre>
      </details>
    </section>
  );
}

export function ScoreFrictionWaveSummary({ state }: { state: AmvScopeState }) {
  const context = selectedContextFrom(state);
  const count = context.evidence_count ?? state.evidenceSummary.count;
  const first = state.evidenceSummary.latestObservedAt ?? state.latestReading?.observedAt ?? 'sin fecha';
  const last = state.latestReading?.observedAt ?? state.evidenceSummary.latestObservedAt ?? 'sin fecha';
  const trend = count <= 1
    ? 'Solo existe una observacion. Todavia no hay tendencia longitudinal.'
    : state.evidenceSummary.sourceCoverage > 0.6
      ? 'La senal tiene mas de una observacion y cobertura creciente; aun requiere verificacion.'
      : 'Hay varias observaciones, pero la evidencia todavia no alcanza para declarar crecimiento o degradacion.';

  return (
    <section className="border border-[#2b261d] bg-[#0c0b09] p-4 text-[#d8d0bd]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Wave</p>
      <h2 className="mt-2 font-serif text-2xl text-[#ead8aa]">Wave observa persistencia temporal de la senal.</h2>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-[#b8ad98] md:grid-cols-4">
        <p><span className="text-[#8f8678]">Observaciones</span><br />{count}</p>
        <p><span className="text-[#8f8678]">Primera observacion</span><br />{count > 1 ? first : 'insuficiente'}</p>
        <p><span className="text-[#8f8678]">Ultima observacion</span><br />{last}</p>
        <p><span className="text-[#8f8678]">Lectura</span><br />{trend}</p>
      </div>
    </section>
  );
}

export function ScoreFrictionWideSummary({ state }: { state: AmvScopeState }) {
  const context = selectedContextFrom(state);
  const tables = context.tables ?? {};
  const caseCount = context.case_id ? 1 : 0;
  const onlyOne = caseCount <= 1;

  return (
    <section className="border border-[#2b261d] bg-[#0c0b09] p-4 text-[#d8d0bd]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b8924b]">Wide</p>
      <h2 className="mt-2 font-serif text-2xl text-[#ead8aa]">Wide observa el campo cultural amplio, no solo una cancion.</h2>
      <div className="mt-3 grid gap-3 text-sm leading-6 text-[#b8ad98] md:grid-cols-5">
        <p><span className="text-[#8f8678]">Casos disponibles</span><br />{caseCount || 'sin casos vivos'}</p>
        <p><span className="text-[#8f8678]">Fuentes</span><br />{state.latestReading?.source ?? 'sin fuente viva'}</p>
        <p><span className="text-[#8f8678]">Cobertura</span><br />{state.evidenceSummary.sourceCoverage.toFixed(2)}</p>
        <p><span className="text-[#8f8678]">Eventos</span><br />{tables.events ?? 0}</p>
        <p><span className="text-[#8f8678]">Clusters/prototypes</span><br />{tables.prototypes ?? 0}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#b8ad98]">
        {onlyOne ? 'Campo amplio insuficiente. Solo hay un caso observado.' : 'Hay mas de un caso disponible para comparar campo cultural.'}
      </p>
    </section>
  );
}
