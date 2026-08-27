'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import './OAuthIntegrationsSurface.css';

type OAuthClient = {
  client_id: string;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  audience: string;
  status: string;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ListResponse = {
  ok: boolean;
  clients?: OAuthClient[];
  scopeCeiling?: string[];
  error?: string;
};

type MutationResponse = {
  ok: boolean;
  client?: OAuthClient;
  clientSecret?: string | null;
  error?: string;
};

type Disclosure = {
  client: OAuthClient;
  clientSecret: string;
};

function extractRedirectUri(raw: string) {
  const value = raw.trim();
  if (!value) throw new Error('Pega la Callback URL o la URL larga de autorización que te muestra ChatGPT.');
  const parsed = new URL(value);
  const embedded = parsed.searchParams.get('redirect_uri');
  return embedded ? new URL(embedded).toString() : parsed.toString();
}

function prettyDate(value?: string | null) {
  if (!value) return 'NUNCA';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function configText(client: OAuthClient, secret: string, origin: string) {
  return [
    'Authentication: OAuth',
    `Client ID: ${client.client_id}`,
    `Client Secret: ${secret}`,
    `Authorization URL: ${origin}/api/oauth/authorize`,
    `Token URL: ${origin}/api/oauth/token`,
    `Scope: ${client.allowed_scopes.join(' ')}`,
    'Token exchange method: Basic Authorization Header',
    `Schema URL: ${origin}/api/external/openapi`,
  ].join('\n');
}

export function OAuthIntegrationsSurface() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [scopeCeiling, setScopeCeiling] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [callbackInput, setCallbackInput] = useState('');
  const [name, setName] = useState('SFI GPT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingCallback, setEditingCallback] = useState('');

  const origin = useMemo(() => typeof window === 'undefined' ? '' : window.location.origin, []);

  async function reload() {
    const response = await fetch('/api/oauth/clients', { cache: 'no-store' });
    const payload = await response.json() as ListResponse;
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo leer el registro OAuth.');
    const ceiling = payload.scopeCeiling || [];
    setClients(payload.clients || []);
    setScopeCeiling(ceiling);
    setSelectedScopes((current) => current.length ? current.filter((scope) => ceiling.includes(scope)) : ceiling);
  }

  useEffect(() => {
    reload().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  function toggleScope(scope: string) {
    setSelectedScopes((current) => current.includes(scope)
      ? current.filter((item) => item !== scope)
      : [...current, scope]);
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    setDisclosure(null);
    try {
      const redirectUri = extractRedirectUri(callbackInput);
      const response = await fetch('/api/oauth/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operation: 'create',
          name,
          redirectUris: [redirectUri],
          scopes: selectedScopes,
        }),
      });
      const payload = await response.json() as MutationResponse;
      if (!response.ok || !payload.ok || !payload.client || !payload.clientSecret) {
        throw new Error(payload.error || 'No se pudo registrar la integración.');
      }
      setDisclosure({ client: payload.client, clientSecret: payload.clientSecret });
      setNotice('Integración registrada. El Client Secret se muestra una sola vez.');
      setCallbackInput('');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function updateCallback(clientId: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const redirectUri = extractRedirectUri(editingCallback);
      const response = await fetch('/api/oauth/clients', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId, redirectUris: [redirectUri] }),
      });
      const payload = await response.json() as MutationResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo actualizar la callback.');
      setEditingClient(null);
      setEditingCallback('');
      setNotice('Callback actualizada sin tocar Vercel ni redeployar SFI.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function rotateSecret(clientId: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/oauth/clients', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId, rotateSecret: true }),
      });
      const payload = await response.json() as MutationResponse;
      if (!response.ok || !payload.ok || !payload.client || !payload.clientSecret) {
        throw new Error(payload.error || 'No se pudo rotar el secreto.');
      }
      setDisclosure({ client: payload.client, clientSecret: payload.clientSecret });
      setNotice('Client Secret rotado. Sustituye el anterior en el GPT; este valor se muestra una sola vez.');
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(clientId: string) {
    if (!window.confirm('¿Revocar esta integración? El GPT dejará de autenticarse inmediatamente.')) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/oauth/clients?client_id=${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      const payload = await response.json() as MutationResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'No se pudo revocar la integración.');
      setNotice('Integración revocada.');
      if (disclosure?.client.client_id === clientId) setDisclosure(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice('Copiado.');
  }

  return (
    <main className="oauthIntegrations">
      <header className="oauthIntegrationsHeader">
        <div className="oauthIntegrationsSigil">SFI.</div>
        <div>
          <span>ACCOUNT · EXTERNAL INTEGRATIONS</span>
          <h1>Conectar GPT / agente</h1>
          <p>La cuenta SFI registra la integración. No se editan variables de Vercel ni tablas manualmente.</p>
        </div>
        <a href="/root">VOLVER</a>
      </header>

      <section className="oauthIntegrationsGrid">
        <form className="oauthPanel" onSubmit={createClient}>
          <span className="oauthKicker">NUEVA INTEGRACIÓN</span>
          <h2>1 gesto manual: pega la callback</h2>
          <p className="oauthMuted">Puedes pegar la Callback URL directamente o la URL larga de autorización que devuelve ChatGPT. SFI extrae <code>redirect_uri</code> automáticamente.</p>

          <label>
            NOMBRE
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="SFI GPT" required />
          </label>
          <label>
            CALLBACK / AUTHORIZATION URL
            <textarea value={callbackInput} onChange={(event) => setCallbackInput(event.target.value)} placeholder="https://chatgpt.com/.../oauth/callback o https://.../authorize?...&redirect_uri=..." required />
          </label>

          <div className="oauthScopeBlock">
            <b>SCOPES</b>
            <div className="oauthScopes">
              {scopeCeiling.map((scope) => (
                <label key={scope} className="oauthScope">
                  <input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="oauthPrimary" disabled={busy || !selectedScopes.length}>{busy ? 'PROCESANDO…' : 'REGISTRAR Y GENERAR CONFIGURACIÓN'}</button>
          <small>Los scopes nunca pueden superar la autoridad de tu cuenta SFI. Las callbacks siguen usando coincidencia exacta.</small>
        </form>

        <section className="oauthPanel">
          <span className="oauthKicker">CONFIGURACIÓN GENERADA</span>
          {disclosure ? (
            <>
              <h2>Copiar al editor del GPT</h2>
              <div className="oauthSecretWarning">CLIENT SECRET · ONE TIME ONLY</div>
              <pre>{configText(disclosure.client, disclosure.clientSecret, origin)}</pre>
              <div className="oauthActions">
                <button type="button" onClick={() => copy(configText(disclosure.client, disclosure.clientSecret, origin))}>COPIAR TODO</button>
                <button type="button" onClick={() => copy(disclosure.client.client_id)}>COPIAR CLIENT ID</button>
                <button type="button" onClick={() => copy(disclosure.clientSecret)}>COPIAR SECRET</button>
              </div>
            </>
          ) : (
            <>
              <h2>Sin configuración pendiente</h2>
              <p className="oauthMuted">Al registrar o rotar una integración, el secreto aparecerá aquí una sola vez. SFI persiste únicamente su hash.</p>
              <dl className="oauthContract">
                <dt>AUTH</dt><dd>OAuth Authorization Code</dd>
                <dt>SCHEMA</dt><dd>{origin ? `${origin}/api/external/openapi` : '/api/external/openapi'}</dd>
                <dt>CALLBACK</dt><dd>Exact match</dd>
                <dt>OWNER</dt><dd>Authenticated SFI account</dd>
              </dl>
            </>
          )}
        </section>
      </section>

      {(error || notice) && <div className={`oauthMessage ${error ? 'error' : ''}`}>{error || notice}</div>}

      <section className="oauthPanel oauthExisting">
        <span className="oauthKicker">REGISTRO PERSISTENTE</span>
        <h2>Integraciones de esta cuenta</h2>
        {!clients.length && <p className="oauthMuted">No hay clientes OAuth registrados.</p>}
        <div className="oauthClientList">
          {clients.map((client) => (
            <article key={client.client_id} className="oauthClientCard">
              <div className="oauthClientHead">
                <div><strong>{client.name}</strong><code>{client.client_id}</code></div>
                <span>{client.status}</span>
              </div>
              <dl className="oauthContract">
                <dt>AUDIENCE</dt><dd>{client.audience}</dd>
                <dt>CALLBACK</dt><dd>{client.redirect_uris.join(', ')}</dd>
                <dt>SCOPES</dt><dd>{client.allowed_scopes.join(' ')}</dd>
                <dt>LAST USE</dt><dd>{prettyDate(client.last_used_at)}</dd>
              </dl>
              {editingClient === client.client_id && (
                <div className="oauthInlineEdit">
                  <textarea value={editingCallback} onChange={(event) => setEditingCallback(event.target.value)} placeholder="Nueva callback o URL larga de autorización" />
                  <button type="button" onClick={() => updateCallback(client.client_id)} disabled={busy}>GUARDAR CALLBACK</button>
                  <button type="button" onClick={() => setEditingClient(null)}>CANCELAR</button>
                </div>
              )}
              <div className="oauthActions">
                <button type="button" onClick={() => { setEditingClient(client.client_id); setEditingCallback(client.redirect_uris[0] || ''); }}>CAMBIAR CALLBACK</button>
                <button type="button" onClick={() => rotateSecret(client.client_id)} disabled={busy}>ROTAR SECRET</button>
                <button type="button" className="danger" onClick={() => revoke(client.client_id)} disabled={busy}>REVOCAR</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
