import Link from 'next/link';
import StudioFileIntake from '@/components/studio/StudioFileIntake';
import StudioMultiDocumentReader from '@/components/studio/StudioMultiDocumentReader';
import StudioDocumentWorkbench from '@/components/studio/StudioDocumentWorkbench';
import StudioAttractorExplorer from '@/components/studio/StudioAttractorExplorer';
import StudioCampaignDesk from '@/components/studio/StudioCampaignDesk';
import StudioReleaseSequencer from '@/components/studio/StudioReleaseSequencer';
import StudioFieldEditor from '@/components/studio/StudioFieldEditor';
import StudioLlmStatus from '@/components/studio/StudioLlmStatus';
import type { CSSProperties } from 'react';
import { redirect } from 'next/navigation';
import { getStudioObjectFeatures, listStudioObjects, listStudioSessions } from '@/lib/studio/production/studioProductionRepository';
import { requireSfiMemberPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, fallback = '—') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function displayValue(value: unknown, fallback = '—') {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return text(value, fallback);
}

function scopeOf(object: Row) {
  const metadata = record(object.metadata);
  const transfer = record(metadata.operationalOwnershipTransfer);
  const declaredScope = text(transfer.scope, '');
  if (declaredScope) return declaredScope;
  const title = text(object.title, 'OBJECT');
  return /111/i.test(title) ? '111' : /rem618/i.test(title) ? 'REM618' : title;
}

function formatBytes(value: unknown) {
  const bytes = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

const panel: CSSProperties = {
  border: '1px solid rgba(255,255,255,.14)',
  background: 'rgba(4,5,5,.72)',
  backdropFilter: 'blur(18px)',
  boxShadow: '0 24px 90px rgba(0,0,0,.34)',
};

const action: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 34,
  padding: '0 12px',
  border: '1px solid rgba(164,213,255,.3)',
  background: 'rgba(12,30,42,.52)',
  color: '#dff2ff',
  fontSize: 11,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  cursor: 'pointer',
};

const input: CSSProperties = {
  width: '100%',
  border: '1px solid rgba(255,255,255,.11)',
  background: 'rgba(255,255,255,.025)',
  color: '#eaf6fb',
  padding: '11px 12px',
  font: 'inherit',
  fontSize: 12,
  outline: 'none',
};

