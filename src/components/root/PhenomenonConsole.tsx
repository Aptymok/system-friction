'use client';

import { useCallback, useState } from 'react';

import type { PhenomenonState } from '@/lib/ppoi/ppoiTypes';

import {
  construirTimeline,
  explicarComposite,
  explicarDireccion,
  explicarEstado,
  explicarIndices,
  sugerirProximaObservacion,
} from '@/lib/ppoi/plainLanguage';

import './phenomenon-console.css';

type LinkedEvidenceItem = {
  linkId: string;
  relationType: string;
  note: string | null;
  linkedAt: string;
  evidence: Record<string, unknown> | null;
};

type ObservedHypothesisItem = {
  fuente: 'PPOI' | 'STUDIO' | 'CULTURAL';
  disponible: boolean;
  razonNoDisponible?: string;
  items: Array<{
    id: string;
    resumen: string;
    detalle: string | null;
    severidadOAccion: string | null;
    creadaEn: string | null;
  }>;
};

type HypothesisView = {
  phenomenonId: string;
  relatedStudioObjectId: string | null;
  observadores: ObservedHypothesisItem[];
} | null;

type Props = {
  state: PhenomenonState;
  linkedEvidence?: LinkedEvidenceItem[];
  hypothesisView?: HypothesisView;
};

