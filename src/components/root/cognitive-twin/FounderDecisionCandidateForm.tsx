'use client';

import { useState } from 'react';

export function FounderDecisionCandidateForm() {
  const [situation, setSituation] = useState('');
  const [rejectedCondition, setRejectedCondition] = useState('');
  const [correctState, setCorrectState] = useState('');
  const [generalRule, setGeneralRule] = useState('');
  const [requiredEvidence, setRequiredEvidence] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/root/cognitive-twin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          rejectedCondition,
          correctState,
          generalRule,
          requiredEvidence: requiredEvidence.split('\n').map((item) => item.trim()).filter(Boolean),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setMessage(`Candidato registrado: ${body.decision?.decision_id ?? 'sin identificador devuelto'}. Todavía no es canon.`);
      setSituation('');
      setRejectedCondition('');
      setCorrectState('');
      setGeneralRule('');
      setRequiredEvidence('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
      <label style={labelStyle}>SITUACIÓN<textarea style={inputStyle} value={situation} onChange={(event) => setSituation(event.target.value)} placeholder="¿Qué estaba intentando resolver SFI o una IA?" required /></label>
      <label style={labelStyle}>QUÉ RECHAZASTE<textarea style={inputStyle} value={rejectedCondition} onChange={(event) => setRejectedCondition(event.target.value)} placeholder="¿Qué interpretación, conducta o conclusión era inaceptable?" /></label>
      <label style={labelStyle}>ESTADO CORRECTO<input style={inputStyle} value={correctState} onChange={(event) => setCorrectState(event.target.value)} placeholder="Ej. IMPLEMENTED_UNVERIFIED, BLOCKED, HYPOTHESIZED" /></label>
      <label style={labelStyle}>REGLA GENERALIZABLE<textarea style={inputStyle} value={generalRule} onChange={(event) => setGeneralRule(event.target.value)} placeholder="La regla que debería funcionar también en otros casos" required /></label>
      <label style={labelStyle}>EVIDENCIA QUE DEBERÍA EXIGIRSE<textarea style={inputStyle} value={requiredEvidence} onChange={(event) => setRequiredEvidence(event.target.value)} placeholder={'Una evidencia por línea\nEj. runtime_log\nEj. test_result'} /></label>
      <button type="submit" disabled={busy || !situation.trim() || !generalRule.trim()} style={buttonStyle}>{busy ? 'REGISTRANDO…' : 'REGISTRAR COMO CANDIDATO'}</button>
      {message ? <output style={{ fontSize: 11, color: '#c9ad72', lineHeight: 1.6 }}>{message}</output> : null}
    </form>
  );
}

const labelStyle = { display: 'grid', gap: 6, color: '#9b907d', fontSize: 10, letterSpacing: '.1em' } as const;
const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #3a3223', background: '#080806', color: '#eee7d7', padding: 10, font: 'inherit', fontSize: 12, minHeight: 38 } as const;
const buttonStyle = { border: '1px solid #6c5a2d', background: '#15130e', color: '#d8c488', padding: '10px 13px', font: 'inherit', fontSize: 11, cursor: 'pointer' } as const;