export default async function StudioPage({ searchParams }: { searchParams?: Promise<{ objectId?: string | string[] }> }) {
  const { user, profile } = await requireSfiMemberPage('/studio');
  const moduleAccess = record(record(profile).module_access);
  if (moduleAccess.studio !== true) redirect('/unauthorized');

  const params = searchParams ? await searchParams : {};
  const requested = typeof params.objectId === 'string' && params.objectId.trim() ? params.objectId.trim() : null;
  const [objectsResult,sessionsResult] = await Promise.all([listStudioObjects(user.id,{limit:100}),listStudioSessions(user.id)]);
  const objects = objectsResult.ok ? objectsResult.data : [];
  // Client receives only the field declaration needed for navigation; not
  // arbitrary session metadata, provider credentials or internal runtime state.
  const sessions = sessionsResult.ok ? sessionsResult.data.map(session => ({
    id:session.id,title:session.title,
    metadata:{field:record(session.metadata).field??null},
  })) : [];
  const activeId = requested ?? text(objects[0]?.id, '');
  const activeResult = activeId ? await getStudioObjectFeatures(activeId, user.id) : null;
  const active = activeResult?.ok ? activeResult.data.object : null;
  const features = activeResult?.ok ? activeResult.data.features : [];

  return (
    <main style={{ minHeight: '100vh', color: '#f2f5f6', background: 'radial-gradient(circle at 72% 18%, rgba(33,112,164,.16), transparent 34%), radial-gradient(circle at 18% 76%, rgba(77,180,255,.08), transparent 32%), #040505', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .22, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(38px,6vw,78px) clamp(18px,4vw,58px) 26px', maxWidth: 1540, margin: '0 auto' }}>
        <div style={{ maxWidth: 920 }}>
          <div style={{ color: '#9caeb9', fontSize: 12, letterSpacing: '.12em', marginBottom: 14 }}>SYSTEM FRICTION INSTITUTE / STUDIO</div>
          <h1 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 'clamp(38px,6vw,68px)', fontWeight: 650, lineHeight: 1.08, letterSpacing: '-.045em', margin: 0 }}>Tu obra. Un lugar para crearla y entenderla.</h1>
          <p style={{ maxWidth: 720, margin: '18px 0 26px', color: '#b6c6cd', lineHeight: 1.6, fontSize: 16 }}>
            Empieza con una canción. Analiza el audio, consulta lo que sabemos y trabaja en una versión.
            Las herramientas avanzadas quedan disponibles cuando las necesites.
          </p>
          <div style={{ padding: '18px 20px', border: '1px solid rgba(150,202,224,.25)', background: 'rgba(26,56,72,.27)', borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: '#b4cbd8', marginBottom: 6 }}>EMPIEZA AQUÍ</div>
            <h2 style={{ margin: 0, fontWeight: 550, fontSize: 23 }}>Elige una canción</h2>
            <p style={{ color: '#a7b7c0', fontSize: 13, lineHeight: 1.6, margin: '8px 0 0' }}>
              El análisis rápido funciona en tu navegador y no sube el audio a SFI.
              Para usar MIHM en producción y guardar evidencia, la obra debe estar registrada en Studio.
            </p>
            <StudioFileIntake />
          </div>
          <details style={{ marginTop: 24, border: '1px solid rgba(255,255,255,.13)', background: 'rgba(255,255,255,.025)', borderRadius: 12, padding: '16px 18px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>Herramientas de creación, investigación y publicación</summary>
            <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
              <p style={{ color: '#b6c6cd', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Espacio avanzado: documentos, atractores, campañas, edición y modelos. No necesitas abrirlo para empezar.
              </p>
              <StudioMultiDocumentReader />
              <StudioDocumentWorkbench />
              <StudioLlmStatus />
              <StudioFieldEditor objects={objects} sessions={sessions} />
              <StudioAttractorExplorer objects={objects} sessions={sessions} />
              <StudioCampaignDesk objects={objects} sessions={sessions} />
              <StudioReleaseSequencer objects={objects} sessions={sessions} />
            </div>
          </details>
        </div>
      </section>

      <section style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: 18, padding: '18px clamp(18px,4vw,58px) 70px', maxWidth: 1540, margin: '0 auto' }}>
        <aside style={{ ...panel, minHeight: 520 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
            <div style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.19em' }}>EXPEDIENTES GUARDADOS</div>
            <div style={{ marginTop: 8, color: '#f7fafb', fontSize: 22 }}>{objects.length}</div>
          </div>

          <div style={{ display: 'grid' }}>
            {objects.map((object) => {
              const id = text(object.id, '');
              const selected = id === activeId;
              return (
                <Link key={id} href={`/studio?objectId=${encodeURIComponent(id)}`} style={{ display: 'grid', gap: 6, padding: '17px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', background: selected ? 'rgba(66,158,213,.12)' : 'transparent', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ color: selected ? '#9fdcff' : '#7096aa', fontSize: 10, letterSpacing: '.18em' }}>{scopeOf(object)}</span>
                  <strong style={{ fontSize: 14, fontWeight: 500 }}>{text(object.title, 'Untitled')}</strong>
                  <span style={{ color: '#7f898f', fontSize: 11 }}>{text(object.object_type)} · {text(object.status)} · {formatBytes(object.size_bytes)}</span>
                </Link>
              );
            })}
            {!objects.length && (
              <div style={{ padding: 22, color: '#8e989e', lineHeight: 1.6 }}>
                Aún no hay obras guardadas. El análisis rápido del primer paso no las registra automáticamente.
              </div>
            )}
          </div>
        </aside>

        <article style={{ ...panel, minHeight: 520, padding: 'clamp(22px,3vw,38px)' }}>
          {active ? (
            <>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 420px' }}>
                  <div style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.19em' }}>{scopeOf(active)} · ACTIVE OBJECT</div>
                  <h2 style={{ margin: '10px 0 8px', fontSize: 'clamp(25px,3vw,44px)', fontWeight: 350, letterSpacing: '-.035em' }}>{text(active.title, 'Untitled')}</h2>
                  <div style={{ color: '#88949b', fontSize: 12 }}>{text(active.object_type)} · {text(active.mime_type)} · {formatBytes(active.size_bytes)} · {text(active.status)}</div>
                </div>
                <form action={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/analyze`} method="post" target="_blank">
                  <button type="submit" style={action}>ANALIZAR OBRA GUARDADA</button>
                </form>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/content`} target="_blank" rel="noreferrer" style={action}>Abrir archivo</a>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/features`} target="_blank" rel="noreferrer" style={action}>Mediciones</a>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/cognitive`} target="_blank" rel="noreferrer" style={action}>Estado del análisis</a>
              </div>

              <form action={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/evidence`} method="post" encType="multipart/form-data" target="_blank" style={{ marginTop: 24, padding: 16, border: '1px solid rgba(127,200,245,.15)', background: 'rgba(27,83,118,.055)' }}>
                <input type="hidden" name="evidenceType" value="operator_evidence" />
                <input type="hidden" name="sourceName" value="studio_owner_surface" />
                <div style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.17em', marginBottom: 10 }}>ADD EVIDENCE TO THIS OBJECT</div>
                <textarea name="text" required rows={3} placeholder="Observation, finding or verifiable return…" style={{ ...input, resize: 'vertical' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <input name="confidence" inputMode="decimal" placeholder="confidence 0–1" style={{ ...input, flex: '1 1 150px', width: 'auto' }} />
                  <input name="file" type="file" style={{ ...input, flex: '2 1 240px', width: 'auto' }} />
                  <button type="submit" style={action}>Persist evidence</button>
                </div>
              </form>

              <div style={{ marginTop: 34, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                  <span style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.19em' }}>MEDICIONES REGISTRADAS</span>
                  <span style={{ color: '#768087', fontSize: 11 }}>{features.length} persisted</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>
                  {features.slice(0, 18).map((feature, index) => (
                    <div key={text(feature.id, String(index))} style={{ padding: '13px 14px', border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.018)' }}>
                      <div style={{ color: '#84939c', fontSize: 9, letterSpacing: '.12em' }}>{text(feature.feature_key, text(feature.label, 'FEATURE'))}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{displayValue(feature.numeric_value, displayValue(feature.text_value, displayValue(feature.value, 'persisted')))} {text(feature.unit, '')}</div>
                    </div>
                  ))}
                  {!features.length && <div style={{ color: '#7f898f', fontSize: 12 }}>Todavía no hay mediciones guardadas de esta obra.</div>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#8e989e', lineHeight: 1.7 }}>
              Selecciona una obra guardada para consultar su expediente. El análisis local del primer paso no crea un expediente automáticamente.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