export default function PhenomenonConsole({ state: initialState, linkedEvidence: initialLinked = [], hypothesisView: initialHypothesisView = null }: Props) {
  const [state, setState] = useState<PhenomenonState>(initialState);
  const [linkedEvidence, setLinkedEvidence] = useState<LinkedEvidenceItem[]>(initialLinked);
  const [hypothesisView, setHypothesisView] = useState<HypothesisView>(initialHypothesisView);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phenomenon = state.phenomenon;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${phenomenon.id}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'PHENOMENON_REFRESH_FAILED');
      }
      setState({
        phenomenon: data.phenomenon,
        evidence: data.evidence ?? [],
        currentHypothesis: data.currentHypothesis ?? null,
      });
      setLinkedEvidence(data.linkedEvidence ?? []);
      setHypothesisView(data.hypothesisView ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  }, [phenomenon.id]);

  async function recalibrate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${phenomenon.id}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'RECALIBRATION_FAILED');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  }

  const indicesExplicados = explicarIndices(phenomenon.current_indices ?? {});
  const composite = explicarComposite(phenomenon.current_composite);
  const timeline = construirTimeline(state.evidence);
  const hypothesis = state.currentHypothesis as Record<string, unknown> | null;
  const proximaObservacion = sugerirProximaObservacion(
    phenomenon.current_indices ?? {},
    state.evidence.length,
  );

  return (
    <main className="pc-root">
      <header className="pc-header">
        <span>OBSERVADOR DE FENÓMENO</span>
        <h1>{phenomenon.name}</h1>
        <p>{explicarEstado(phenomenon.status)}</p>
      </header>

      <div className="pc-grid">
        {/* IDENTIDAD */}
        <section className="pc-card">
          <h2>Identidad</h2>
          <dl className="pc-dl">
            <div><dt>Nombre</dt><dd>{phenomenon.name}</dd></div>
            <div><dt>Código</dt><dd>{phenomenon.fp_code ?? '—'}</dd></div>
            <div><dt>Estado</dt><dd>{explicarEstado(phenomenon.status)}</dd></div>
            <div><dt>Abierto desde</dt><dd>{phenomenon.opened_at ? new Date(phenomenon.opened_at).toLocaleDateString('es-MX') : '—'}</dd></div>
            <div><dt>Última evidencia</dt><dd>{phenomenon.last_evidence_at ? new Date(phenomenon.last_evidence_at).toLocaleDateString('es-MX') : 'Sin evidencia todavía'}</dd></div>
          </dl>
        </section>

        {/* CALIBRACIÓN */}
        <section className="pc-card">
          <h2>Calibración</h2>
          <p className="pc-composite">{composite}</p>
          <div className="pc-indices">
            {indicesExplicados.length ? indicesExplicados.map((item) => (
              <div key={item.clave} className="pc-index-row">
                <div className="pc-index-head">
                  <strong>{item.nombre}</strong>
                  <span>{item.valor}/{item.maximo}</span>
                </div>
                <div className="pc-index-bar">
                  <i style={{ width: `${(item.valor / item.maximo) * 100}%` }} />
                </div>
                <p>{item.significado}</p>
              </div>
            )) : (
              <p className="pc-empty">Todavía no hay índices calculados. Corre una recalibración con evidencia cargada.</p>
            )}
          </div>
        </section>

        {/* HIPÓTESIS ACTUAL */}
        <section className="pc-card">
          <h2>Hipótesis actual</h2>
          {hypothesis ? (
            <div className="pc-hypothesis">
              <p className="pc-direction">{explicarDireccion(String(hypothesis.direction ?? ''))}</p>
              <p className="pc-rationale">{String(hypothesis.rationale ?? 'Sin racional registrado.')}</p>
              <div className="pc-rival">
                <span>ALTERNATIVA CONSIDERADA (RIVAL)</span>
                <p>{explicarDireccion(String(hypothesis.rival_direction ?? ''))}</p>
                <p>{String(hypothesis.rival_rationale ?? 'Sin racional rival registrado.')}</p>
              </div>
            </div>
          ) : (
            <p className="pc-empty">Todavía no hay hipótesis generada. Se genera automáticamente al recalibrar con evidencia suficiente.</p>
          )}
        </section>

        {/* PRÓXIMA OBSERVACIÓN REQUERIDA */}
        <section className="pc-card">
          <h2>Próxima observación requerida</h2>
          <p className="pc-suggestion">{proximaObservacion}</p>
          <button type="button" className="pc-recalibrate" onClick={recalibrate} disabled={loading}>
            {loading ? 'RECALIBRANDO…' : 'EJECUTAR RECALIBRACIÓN'}
          </button>
          {error ? <span className="pc-error">{error}</span> : null}
        </section>

        {/* EVIDENCIA / TIMELINE */}
        <section className="pc-card pc-wide">
          <h2>Evidencia — línea de tiempo ({timeline.length})</h2>
          {timeline.length ? (
            <ul className="pc-timeline">
              {timeline.map((entry, index) => (
                <li key={`${entry.fecha}-${index}`}>
                  <time>{new Date(entry.fecha).toLocaleString('es-MX')}</time>
                  <div>
                    <strong>{entry.titulo}</strong>
                    <p>{entry.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pc-empty">Aún no se ha cargado evidencia para este fenómeno.</p>
          )}
        </section>

        {/* EVIDENCIA COMPARTIDA CON OTROS FENÓMENOS */}
        <section className="pc-card pc-wide">
          <h2>Evidencia compartida con otros fenómenos ({linkedEvidence.length})</h2>
          {linkedEvidence.length ? (
            <ul className="pc-timeline">
              {linkedEvidence.map((link) => (
                <li key={link.linkId}>
                  <time>{new Date(link.linkedAt).toLocaleDateString('es-MX')}</time>
                  <div>
                    <strong>{link.evidence ? `${link.evidence.evidence_type} · ${link.evidence.domain}` : 'Evidencia no disponible'}</strong>
                    <p>
                      Vínculo: {link.relationType === 'SHARED_ORIGIN' ? 'mismo origen' : link.relationType === 'CROSS_DOMAIN' ? 'cross-dominio' : 'relacionado'}
                      {link.note ? ` — ${link.note}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pc-empty">Esta evidencia todavía no se ha vinculado a otros fenómenos. Una misma evidencia (ej. una publicación) puede servir de contexto para varios fenómenos sin duplicar el archivo.</p>
          )}
        </section>

        {/* HIPÓTESIS POR OBSERVADOR */}
        <section className="pc-card pc-wide">
          <h2>¿Qué dice cada observador sobre este fenómeno?</h2>
          {hypothesisView ? (
            <div className="pc-observers">
              {hypothesisView.observadores.map((obs) => (
                <div key={obs.fuente} className="pc-observer">
                  <div className="pc-observer-head">
                    <strong>{obs.fuente === 'PPOI' ? 'PPOI · ciclo de observación' : obs.fuente === 'STUDIO' ? 'Studio · técnico' : 'Cultural-lab · emergente'}</strong>
                    <span className={obs.disponible ? 'pc-tag-ok' : 'pc-tag-empty'}>{obs.disponible ? `${obs.items.length} hipótesis` : 'sin datos'}</span>
                  </div>
                  {obs.disponible ? (
                    <ul className="pc-observer-list">
                      {obs.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.resumen}</strong>
                          {item.detalle ? <p>{item.detalle}</p> : null}
                          {item.severidadOAccion ? <span>{item.severidadOAccion}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pc-empty">{obs.razonNoDisponible}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="pc-empty">No se pudo construir la vista consolidada de observadores.</p>
          )}
        </section>
      </div>
    </main>
  );
}