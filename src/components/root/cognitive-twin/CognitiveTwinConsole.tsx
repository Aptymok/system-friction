import { HumanReadableRecord } from '@/components/shared/HumanReadableRecord';
import { FounderDecisionCandidateForm } from './FounderDecisionCandidateForm';
import { CognitiveTwinDeliberationPanel } from './CognitiveTwinDeliberationPanel';
import { NationalFieldPanel } from './NationalFieldPanel';
import type { CognitiveTwinState } from '@/core/cognitive-twin/readState';

function yesNo(value: boolean) {
  return value ? 'Sí' : 'No';
}

function implementationLabel(state: CognitiveTwinState) {
  if (!state.implementation.contractImplemented) return 'SIN CONTRATO EJECUTABLE';
  if (!state.implementation.databaseReady) return 'IMPLEMENTADO · PERSISTENCIA PENDIENTE';
  if (!state.implementation.providerConfigured) return 'NÚCLEO IMPLEMENTADO · PROVEEDOR NO CONFIGURADO';
  if (!state.implementation.providerExecutionObserved) return 'NÚCLEO IMPLEMENTADO · EJECUCIÓN LLM NO VERIFICADA';
  if (!state.implementation.approvedDecisionCorpusReady) return 'NÚCLEO ACTIVO · CORPUS DEL FUNDADOR PENDIENTE';
  if (!state.implementation.modelEvaluationRegistryReady) return 'NÚCLEO ACTIVO · MODELOS SIN APROBACIÓN EVALUADA';
  if (!state.implementation.institutionalAutonomyProven) return 'EJECUCIÓN OBSERVADA · AUTONOMÍA NO DEMOSTRADA';
  return 'AUTONOMÍA DEMOSTRADA';
}

