'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileUp, Gauge, Lock, Settings, Target, UploadCloud } from 'lucide-react';

type TaskStatus = 'open' | 'evidence_required' | 'validated' | 'rejected';
type EvidenceState = 'none' | 'attached' | 'validated' | 'rejected';

type FieldTask = {
  id: string;
  title: string;
  reason: string;
  requiredEvidence: string;
  suggestedTime: string;
  successCondition: string;
  failureCondition: string;
  degradationTimer: string;
  status: TaskStatus;
  evidenceState: EvidenceState;
};

type EvidenceDraft = {
  name: string;
  size: number;
  type: string;
  explanation: string;
  state: EvidenceState;
};

const welcomeMessage = 'En la parte superior derecha encontrarás un engrane desde el que podrás acceder a la configuración de tu cuenta o a un pequeño tutorial de uso. Gracias por confiar en System Friction Institute. El campo te da la bienvenida. Es momento de explorar y poblar con tus objetivos. Es momento de ser parte de la historia. — Founder';

function buildTasks(objective: string): FieldTask[] {
  const clean = objective.trim();
  if (!clean) return [];
  return [
    {
      id: 'task-objective-evidence',
      title: 'Declarar evidencia inicial',
      reason: `El objetivo "${clean}" necesita una prueba observable antes de producir cierre.`,
      requiredEvidence: 'Documento, captura, nota, metrica o archivo que pruebe el estado actual.',
      suggestedTime: '30 minutos',
      successCondition: 'Existe evidencia adjunta y evaluada como relevante.',
      failureCondition: 'No hay evidencia o no corresponde al objetivo.',
      degradationTimer: '48h sin evidencia',
      status: 'evidence_required',
      evidenceState: 'none',
    },
    {
      id: 'task-minimal-perturbation',
      title: 'Ejecutar una perturbacion minima',
      reason: 'El sistema no necesita una estrategia grande; necesita una accion pequena que cambie el estado.',
      requiredEvidence: 'Registro de accion ejecutada y resultado observable.',
      suggestedTime: '45 minutos',
      successCondition: 'La accion produjo una senal verificable.',
      failureCondition: 'La accion no se ejecuta o no deja rastro.',
      degradationTimer: '72h sin avance verificable',
      status: 'open',
      evidenceState: 'none',
    },
  ];
}

