// src/components/root/SystemOverridePanel.tsx
'use client';

import { useState } from 'react';

const OVERRIDE_TYPES = [
  'sobre evidencia',
  'sobre bloqueo',
  'sobre atractor',
  'sobre regimen',
  'sobre deuda',
  'sobre override previo',
];

function estimateRisk(type: string) {
  if (type.includes('atractor') || type.includes('regimen') || type.includes('deuda')) {
    return 'Riesgo alto: esta anulacion puede cambiar una regla que sostiene direccion o lectura del sistema.';
  }
  if (type.includes('bloqueo')) {
    return 'Riesgo medio: esta operacion puede debilitar separacion entre Observatorio Vivo y Atractor.';
  }
  if (type.includes('evidencia')) {
    return 'Riesgo medio: evidencia mal promovida puede parecer realidad modificada.';
  }
  return 'No hay lectura suficiente para estimar riesgo. No se debe tratar como seguro.';
}

export function SystemOverridePanel() {
  const [overrideType, setOverrideType] = useState(OVERRIDE_TYPES[0]);
  const [justification, setJustification] = useState('');
  const [affectedElement, setAffectedElement] = useState('');
  const [consequence, setConsequence] = useState('');
  const [duration, setDuration] = useState('');
  const [rootConfirmed, setRootConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const risk = estimateRisk(overrideType);
  const canSubmit = justification.trim() && affectedElement.trim() && consequence.trim() && rootConfirmed;

  const submitIntent = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setStatus(null);
    const intent = [
      `Tipo: ${overrideType}`,
      `Justificacion: ${justification.trim()}`,
      `Elemento afectado: ${affectedElement.trim()}`,
      `Riesgo estimado: ${risk}`,
      `Consecuencia: ${consequence.trim()}`,
      `Duracion: ${duration.trim() || 'sin duracion declarada'}`,
      'Confirmacion raiz: Aptymok solicita la anulacion.',
    ].join('\n');
    try {
      await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          intent,
          source: 'acp_root_controlled_override',
          confidenceThreshold: 0.7,
        }),
      });
      setStatus('Solicitud de anulacion registrada como excepcion controlada. No ejecuta accion externa por si sola.');
      setJustification('');
      setAffectedElement('');
      setConsequence('');
      setDuration('');
      setRootConfirmed(false);
    } catch {
      setStatus('No se pudo registrar la solicitud de anulacion.');
    } finally {
      setLoading(false);
    }
  };

  const pauseSystem = async () => {
    if (!justification.trim() || !rootConfirmed) {
      setStatus('Para pausar hace falta justificacion visible y confirmacion raiz.');
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/admin/freeze', { method: 'POST', credentials: 'include' });
      setStatus('Pausa root solicitada con justificacion. No sustituye cierre ni evidencia.');
    } catch {
      setStatus('No se pudo registrar la pausa root.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border border-[#1e1c17] bg-[#0e0d0b] p-3">
      <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8a7035]">Override manual controlado</div>
      <p className="mb-3 text-xs leading-5 text-[#8a7568]">Esta anulacion modifica una regla del sistema. Debe dejar justificacion. Solo Aptymok puede solicitar override; agentes no pueden hacerlo.</p>
      <select
        value={overrideType}
        onChange={(event) => setOverrideType(event.target.value)}
        className="w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none focus:border-[#8a7035]"
      >
        {OVERRIDE_TYPES.map((type) => <option key={type}>{type}</option>)}
      </select>
      <textarea
        value={justification}
        onChange={(event) => setJustification(event.target.value)}
        className="mt-2 min-h-16 w-full resize-none border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
        placeholder="justificacion visible"
      />
      <input
        value={affectedElement}
        onChange={(event) => setAffectedElement(event.target.value)}
        className="mt-2 w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
        placeholder="elemento afectado"
      />
      <textarea
        value={consequence}
        onChange={(event) => setConsequence(event.target.value)}
        className="mt-2 min-h-14 w-full resize-none border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
        placeholder="consecuencia esperada"
      />
      <input
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
        className="mt-2 w-full border border-[#1e1c17] bg-[#060605] p-2 font-mono text-[10px] text-[#ccc8bc] outline-none placeholder:text-[#35312a] focus:border-[#8a7035]"
        placeholder="duracion si aplica"
      />
      <div className="mt-2 border border-[#2e2410] bg-[#12100d] p-2 font-mono text-[8px] leading-4 text-[#c8a951]">{risk}</div>
      <label className="mt-2 flex items-start gap-2 font-mono text-[9px] leading-4 text-[#8a7568]">
        <input type="checkbox" checked={rootConfirmed} onChange={(event) => setRootConfirmed(event.target.checked)} className="mt-0.5" />
        Confirmo como Aptymok que esta solicitud no viene de un agente y que debe dejar rastro.
      </label>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => void submitIntent()}
          disabled={loading || !canSubmit}
          className="border border-[#8a7035] bg-[#2e2410] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c8a951] disabled:opacity-40"
        >
          Solicitar override
        </button>
        <button
          type="button"
          onClick={() => void pauseSystem()}
          disabled={loading}
          className="border border-[#5a2020] bg-[#5a2020]/20 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[#c87060] disabled:opacity-40"
        >
          Pausar con razon
        </button>
      </div>
      {status ? <div className="mt-2 font-mono text-[8px] leading-5 text-[#8a7035]">{status}</div> : null}
    </section>
  );
}
