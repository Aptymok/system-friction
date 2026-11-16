import { redirect } from 'next/navigation';
import { MethodLabNativeHub } from '@/components/sfi/MethodLabNativeHub';
import { LabCreateDialog } from '@/components/sfi/LabCreateDialog';
import { MethodLabResearchReview } from '@/components/sfi/MethodLabResearchReview';
import { readMethodLabResearchState } from '@/lib/method-lab/researchObjects';
import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
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
      <header className="sfi-lab-page-head"><small>METHOD LAB · ESPACIO PERSONAL</small><h1>Investigaciones y expedientes</h1><p>Consulta el trabajo registrado. El alta de experimentos es opcional.</p></header>
      <PersonalCognitiveLabWorkspace />
      <div className="sfi-lab-create-row"><LabCreateDialog label="Dar de alta un experimento"><MethodLabExperimentWorkbench /></LabCreateDialog></div>
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

  // Link only explicitly public canonical records; never project private Method Lab data into Repository.
  const publicRepositoryObjects = SFI_CANONICAL_OBJECT_REGISTRY
    .filter(record => canonicalPublicationDisposition(record).disposition === 'PUBLISH')
    .map(record => ({ id: record.id, slug: record.slug, title: record.title }));

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
      <header className="sfi-lab-page-head">
        <small>METHOD LAB · SFI RESEARCH</small>
        <h1>Biblioteca de investigaciones</h1>
        <p>Selecciona una investigación para examinar hallazgos, fuentes, procedencia y límites documentales. La creación de nuevas investigaciones no es necesaria para leer.</p>
        <div className="sfi-lab-page-facts"><span>{research.objects.length} objetos en registro</span><span>{evidence.options.length} referencias del inventario consultado</span><span>{research.warnings.length} advertencias</span></div>
      </header>
      <MethodLabResearchReview research={research} evidenceInventory={evidence.options} publicRepositoryObjects={publicRepositoryObjects} />
      <div className="sfi-lab-create-row">
        <LabCreateDialog label="Iniciar una investigación">
          <PersonalCognitiveLabWorkspace intakeOnly />
        </LabCreateDialog>
      </div>
      <details style={{maxWidth:1500,margin:'18px auto',padding:'14px 20px',border:'1px solid rgba(104,170,230,.15)',borderRadius:12,color:'#e7edf0'}}>
        <summary style={{cursor:'pointer'}}>Inventario operativo de evidencias</summary>
        <InstitutionalEvidenceInventory inventory={inventory} context="METHOD_LAB" />
      </details>

      <details className="sfi-lab-operations">
        <summary>Operación avanzada · protocolos, sesiones, hipótesis y registros</summary>
        <MethodLabNativeHub
        initialState={state}
        initialSessions={sessionViews}
        evidenceOptions={evidence.options}
        evidenceWarnings={evidence.warnings}
      />
      {conditional.model ? <HypothesisConditionalLab model={conditional.model} context="METHOD_LAB" />
        : <section role="status">Hypothesis conditional laboratory unavailable: {conditional.error}. No conditional branches have been inferred.</section>}
      </details>
      <details className="sfi-lab-operations">
        <summary>Diagnóstico MIHM · observación y estado de registros</summary>
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
      </details>
    </>
  );
}