function Panel({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-[#272219] bg-[#080806]/92">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
        {title}<span>{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="border-t border-[#272219] p-4">{children}</div> : null}
    </section>
  );
}

function taskTone(task: FieldTask) {
  if (task.evidenceState === 'validated') return 'text-[#74c58f]';
  if (task.status === 'evidence_required') return 'text-[#d08b63]';
  return 'text-[#c8a951]';
}

export default function SystemFieldClient() {
  const [welcomeAck, setWelcomeAck] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('sfi:first-field-welcome') === 'ack');
  const [objective, setObjective] = useState('');
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [evidence, setEvidence] = useState<EvidenceDraft | null>(null);
  const [message, setMessage] = useState('Server persistence: local_only_ack. Blocker: no confirmed user objective/task/attractor persistence contract without owned node context.');

  const attractorCandidate = useMemo(() => {
    const validated = tasks.filter((task) => task.evidenceState === 'validated');
    if (!objective.trim() || !validated.length) return null;
    return {
      name: `attractor_candidate:${objective.trim().slice(0, 42)}`,
      objective,
      linkedTasks: validated.map((task) => task.title),
      unresolved: tasks.filter((task) => task.evidenceState !== 'validated').map((task) => task.requiredEvidence),
      distance: `${Math.max(0, tasks.length - validated.length)} unresolved evidence requirement(s)`,
      degradationTime: tasks.find((task) => task.evidenceState !== 'validated')?.degradationTimer ?? 'no active degradation',
      nextActions: tasks.filter((task) => task.evidenceState !== 'validated').map((task) => task.title),
    };
  }, [objective, tasks]);

  function applyMoph() {
    const nextTasks = buildTasks(objective);
    setTasks(nextTasks);
    setMessage(nextTasks.length ? 'MOP-H applied locally. Server persistence blocked: /api/moph/session is not confirmed as authenticated user objective/task storage.' : 'Declare an objective first.');
  }

  function acknowledgeWelcome() {
    window.localStorage.setItem('sfi:first-field-welcome', 'ack');
    setWelcomeAck(true);
  }

  function attachEvidence(file: File | null) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setMessage('Evidence rejected: file_size_limit_12mb.');
      return;
    }
    const allowed = ['text/', 'image/', 'audio/', 'video/', 'application/pdf'];
    if (!allowed.some((prefix) => file.type.startsWith(prefix))) {
      setMessage(`Evidence rejected: unsupported_file_type:${file.type || 'unknown'}.`);
      return;
    }
    const explanation = `Evidencia recibida: ${file.name}. Evaluacion legible: el archivo puede sostener una tarea si corresponde al objetivo declarado. Persistencia de archivo bloqueada: no hay contrato seguro de storage para usuario en esta superficie.`;
    setEvidence({ name: file.name, size: file.size, type: file.type || 'unknown', explanation, state: 'validated' });
    setTasks((current) => current.map((task, index) => index === 0 ? { ...task, evidenceState: 'validated', status: 'validated' } : task));
    setMessage('Evidence evaluated locally as relevant draft. Raw JSON stays out of default view.');
  }

  function closeTask(taskId: string) {
    setTasks((current) => current.map((task) => {
      if (task.id !== taskId) return task;
      if (task.evidenceState !== 'validated') {
        setMessage(`Task blocked: ${task.title}. closure_blocker: evidence_required.`);
        return { ...task, status: 'evidence_required' };
      }
      setMessage(`Task can close locally: ${task.title}. Server closure blocked until safe task persistence contract exists.`);
      return { ...task, status: 'validated' };
    }));
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050504] text-[#d8d2c2]">
      {!welcomeAck ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#050504]/92 p-6">
          <section className="max-w-2xl border border-[#c8a95155] bg-[#0b0b09] p-7">
            <p className="text-lg leading-8 text-[#f1ead8]">{welcomeMessage}</p>
            <button type="button" onClick={acknowledgeWelcome} className="mt-6 border border-[#c8a951] bg-[#c8a951] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#050504]">Entrar al campo</button>
            <p className="mt-3 text-xs text-[#8f8878]">Persistencia del acuse: local_only. Bloqueo: no hay contrato seguro de perfil/first-login confirmado para esta pasada.</p>
          </section>
        </div>
      ) : null}

      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b border-[#272219] bg-[#050504]/95 px-5 backdrop-blur">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8a951]">/field</div>
        <div className="ml-auto flex items-center gap-3 text-[#8f8878]">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em]">authenticated</span>
          <button type="button" title="Configuracion y tutorial" className="grid h-8 w-8 place-items-center rounded-full border border-[#2f2a1e] text-[#c8a951]"><Settings size={15} /></button>
        </div>
      </header>

      <section className="relative min-h-screen pt-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(200,169,81,0.18),transparent_34%),linear-gradient(180deg,#080806,#020201)]" />
        <div className="relative grid min-h-[calc(100vh-48px)] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="relative min-h-[520px] overflow-hidden border border-[#272219]">
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8a951] bg-[#0b0b09] p-5 text-center">
              <Target className="mx-auto text-[#c8a951]" size={24} />
              <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f1ead8]">Objective</div>
            </div>
            {tasks.map((task, index) => (
              <div key={task.id} className="absolute w-56 border border-[#2f2a1e] bg-[#080806]/90 p-3 text-sm" style={{ left: `${12 + index * 32}%`, top: `${22 + index * 22}%` }}>
                <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${taskTone(task)}`}>{task.status}</div>
                <div className="mt-2 text-[#f1ead8]">{task.title}</div>
                <div className="mt-2 text-xs text-[#8f8878]">{task.degradationTimer}</div>
              </div>
            ))}
            {evidence ? (
              <div className="absolute bottom-8 right-8 w-60 border border-[#74c58f66] bg-[#07110b] p-3 text-sm">
                <FileUp size={16} className="text-[#74c58f]" />
                <div className="mt-2 text-[#f1ead8]">{evidence.name}</div>
                <div className="mt-1 text-xs text-[#8f8878]">validated evidence orbit</div>
              </div>
            ) : null}
          </section>

          <aside className="grid content-start gap-3">
            <Panel title="Apply MOP-H HUD">
              <textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Declara un objetivo operativo." className="min-h-24 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8] outline-none focus:border-[#c8a951]" />
              <button type="button" onClick={applyMoph} className="mt-3 border border-[#c8a951] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">Aplicar MOP-H</button>
            </Panel>

            <Panel title="Upload Evidence HUD">
              <label className="flex cursor-pointer items-center gap-3 border border-[#2f2a1e] p-3 text-sm text-[#c8a951]">
                <UploadCloud size={18} /> Subir evidencia
                <input type="file" className="hidden" onChange={(event) => attachEvidence(event.target.files?.[0] ?? null)} />
              </label>
              {evidence ? <p className="mt-3 text-sm leading-6 text-[#d8d2c2]">{evidence.explanation}</p> : <p className="text-sm leading-6 text-[#8f8878]">Sin evidencia, ninguna tarea con requisito puede cerrarse.</p>}
            </Panel>

            <Panel title="Minimal Perturbation Tasks HUD">
              <div className="space-y-3">
                {tasks.length ? tasks.map((task) => (
                  <article key={task.id} className="border border-[#272219] p-3">
                    <div className="text-sm text-[#f1ead8]">{task.title}</div>
                    <p className="mt-2 text-xs leading-5 text-[#8f8878]">{task.reason}</p>
                    <p className="mt-2 text-xs text-[#c8a951]">Evidencia requerida: {task.requiredEvidence}</p>
                    <p className="mt-1 text-xs text-[#8f8878]">Exito: {task.successCondition}</p>
                    <p className="mt-1 text-xs text-[#8f8878]">Falla: {task.failureCondition}</p>
                    <button type="button" onClick={() => closeTask(task.id)} className="mt-3 border border-[#2f2a1e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">
                      {task.evidenceState === 'validated' ? 'Cerrar con evidencia' : 'closure_blocked:evidence_required'}
                    </button>
                  </article>
                )) : <p className="text-sm text-[#8f8878]">Declara un objetivo para generar tareas.</p>}
              </div>
            </Panel>

            <Panel title="World State HUD" defaultOpen={false}>
              <div className="flex items-start gap-3 text-sm leading-6 text-[#d8d2c2]"><Gauge className="mt-1 text-[#c8a951]" size={18} /> WorldSpect actual debe leerse desde proveedores internos. La tendencia longitudinal por dominio queda degradada si no hay muestras suficientes; no se finge completitud.</div>
            </Panel>

            <Panel title="Attractor Hub">
              {attractorCandidate ? (
                <div className="text-sm leading-6 text-[#d8d2c2]">
                  <div className="text-[#f1ead8]">{attractorCandidate.name}</div>
                  <div>Objetivo: {attractorCandidate.objective}</div>
                  <div>Tareas vinculadas: {attractorCandidate.linkedTasks.join(', ')}</div>
                  <div>Distancia: {attractorCandidate.distance}</div>
                  <div>Degradacion: {attractorCandidate.degradationTime}</div>
                  <div>Persistencia: blocked:persistent_attractor_contract_missing</div>
                </div>
              ) : <p className="text-sm text-[#8f8878]">Sin evidencia validada no hay attractor_candidate.</p>}
            </Panel>

            <div className="border border-[#272219] bg-[#080806] p-3 text-xs leading-5 text-[#8f8878]">
              <Lock className="mb-2 text-[#c8a951]" size={16} /> {message}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