export function CognitiveTwinConsole({ state }: { state: CognitiveTwinState }) {
  const configured = state.providers.filter((provider) => provider.available);
  return (
    <main style={{ minHeight: '100vh', background: '#070706', color: '#eee7d7', padding: 28, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
      <header style={{ borderBottom: '1px solid #6c5a2d', paddingBottom: 20, display: 'grid', gap: 8 }}>
        <span style={{ color: '#bba365', fontSize: 11, letterSpacing: '.18em' }}>SYSTEM FRICTION INSTITUTE · ROOT</span>
        <h1 style={{ margin: 0, fontSize: 30 }}>COGNITIVE TWIN</h1>
        <p style={{ margin: 0, color: '#958c7b', maxWidth: 1000, lineHeight: 1.65 }}>Conserva criterio institucional fuera de cualquier modelo. Los modelos pueden ejecutar funciones delimitadas; el contrato, la memoria, la evidencia y la autoridad permanecen en SFI.</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 18 }}>
        <article style={card}><small style={eyebrow}>ESTADO</small><strong style={big}>{implementationLabel(state)}</strong><span style={muted}>Configuración no equivale a ejecución; ejecución no equivale a autonomía.</span></article>
        <article style={card}><small style={eyebrow}>MEMORIA INSTITUCIONAL</small><strong style={big}>{state.counts.memory ?? 'N/D'}</strong><span style={muted}>registros persistidos</span></article>
        <article style={card}><small style={eyebrow}>DECISIONES DEL FUNDADOR</small><strong style={big}>{state.counts.approvedDecisions}</strong><span style={muted}>reglas aprobadas en el corpus</span></article>
        <article style={card}><small style={eyebrow}>MODELOS</small><strong style={big}>{state.counts.approvedModels}/{state.counts.models}</strong><span style={muted}>aprobados / registrados</span></article>
        <article style={card}><small style={eyebrow}>EVALUACIONES</small><strong style={big}>{state.counts.evaluations ?? 'N/D'}</strong><span style={muted}>pruebas persistidas</span></article>
        <article style={card}><small style={eyebrow}>EJECUCIONES</small><strong style={big}>{state.counts.runs ?? 'N/D'}</strong><span style={muted}>runs institucionales registrados</span></article>
      </section>

      {state.errors.length ? (
        <section style={{ ...card, borderColor: '#704b36', marginTop: 12 }}>
          <strong>Persistencia o lectura incompleta</strong>
          <p style={muted}>El Twin no rellenará estas ausencias con datos simulados.</p>
          {state.errors.map((error) => <p key={error} style={{ color: '#d0a58e', fontSize: 11 }}>{error}</p>)}
        </section>
      ) : null}

      <CognitiveTwinDeliberationPanel />
      <NationalFieldPanel />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12, marginTop: 12 }}>
        <article style={card}>
          <h2 style={heading}>QUÉ ESTÁ REALMENTE IMPLEMENTADO</h2>
          <dl style={{ display: 'grid', gap: 8, margin: 0 }}>
            <Row label="Contrato ejecutable" value={yesNo(state.implementation.contractImplemented)} />
            <Row label="Persistencia del Twin" value={yesNo(state.implementation.databaseReady)} />
            <Row label="Proveedor configurado" value={yesNo(state.implementation.providerConfigured)} />
            <Row label="Ejecución LLM observada" value={yesNo(state.implementation.providerExecutionObserved)} />
            <Row label="Router verificado operativamente" value={yesNo(state.implementation.providerRouterReady)} />
            <Row label="Corpus aprobado del fundador" value={yesNo(state.implementation.approvedDecisionCorpusReady)} />
            <Row label="Modelo aprobado mediante evaluación" value={yesNo(state.implementation.modelEvaluationRegistryReady)} />
            <Row label="Autonomía institucional demostrada" value={yesNo(state.implementation.institutionalAutonomyProven)} />
          </dl>
        </article>

        <article style={card}>
          <h2 style={heading}>QUÉ REQUIERE DEL FUNDADOR</h2>
          <p style={paragraph}>Nada adicional para continuar programando el núcleo.</p>
          <p style={paragraph}>Para constituir criterio institucional sí se necesitan decisiones reales: momentos donde corregiste una inferencia, rechazaste una conclusión, exigiste evidencia o reservaste una decisión. El campo nacional permite además acumular casos externos sin depender de que el fundador falle.</p>
          <p style={paragraph}>Cada registro entra como candidato. No se convierte automáticamente en regla canónica.</p>
        </article>

        <article style={card}>
          <h2 style={heading}>REGISTRAR UNA CORRECCIÓN REAL</h2>
          <p style={paragraph}>Usa este formulario cuando una ejecución, análisis o respuesta te obligue a corregir el criterio. Describe el caso y la regla que debería sobrevivir a ese caso particular.</p>
          {state.implementation.databaseReady ? <FounderDecisionCandidateForm /> : <p style={{ color: '#d0a58e', fontSize: 11, lineHeight: 1.65 }}>La persistencia del Cognitive Twin todavía no está disponible en esta base de datos. El formulario se habilitará después de aplicar su migración.</p>}
        </article>
      </section>

      <section style={{ ...card, marginTop: 12 }}>
        <h2 style={heading}>MODELOS DISPONIBLES EN ESTE DESPLIEGUE</h2>
        <p style={muted}>Configurado no significa ejecutado ni aprobado. La autorización depende de ejecución observable y evaluaciones persistidas.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 8, marginTop: 12 }}>
          {state.providers.map((provider) => (
            <div key={provider.id} style={{ border: '1px solid #29251b', padding: 12, display: 'grid', gap: 5 }}>
              <strong>{provider.id.toUpperCase()}</strong>
              <span style={{ color: provider.available ? '#8fba92' : '#8c8172' }}>{provider.available ? 'CONFIGURADO' : 'NO CONFIGURADO'}</span>
              <span style={muted}>{provider.model}</span>
              <span style={muted}>{provider.role}</span>
            </div>
          ))}
        </div>
        {!configured.length ? <p style={{ color: '#d0a58e' }}>No hay ningún proveedor LLM configurado en este runtime. El contrato y la memoria pueden existir, pero no habrá ejecución cognitiva por modelo.</p> : null}
        {configured.length && !state.implementation.providerExecutionObserved ? <p style={{ color: '#d0a58e' }}>Hay proveedor configurado, pero todavía no existe una ejecución reciente no degradada que permita declararlo operativo.</p> : null}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12, marginTop: 12 }}>
        <article style={card}>
          <h2 style={heading}>DECISIONES RECIENTES</h2>
          {state.recentDecisions.length ? state.recentDecisions.map((decision: any) => <div key={decision.id} style={item}><strong>{decision.decision_id}</strong><span style={muted}>{decision.general_rule}</span><HumanReadableRecord value={decision} title="Detalle" maxFields={10} /></div>) : <p style={muted}>Todavía no existe un corpus persistido. No se mostrarán ejemplos inventados.</p>}
        </article>
        <article style={card}>
          <h2 style={heading}>EVALUACIONES RECIENTES</h2>
          {state.recentEvaluations.length ? state.recentEvaluations.map((evaluation: any) => <div key={evaluation.id} style={item}><strong>{evaluation.provider}/{evaluation.model}</strong><span style={muted}>{evaluation.test_key} · {evaluation.outcome}</span><HumanReadableRecord value={evaluation} title="Resultado" maxFields={10} /></div>) : <p style={muted}>Aún no hay evaluaciones persistidas de modelos.</p>}
        </article>
        <article style={card}>
          <h2 style={heading}>EJECUCIONES RECIENTES</h2>
          {state.recentRuns.length ? state.recentRuns.map((run: any) => <div key={run.id} style={item}><strong>{run.task_id}</strong><span style={muted}>{run.role} · {run.status}</span><HumanReadableRecord value={run} title="Qué ocurrió" maxFields={10} /></div>) : <p style={muted}>Todavía no hay runs del Cognitive Twin. La ausencia se conserva como ausencia.</p>}
        </article>
      </section>

      <section style={{ ...card, marginTop: 12 }}>
        <HumanReadableRecord value={state.contract} title="Contrato institucional del Cognitive Twin" />
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,.8fr) minmax(0,1.2fr)', gap: 12, borderTop: '1px solid #211e17', paddingTop: 8 }}><dt style={muted}>{label}</dt><dd style={{ margin: 0 }}>{value}</dd></div>;
}

const card = { border: '1px solid #29251b', background: '#0d0c09', padding: 16 } as const;
const eyebrow = { color: '#8f8878', fontSize: 10, letterSpacing: '.12em' } as const;
const big = { display: 'block', color: '#d8c488', fontSize: 20, margin: '7px 0' } as const;
const muted = { color: '#8f8878', fontSize: 11, lineHeight: 1.55 } as const;
const heading = { margin: '0 0 12px', color: '#bba365', fontSize: 12, letterSpacing: '.14em' } as const;
const paragraph = { color: '#b5ad9c', fontSize: 12, lineHeight: 1.75 } as const;
const item = { borderTop: '1px solid #211e17', paddingTop: 10, marginTop: 10, display: 'grid', gap: 6 } as const;
