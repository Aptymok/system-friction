import Link from 'next/link';
import type { CSSProperties } from 'react';
import { redirect } from 'next/navigation';
import { getStudioObjectFeatures, listStudioObjects } from '@/lib/studio/production/studioProductionRepository';
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

export default async function StudioPage({ searchParams }: { searchParams?: Promise<{ objectId?: string | string[] }> }) {
  const { user, profile } = await requireSfiMemberPage('/studio');
  const moduleAccess = record(record(profile).module_access);
  if (moduleAccess.studio !== true) redirect('/unauthorized');

  const params = searchParams ? await searchParams : {};
  const requested = typeof params.objectId === 'string' && params.objectId.trim() ? params.objectId.trim() : null;
  const objectsResult = await listStudioObjects(user.id);
  const objects = objectsResult.ok ? objectsResult.data : [];
  const activeId = requested ?? text(objects[0]?.id, '');
  const activeResult = activeId ? await getStudioObjectFeatures(activeId, user.id) : null;
  const active = activeResult?.ok ? activeResult.data.object : null;
  const features = activeResult?.ok ? activeResult.data.features : [];

  return (
    <main style={{ minHeight: '100vh', color: '#f2f5f6', background: 'radial-gradient(circle at 72% 18%, rgba(33,112,164,.16), transparent 34%), radial-gradient(circle at 18% 76%, rgba(77,180,255,.08), transparent 32%), #040505', fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .22, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

      <header style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 18, alignItems: 'center', padding: '22px clamp(18px,4vw,58px)', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
        <Link href="/field" style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '.18em', textDecoration: 'none' }}>SFI.</Link>
        <span style={{ color: '#7fc8f5', fontSize: 11, letterSpacing: '.18em' }}>STUDIO · PRIVATE PRODUCER FIELD</span>
        <span style={{ marginLeft: 'auto', color: '#91a0a8', fontSize: 11 }}>{user.email ?? user.id}</span>
        <Link href="/logout" style={{ ...action, minHeight: 30 }}>Cerrar sesión</Link>
      </header>

      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(38px,6vw,78px) clamp(18px,4vw,58px) 26px', maxWidth: 1540, margin: '0 auto' }}>
        <div style={{ maxWidth: 920 }}>
          <div style={{ color: '#69bdea', fontSize: 11, letterSpacing: '.2em', marginBottom: 12 }}>AUTHENTICATED · OWNER-SCOPED</div>
          <h1 style={{ fontSize: 'clamp(34px,6vw,78px)', fontWeight: 300, lineHeight: .94, letterSpacing: '-.055em', margin: 0 }}>Studio no es ROOT.</h1>
          <p style={{ maxWidth: 800, margin: '20px 0 0', color: '#a7b0b6', lineHeight: 1.7, fontSize: 14 }}>
            Esta superficie opera únicamente sobre los objetos cuyo ownership pertenece a la identidad autenticada. Leer, analizar y producir evidencia aquí no concede promoción canónica, ejecución ROOT ni autoridad sobre otros nodos.
          </p>
        </div>
      </section>

      <section style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(280px,.72fr) minmax(0,1.28fr)', gap: 18, padding: '18px clamp(18px,4vw,58px) 70px', maxWidth: 1540, margin: '0 auto' }}>
        <aside style={{ ...panel, minHeight: 520 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.09)' }}>
            <div style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.19em' }}>OWNED OBJECTS</div>
            <div style={{ marginTop: 8, color: '#f7fafb', fontSize: 22 }}>{objects.length}</div>
          </div>

          <div style={{ display: 'grid' }}>
            {objects.map((object) => {
              const id = text(object.id, '');
              const selected = id === activeId;
              return (
                <Link key={id} href={`/studio?objectId=${encodeURIComponent(id)}`} style={{ display: 'grid', gap: 6, padding: '17px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', background: selected ? 'rgba(66,158,213,.12)' : 'transparent', textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ color: selected ? '#9fdcff' : '#7096aa', fontSize: 10, letterSpacing: '.18em' }}>{scopeOf(object)}</span>
                  <strong style={{ fontSize: 14, fontWeight: 500 }}>{text(object.title, 'Sin título')}</strong>
                  <span style={{ color: '#7f898f', fontSize: 11 }}>{text(object.object_type)} · {text(object.status)} · {formatBytes(object.size_bytes)}</span>
                </Link>
              );
            })}
            {!objects.length && (
              <div style={{ padding: 22, color: '#8e989e', lineHeight: 1.6 }}>
                No existen objetos Studio asignados a esta identidad.
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
                  <h2 style={{ margin: '10px 0 8px', fontSize: 'clamp(25px,3vw,44px)', fontWeight: 350, letterSpacing: '-.035em' }}>{text(active.title, 'Sin título')}</h2>
                  <div style={{ color: '#88949b', fontSize: 12 }}>{text(active.object_type)} · {text(active.mime_type)} · {formatBytes(active.size_bytes)} · {text(active.status)}</div>
                </div>
                <form action={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/analyze`} method="post" target="_blank">
                  <button type="submit" style={action}>Analizar ahora</button>
                </form>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/content`} target="_blank" rel="noreferrer" style={action}>Contenido</a>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/features`} target="_blank" rel="noreferrer" style={action}>Features</a>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/evidence`} target="_blank" rel="noreferrer" style={action}>Evidencia</a>
                <a href={`/api/studio/objects/${encodeURIComponent(text(active.id, ''))}/cognitive`} target="_blank" rel="noreferrer" style={action}>Cognitive state</a>
              </div>

              <div style={{ marginTop: 34, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                  <span style={{ color: '#7fc8f5', fontSize: 10, letterSpacing: '.19em' }}>OBSERVED FEATURES</span>
                  <span style={{ color: '#768087', fontSize: 11 }}>{features.length} persistidas</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 8 }}>
                  {features.slice(0, 18).map((feature, index) => (
                    <div key={text(feature.id, String(index))} style={{ padding: '13px 14px', border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.018)' }}>
                      <div style={{ color: '#84939c', fontSize: 9, letterSpacing: '.12em' }}>{text(feature.feature_key, text(feature.label, 'FEATURE'))}</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{displayValue(feature.numeric_value, displayValue(feature.text_value, displayValue(feature.value, 'persistida')))} {text(feature.unit, '')}</div>
                    </div>
                  ))}
                  {!features.length && <div style={{ color: '#7f898f', fontSize: 12 }}>Sin features persistidas todavía. El objeto sigue siendo operable.</div>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#8e989e', lineHeight: 1.7 }}>
              Selecciona un objeto propio. Esta superficie no consulta `/api/root/cognitive-runtime` ni intenta convertir permisos Studio en privilegios ROOT.
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
