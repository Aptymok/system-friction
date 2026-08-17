'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Certificate = {
  certificate_id: string;
  program_id: string;
  object_id: string;
  trace_id: string;
  platform: string;
  state: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  external_url?: string | null;
  canonical_url: string;
  asset_sha256: string;
  record_digest: string;
};

type Workspace = {
  schemaReady: boolean;
  warnings: string[];
  certificates: Certificate[];
};

const emptyCreate = {
  certificateId: '',
  programId: 'SFI-KXTXR-RETURN-001',
  objectId: 'KXTXR',
  traceId: '',
  parentTraceId: '',
  platform: 'instagram',
  scheduledAt: '',
  assetSha256: '',
  payloadSha256: '',
  watermarkScheme: 'SFI_DUAL_LAYER_V1',
  watermarkToken: '',
  notes: '',
};

async function mutate(intent: string, payload: Record<string, unknown>) {
  const response = await fetch('/api/root/returns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intent, payload }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error ?? 'return_mutation_failed');
  return body;
}

export function RootReturnCertificates() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [publishId, setPublishId] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/root/returns', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error(body.error ?? 'return_read_failed');
    setWorkspace(body.data);
  }, []);

  useEffect(() => { refresh().catch((reason) => setError(String(reason))); }, [refresh]);

  const prepared = useMemo(
    () => workspace?.certificates.filter((item) => item.state === 'prepared') ?? [],
    [workspace],
  );

  async function createCertificate() {
    setBusy(true); setError('');
    try {
      await mutate('create', {
        ...createForm,
        scheduledAt: createForm.scheduledAt ? new Date(createForm.scheduledAt).toISOString() : null,
        watermarkVerification: { status: 'PRE_PUBLICATION_QA_ONLY' },
      });
      setCreateForm(emptyCreate);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  async function attachPublication() {
    setBusy(true); setError('');
    try {
      await mutate('publish', { certificateId: publishId, externalUrl });
      setExternalUrl('');
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  async function verifyCertificate(certificateId: string) {
    setBusy(true); setError('');
    try {
      await mutate('verify', { certificateId });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 text-[#e8e2d5] md:px-8">
      <header className="border-b border-white/10 pb-7">
        <p className="font-mono text-[9px] tracking-[0.2em] text-[#75aaa9]">ROOT · PUBLIC RETURN REGISTRY</p>
        <h1 className="mt-4 font-serif text-4xl tracking-[-0.04em] md:text-6xl">Return Certificates</h1>
        <p className="mt-4 max-w-3xl font-serif text-sm leading-7 text-[#9f998e]">Register the asset before distribution. After Instagram/TikTok creates the external permalink, attach that URL here. Only then can the public certificate move from PREPARED to PUBLISHED and later VERIFIED.</p>
      </header>

      {error ? <div className="mt-6 border border-[#a94c3b66] bg-[#a94c3b12] p-4 font-mono text-xs text-[#d99180]">{error}</div> : null}
      {workspace?.warnings?.length ? <div className="mt-6 border border-[#c8a76455] p-4 font-mono text-xs text-[#c8a764]">{workspace.warnings.join(' · ')}</div> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-black/20 p-5">
          <p className="font-mono text-[9px] tracking-[0.18em] text-[#75aaa9]">01 / PRE-REGISTER</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Object.entries(createForm).map(([key, value]) => {
              if (key === 'platform') {
                return <label key={key} className="font-mono text-[8px] text-[#817b70]">PLATFORM<select className="mt-2 w-full border border-white/10 bg-[#070806] p-3 text-[#e8e2d5]" value={value} onChange={(event) => setCreateForm((current) => ({ ...current, platform: event.target.value }))}><option>instagram</option><option>tiktok</option><option>youtube</option><option>x</option><option>linkedin</option><option>medium</option><option>web</option></select></label>;
              }
              return <label key={key} className={`font-mono text-[8px] text-[#817b70] ${key === 'assetSha256' || key === 'payloadSha256' || key === 'notes' ? 'sm:col-span-2' : ''}`}>{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).toUpperCase()}<input type={key === 'scheduledAt' ? 'datetime-local' : 'text'} className="mt-2 w-full border border-white/10 bg-[#070806] p-3 text-[10px] text-[#e8e2d5]" value={value} onChange={(event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }))} /></label>;
            })}
          </div>
          <button disabled={busy} onClick={createCertificate} className="mt-5 border border-[#75aaa966] px-4 py-3 font-mono text-[9px] tracking-[0.14em] text-[#9bc4c3] disabled:opacity-40">CREATE PREPARED CERTIFICATE</button>
        </div>

        <div className="border border-white/10 bg-black/20 p-5">
          <p className="font-mono text-[9px] tracking-[0.18em] text-[#75aaa9]">02 / ATTACH EXTERNAL RETURN</p>
          <label className="mt-5 block font-mono text-[8px] text-[#817b70]">CERTIFICATE<select className="mt-2 w-full border border-white/10 bg-[#070806] p-3 text-[#e8e2d5]" value={publishId} onChange={(event) => setPublishId(event.target.value)}><option value="">Select prepared certificate</option>{prepared.map((item) => <option key={item.certificate_id} value={item.certificate_id}>{item.certificate_id} · {item.platform}</option>)}</select></label>
          <label className="mt-4 block font-mono text-[8px] text-[#817b70]">EXTERNAL PERMALINK<input className="mt-2 w-full border border-white/10 bg-[#070806] p-3 text-[10px] text-[#e8e2d5]" placeholder="https://www.instagram.com/reel/..." value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} /></label>
          <button disabled={busy || !publishId || !externalUrl} onClick={attachPublication} className="mt-5 border border-[#c8a76466] px-4 py-3 font-mono text-[9px] tracking-[0.14em] text-[#e5c77f] disabled:opacity-40">SEAL PUBLISHED RETURN</button>
        </div>
      </section>

      <section className="mt-8 border border-white/10">
        <div className="flex items-center justify-between border-b border-white/10 p-4"><span className="font-mono text-[9px] tracking-[0.18em] text-[#75aaa9]">03 / REGISTRY</span><button onClick={() => refresh().catch((reason) => setError(String(reason)))} className="font-mono text-[8px] text-[#817b70]">REFRESH</button></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse font-mono text-[9px]">
            <thead className="text-left text-[#716c62]"><tr><th className="p-3">CERTIFICATE</th><th>TRACE</th><th>PLATFORM</th><th>STATE</th><th>SCHEDULED</th><th>EXTERNAL</th><th>INTEGRITY</th><th>ACTION</th></tr></thead>
            <tbody>{workspace?.certificates.map((item) => <tr key={item.certificate_id} className="border-t border-white/5"><td className="p-3"><a className="text-[#e5c77f] underline" href={item.canonical_url} target="_blank" rel="noreferrer">{item.certificate_id}</a></td><td>{item.trace_id}</td><td>{item.platform}</td><td>{item.state.toUpperCase()}</td><td>{item.scheduled_at ?? '—'}</td><td>{item.external_url ? <a className="text-[#75aaa9] underline" href={item.external_url} target="_blank" rel="noreferrer">OPEN</a> : 'PENDING'}</td><td title={item.record_digest}>{item.record_digest.slice(0, 12)}…</td><td>{item.state === 'published' ? <button disabled={busy} onClick={() => verifyCertificate(item.certificate_id)} className="border border-white/10 px-2 py-1 text-[#d6d0c4]">VERIFY</button> : '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
