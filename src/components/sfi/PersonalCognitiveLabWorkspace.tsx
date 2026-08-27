'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;
type Workspace = {
  cases: Row[];
  evidence: Row[];
  cognitiveRuns: Row[];
  labRuns: Row[];
  studioObjects: Row[];
  warnings: string[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  workspace?: Workspace;
  case?: Row;
  evidence?: Row;
  runId?: string;
  labAnalysisId?: string;
  output?: Row;
};

const panel: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: 16,
  padding: 18,
  background: 'rgba(8,10,14,.76)',
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(255,255,255,.2)',
  borderRadius: 10,
  background: 'rgba(255,255,255,.04)',
  color: 'inherit',
  padding: '10px 12px',
};

const button: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.28)',
  borderRadius: 999,
  background: 'rgba(255,255,255,.08)',
  color: 'inherit',
  padding: '9px 14px',
  cursor: 'pointer',
};

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

async function request(body?: Row) {
  const response = await fetch('/api/interface/cognitive-workspace', body ? {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  } : { cache: 'no-store' });
  const payload = await response.json() as ApiResponse;
  if (!response.ok && response.status !== 207) throw new Error(payload.error || `HTTP_${response.status}`);
  return payload;
}

export function PersonalCognitiveLabWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selectedCase, setSelectedCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseObjective, setCaseObjective] = useState('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [cognitiveObjective, setCognitiveObjective] = useState('');
  const [protocol, setProtocol] = useState<'sociotechnical_simulation' | 'economic_simulation'>('sociotechnical_simulation');

  const refresh = useCallback(async () => {
    try {
      const result = await request();
      const next = result.workspace ?? null;
      setWorkspace(next);
      if (next && !selectedCase && next.cases[0]?.id) setSelectedCase(String(next.cases[0].id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [selectedCase]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectedEvidenceIds = useMemo(() => {
    if (!workspace || !selectedCase) return [];
    return workspace.evidence
      .filter((item) => String(item.case_id ?? '') === selectedCase)
      .map((item) => String(item.id));
  }, [workspace, selectedCase]);

  async function execute(action: () => Promise<ApiResponse>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      setMessage(result.ok === false ? 'Completed with degraded automations.' : success);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '32px clamp(18px, 4vw, 56px) 64px', color: '#f4f4f4', background: '#050608' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ padding: '18px 0 8px' }}>
          <div style={{ fontSize: 12, letterSpacing: '.18em', opacity: .58 }}>SFI · PERSONAL WORKSPACE</div>
          <h1 style={{ margin: '8px 0', fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 500 }}>Lab + Cognitive</h1>
          <p style={{ maxWidth: 820, margin: 0, opacity: .72, lineHeight: 1.55 }}>
            Your cases, evidence, simulations and cognitive runs remain owner-scoped. Cognitive automations may be auto-selected for the task, but they cannot acquire institutional, publication, spending or ROOT authority.
          </p>
        </header>

        <section style={{ ...panel, display: 'grid', gap: 12 }}>
          <strong>Case</strong>
          <select style={input} value={selectedCase} onChange={(event) => setSelectedCase(event.target.value)}>
            <option value="">No case selected</option>
            {(workspace?.cases ?? []).map((item) => <option key={String(item.id)} value={String(item.id)}>{text(item.title) || String(item.id)}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) auto', gap: 10 }}>
            <input style={input} placeholder="Case title" value={caseTitle} onChange={(event) => setCaseTitle(event.target.value)} />
            <input style={input} placeholder="What do you want to understand or change?" value={caseObjective} onChange={(event) => setCaseObjective(event.target.value)} />
            <button style={button} disabled={busy || !caseTitle.trim() || !caseObjective.trim()} onClick={() => void execute(async () => {
              const result = await request({ operation: 'create_case', title: caseTitle, objective: caseObjective, domain: 'personal' });
              if (result.case?.id) setSelectedCase(String(result.case.id));
              setCaseTitle(''); setCaseObjective('');
              return result;
            }, 'Case created.')}>Create</button>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
          <div style={{ ...panel, display: 'grid', gap: 10 }}>
            <div><strong>Evidence</strong><div style={{ fontSize: 12, opacity: .55 }}>{selectedEvidenceIds.length} linked to selected case</div></div>
            <input style={input} placeholder="Evidence label" value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} />
            <textarea style={{ ...input, minHeight: 120, resize: 'vertical' }} placeholder="Observed fact, note or source content" value={evidenceContent} onChange={(event) => setEvidenceContent(event.target.value)} />
            <button style={button} disabled={busy || !selectedCase || !evidenceLabel.trim() || !evidenceContent.trim()} onClick={() => void execute(async () => {
              const result = await request({ operation: 'persist', caseId: selectedCase, label: evidenceLabel, content: evidenceContent, reliability: 1 });
              setEvidenceLabel(''); setEvidenceContent('');
              return result;
            }, 'Evidence persisted.')}>Persist evidence</button>
          </div>

          <div style={{ ...panel, display: 'grid', gap: 10 }}>
            <div><strong>Cognitive</strong><div style={{ fontSize: 12, opacity: .55 }}>Auto-selects the minimum relevant cognitive automations</div></div>
            <textarea style={{ ...input, minHeight: 120, resize: 'vertical' }} placeholder="Question, objective or cognitive task" value={cognitiveObjective} onChange={(event) => setCognitiveObjective(event.target.value)} />
            <button style={button} disabled={busy || !cognitiveObjective.trim()} onClick={() => void execute(() => request({
              operation: 'cognitive',
              caseId: selectedCase || null,
              objective: cognitiveObjective,
              evidenceIds: selectedEvidenceIds,
            }), 'Cognitive run persisted.')}>Run Cognitive</button>
          </div>

          <div style={{ ...panel, display: 'grid', gap: 10 }}>
            <div><strong>Lab</strong><div style={{ fontSize: 12, opacity: .55 }}>Simulation is private and remains SIMULATED until return evidence exists</div></div>
            <select style={input} value={protocol} onChange={(event) => setProtocol(event.target.value as typeof protocol)}>
              <option value="sociotechnical_simulation">Sociotechnical simulation</option>
              <option value="economic_simulation">Economic simulation</option>
            </select>
            <button style={button} disabled={busy || !selectedCase || selectedEvidenceIds.length === 0} onClick={() => void execute(() => request({
              operation: 'lab',
              caseId: selectedCase,
              protocolId: protocol,
              evidenceIds: selectedEvidenceIds,
              objective: cognitiveObjective,
            }), 'Lab simulation persisted.')}>Run Lab</button>
          </div>
        </section>

        <section style={panel}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, opacity: .78 }}>
            <span>Cases: {workspace?.cases.length ?? 0}</span>
            <span>Evidence: {workspace?.evidence.length ?? 0}</span>
            <span>Cognitive runs: {workspace?.cognitiveRuns.length ?? 0}</span>
            <span>Lab runs: {workspace?.labRuns.length ?? 0}</span>
            <span>Studio objects: {workspace?.studioObjects.length ?? 0}</span>
          </div>
          {message ? <p style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: 12, opacity: .74 }}>{message}</p> : null}
          {(workspace?.warnings.length ?? 0) > 0 ? <p style={{ marginBottom: 0, fontFamily: 'monospace', fontSize: 12, opacity: .6 }}>{workspace?.warnings.join(' · ')}</p> : null}
        </section>
      </div>
    </main>
  );
}
