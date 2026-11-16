import { redirect } from 'next/navigation';
import { MethodLabNativeHub } from '@/components/sfi/MethodLabNativeHub';
import { MethodLabResearchReview } from '@/components/sfi/MethodLabResearchReview';
import { readMethodLabResearchState } from '@/lib/method-lab/researchObjects';
import { PersonalCognitiveLabWorkspace } from '@/components/sfi/PersonalCognitiveLabWorkspace';
import { MethodLabExperimentWorkbench } from '@/components/sfi/MethodLabExperimentWorkbench';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readMihmOperationalShadow, readMihmRegistryInventory } from '@/lib/mihm/operationalShadowRead';
import { readHypothesisConditionalBranches } from '@/lib/world-observatory/hypothesisConditionalBranches';
import { HypothesisConditionalLab } from '@/components/sfi/HypothesisConditionalLab';
import { readMethodLabEvidenceOptions } from '@/lib/method-lab/readHubEvidence';
import { readInstitutionalEvidenceInventory } from '@/lib/evidence/readInstitutionalEvidenceInventory';
import { InstitutionalEvidenceInventory } from '@/components/sfi/InstitutionalEvidenceInventory';
import { getCognitiveLabSession, listCognitiveLabSessions } from '@/lib/cognitive-lab/service';
import { requireRootObserverPage } from '@/lib/root/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export default async function MethodLabPage() {
  let account: Awaited<ReturnType<typeof requireUserProfile>>;
  try {
    account = await requireUserProfile();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) redirect('/login?next=%2Fmethod-lab');
    redirect('/unauthorized');
  }

  const role = String(account.profile.role || '').toLowerCase();
  const institutional = Boolean(account.member) || role === 'root' || role === 'system';

  if (!institutional) return (
    <>
      <PersonalCognitiveLabWorkspace />
      <MethodLabExperimentWorkbench />
    </>
  );

  const observer = await requireRootObserverPage('/method-lab');
  const mihmShadow = observer.isRoot
    ? await readMihmOperationalShadow().catch(() => ({
        ok: false as const,
        status: 'SOURCE_UNAVAILABLE' as const,
        observations: [],
      }))
    : null;
  const mihmRegistries = observer.isRoot
    ? await readMihmRegistryInventory().catch(() => null)
    : null;

  const [state, sessions, evidence, conditional, inventory, research] = await Promise.all([
    readMethodLabState(),
    listCognitiveLabSessions(18),
    readMethodLabEvidenceOptions(120),
    readHypothesisConditionalBranches().then(model=>({model,error:null})).catch(error=>({model:null,error:error instanceof Error?error.message:'CONDITIONAL_HYPOTHESIS_READ_FAILED'})),
    readInstitutionalEvidenceInventory(12),
    readMethodLabResearchState(),
  ]);

  const sessionViews = await Promise.all((sessions as Row[]).map(async (session) => {
    const id = text(session.id);
    let eventCount = 0;
    let analysisCount = 0;
    if (id) {
      try {
        const detail = await getCognitiveLabSession(id);
        eventCount = detail.events.length;
        analysisCount = detail.analyses.length;
      } catch {
        // A degraded detail read must not hide the session from the Lab.
      }
    }
    return {
      id,
      sessionKey: text(session.session_key),
      title: text(session.title),
      objective: text(session.objective),
      condition: text(session.condition),
      status: text(session.status),
      startedAt: text(session.started_at) || null,
      endedAt: text(session.ended_at) || null,
      eventCount,
      analysisCount,
    };
  }));

  return (
    <>
      {mihmShadow ? (
        <section aria-label="MIHM operational shadow audit" className="mlh-section">
          <header className="mlh-section-head">
            <h2>MIHM · Observación operativa real</h2>
          </header>
          <p>
            Estado: <strong>{mihmShadow.status}</strong>. Fuente: registro institucional de eventos.
            La consulta es de sólo lectura y no dispara propuestas ni predicciones.
          </p>
          {mihmShadow.observations.length === 0 ? (
            <p>{mihmShadow.ok
              ? 'No existen observaciones de este contrato en el registro consultado. No se declara éxito operativo.'
              : 'No fue posible consultar el registro institucional; no se infiere ausencia de eventos.'}</p>
          ) : (
            <ul>
              {mihmShadow.observations.map((item) => (
                <li key={item.eventId}>
                  <strong>{item.readback}</strong>
                  {' · '}Evento {item.eventId}
                  {' · '}Fecha {item.occurredAt ?? 'desconocida'}
                  {' · '}Procesadas {item.processed ?? 'desconocido'}
                  {' · '}Etapas {item.stages.map((stage) => stage.stage ?? 'desconocida').join(', ') || 'sin resultado'}
                </li>
              ))}
            </ul>
          )}
          {mihmRegistries ? (
            <div>
              <h3>Registros institucionales reales</h3>
              <ul>
                {mihmRegistries.counts.map((entry) => (
                  <li key={entry.table}>
                    {entry.table}: {entry.status === 'OBSERVED' ? entry.count : 'DESCONOCIDO'}
                  </li>
                ))}
              </ul>
              <p>La existencia de tablas o registros no certifica eficacia, causalidad ni validación empírica.</p>
            </div>
          ) : null}
          <p>Alcance: últimas 25 observaciones. No certifica una predicción prospectiva, contrafactual ni resultado independiente.</p>
        </section>
      ) : null}
      <MethodLabResearchReview research={research} />
      <details id="lab-new-investigation" style={{maxWidth:1180,margin:'18px auto',padding:'14px 20px',border:'1px solid rgba(104,170,230,.26)',borderRadius:12,color:'#e7edf0',background:'#08111a'}}>
        <summary style={{cursor:'pointer',fontWeight:600}}>Iniciar una nueva investigación · opcional</summary>
        <p style={{fontSize:13,opacity:.74}}>Este formulario es exclusivamente para formular una investigación nueva. Puedes consultar los trabajos existentes sin completarlo.</p>
        <PersonalCognitiveLabWorkspace intakeOnly />
      </details>
      <details style={{maxWidth:1500,margin:'18px auto',padding:'14px 20px',border:'1px solid rgba(104,170,230,.15)',borderRadius:12,color:'#e7edf0'}}>
        <summary style={{cursor:'pointer'}}>Inventario operativo de evidencias</summary>
        <InstitutionalEvidenceInventory inventory={inventory} context="METHOD_LAB" />
      </details>
      <MethodLabNativeHub
        initialState={state}
        initialSessions={sessionViews}
        evidenceOptions={evidence.options}
        evidenceWarnings={evidence.warnings}
      />
      {conditional.model ? <HypothesisConditionalLab model={conditional.model} context="METHOD_LAB" />
        : <section role="status">Hypothesis conditional laboratory unavailable: {conditional.error}. No conditional branches have been inferred.</section>}
    </>
  );
}
