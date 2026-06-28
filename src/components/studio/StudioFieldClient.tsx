'use client';

import { useEffect, useMemo, useState } from 'react';
import { Disc3, FileAudio, Instagram, Lock, Send, TimerReset } from 'lucide-react';
import type { StudioEvaluationReport, StudioFinalState, StudioObjectKind } from '@/lib/studio/evaluation';

type DecisionGate = 'continuar' | 'terminar' | 'publicar' | 'vender' | 'colaborar' | 'revisar' | 'archivar' | 'matar' | 'decision_required';
type EvidenceState = 'missing' | 'attached' | 'validated';

type AudioMetadata = {
  fileName: string;
  size: number;
  mime: string;
  duration: number | null;
};

type AudioFeatures = {
  sampleRate: number | null;
  channelCount: number | null;
  duration: number | null;
  peak: number | null;
  rms: number | null;
  clippingRisk: number | null;
  silenceStartSeconds: number | null;
  silenceEndSeconds: number | null;
  energySegments: number[];
  dynamicRange: number | null;
  structureNote: string | null;
  extractionMode: 'web_audio' | 'metadata_only' | 'not_available';
};

type ProducerTask = {
  id: string;
  title: string;
  reason: string;
  requiredEvidence: string;
  suggestedTime: string;
  deadline: string;
  successCondition: string;
  failureCondition: string;
  nextAction: string;
  evidenceState: EvidenceState;
  closed: boolean;
  closureBlocker: string | null;
};

type StudioProject = {
  id: string;
  objectKind: StudioObjectKind;
  title: string;
  referenceGenre: string;
  currentState: string;
  deadline: string;
  note: string;
  audio: AudioMetadata | null;
  audioFeatures: AudioFeatures | null;
  report: StudioEvaluationReport | null;
  tasks: ProducerTask[];
  decision: DecisionGate;
  instagramSignal: string;
  producerOffer: string;
  updatedAt: string;
};

const STORAGE_KEY = 'sfi:studio:projects:v1';
const decisionGates: DecisionGate[] = ['continuar', 'terminar', 'publicar', 'vender', 'colaborar', 'revisar', 'archivar', 'matar'];
const objectKinds: StudioObjectKind[] = ['melody', 'beat', 'loop', 'demo', 'REM618', 'reference', 'client_note', 'instagram_signal'];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return 'not_decodable';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

function segmentEnergy(samples: Float32Array, segments = 8) {
  const size = Math.max(1, Math.floor(samples.length / segments));
  const result: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const start = index * size;
    const end = index === segments - 1 ? samples.length : Math.min(samples.length, start + size);
    let sum = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) sum += samples[sampleIndex] * samples[sampleIndex];
    result.push(roundMetric(Math.sqrt(sum / Math.max(1, end - start))));
  }
  return result;
}

function secondsUntilSound(samples: Float32Array, sampleRate: number) {
  const threshold = 0.015;
  for (let index = 0; index < samples.length; index += 1) {
    if (Math.abs(samples[index]) > threshold) return roundMetric(index / sampleRate);
  }
  return null;
}

function secondsAfterLastSound(samples: Float32Array, sampleRate: number) {
  const threshold = 0.015;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    if (Math.abs(samples[index]) > threshold) return roundMetric((samples.length - 1 - index) / sampleRate);
  }
  return null;
}

async function extractAudioFeatures(file: File): Promise<AudioFeatures> {
  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return {
      sampleRate: null,
      channelCount: null,
      duration: null,
      peak: null,
      rms: null,
      clippingRisk: null,
      silenceStartSeconds: null,
      silenceEndSeconds: null,
      energySegments: [],
      dynamicRange: null,
      structureNote: 'Web Audio unavailable.',
      extractionMode: 'not_available',
    };
  }

  const context = new AudioContextConstructor();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const mono = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) mono[index] += data[index] / buffer.numberOfChannels;
    }

    let peak = 0;
    let square = 0;
    let clipped = 0;
    for (let index = 0; index < mono.length; index += 1) {
      const abs = Math.abs(mono[index]);
      peak = Math.max(peak, abs);
      square += mono[index] * mono[index];
      if (abs >= 0.98) clipped += 1;
    }

    const energies = segmentEnergy(mono);
    const rms = Math.sqrt(square / Math.max(1, mono.length));
    const minEnergy = Math.min(...energies);
    const maxEnergy = Math.max(...energies);
    const first = energies[0] ?? 0;
    const last = energies[energies.length - 1] ?? 0;
    const structureNote = last > first + 0.06
      ? 'energy_rises_by_segments'
      : first > last + 0.06
        ? 'energy_drops_by_segments'
        : maxEnergy - minEnergy > 0.12
          ? 'energy_has_sectional_contrast'
          : 'energy_is_relatively_flat';

    return {
      sampleRate: buffer.sampleRate,
      channelCount: buffer.numberOfChannels,
      duration: roundMetric(buffer.duration),
      peak: roundMetric(peak),
      rms: roundMetric(rms),
      clippingRisk: roundMetric(clipped / Math.max(1, mono.length)),
      silenceStartSeconds: secondsUntilSound(mono, buffer.sampleRate),
      silenceEndSeconds: secondsAfterLastSound(mono, buffer.sampleRate),
      energySegments: energies,
      dynamicRange: roundMetric(maxEnergy - minEnergy),
      structureNote,
      extractionMode: 'web_audio',
    };
  } catch {
    return {
      sampleRate: null,
      channelCount: null,
      duration: null,
      peak: null,
      rms: null,
      clippingRisk: null,
      silenceStartSeconds: null,
      silenceEndSeconds: null,
      energySegments: [],
      dynamicRange: null,
      structureNote: 'audio_not_decodable_by_browser',
      extractionMode: 'metadata_only',
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

function fallbackTasks(project: StudioProject): ProducerTask[] {
  const hasAudio = Boolean(project.audio);
  return [
    {
      id: `task-${project.id}-bounce`,
      title: 'Exportar bounce de 30 segundos',
      reason: 'Sin evidencia audible no hay cierre operativo.',
      requiredEvidence: 'Archivo exportado o metadata de audio seleccionada.',
      suggestedTime: '30 minutos',
      deadline: project.deadline || '48h',
      successCondition: 'Existe fragmento reproducible y nombrado.',
      failureCondition: 'La idea queda como intencion sin prueba.',
      nextAction: hasAudio ? 'Seleccionar mejor fragmento y registrar timestamp.' : 'Adjuntar audio primero.',
      evidenceState: hasAudio ? 'attached' : 'missing',
      closed: false,
      closureBlocker: hasAudio ? null : 'evidence_required',
    },
    {
      id: `task-${project.id}-reference`,
      title: 'Comparar contra una referencia',
      reason: 'La cercania de genero no se decide en abstracto.',
      requiredEvidence: 'Referencia declarada y nota A/B.',
      suggestedTime: '20 minutos',
      deadline: project.deadline || '72h',
      successCondition: 'Se declara que copiar, evitar o transformar.',
      failureCondition: 'La pieza no tiene marco de decision.',
      nextAction: 'Elegir una referencia concreta y escribir una comparacion breve.',
      evidenceState: project.referenceGenre ? 'attached' : 'missing',
      closed: false,
      closureBlocker: project.referenceGenre ? null : 'evidence_required',
    },
    {
      id: `task-${project.id}-api`,
      title: 'Ejecutar reporte SFI Music Evaluation',
      reason: 'Las tareas finales deben salir del endpoint /api/studio/evaluate, no de plantilla local.',
      requiredEvidence: 'Reporte con MIHM, WorldSpectVector, Cultural Vector, Conclusion y perturbaciones.',
      suggestedTime: '5 minutos',
      deadline: 'ahora',
      successCondition: 'Existe reporte SFI estructurado.',
      failureCondition: 'La pieza queda en metadata local.',
      nextAction: 'Presionar Evaluar.',
      evidenceState: 'missing',
      closed: false,
      closureBlocker: 'sfi_report_required',
    },
  ];
}

function buildOffer(project: StudioProject) {
  const genre = project.referenceGenre || 'sonido alternativo';
  return [
    `Beat pack plan: 3 ideas compatibles con ${genre}; una principal, una variacion mas simple y una opcion experimental.`,
    `Service offer: produccion de base, arreglo corto, referencia de mezcla y bounce de prueba.`,
    `Short bio: Edwing / REM618 desarrolla piezas con continuidad artistica y utilidad de productor, separando material de artista, portfolio y cliente.`,
    `Pitch message: Tengo una idea en ${genre} que puede servir para demo, reel o base de cancion. Te mando un fragmento corto; si conecta, preparo version extendida.`,
    `Evidence required: captura del envio, respuesta del prospecto o registro manual de seguimiento.`,
    `Follow-up tasks: enviar a 1 prospecto, registrar respuesta, decidir continuar/vender/archivar.`,
  ].join('\n');
}

function conclusionToDecisionGate(state: StudioFinalState): DecisionGate {
  if (state === 'finish_this_week') return 'terminar';
  if (state === 'sell_pitch') return 'vender';
  if (state === 'continue') return 'continuar';
  if (state === 'publish') return 'publicar';
  if (state === 'collaborate') return 'colaborar';
  if (state === 'revise') return 'revisar';
  if (state === 'archive') return 'archivar';
  if (state === 'kill') return 'matar';
  return 'decision_required';
}

function perturbationsToTasks(projectId: string, perturbations: StudioEvaluationReport['perturbations']): ProducerTask[] {
  return perturbations.slice(0, 7).map((item, index) => ({
    id: `task-${projectId}-report-${index}`,
    title: item.title,
    reason: item.why_it_matters,
    requiredEvidence: item.required_evidence,
    suggestedTime: item.suggested_duration,
    deadline: item.deadline,
    successCondition: item.success_condition,
    failureCondition: item.failure_condition,
    nextAction: item.exact_action,
    evidenceState: 'missing',
    closed: false,
    closureBlocker: 'evidence_required',
  }));
}

function normalizeStoredProject(value: unknown): StudioProject | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<StudioProject> & { evaluation?: unknown };
  if (!item.id || !item.title) return null;
  return {
    id: String(item.id),
    objectKind: (item.objectKind || 'demo') as StudioObjectKind,
    title: String(item.title),
    referenceGenre: String(item.referenceGenre || ''),
    currentState: String(item.currentState || 'draft'),
    deadline: String(item.deadline || ''),
    note: String(item.note || ''),
    audio: item.audio || null,
    audioFeatures: item.audioFeatures || null,
    report: item.report || null,
    tasks: Array.isArray(item.tasks) ? item.tasks : [],
    decision: item.decision || 'decision_required',
    instagramSignal: String(item.instagramSignal || ''),
    producerOffer: String(item.producerOffer || ''),
    updatedAt: String(item.updatedAt || new Date(0).toISOString()),
  };
}

function ReportSection({ title, mode, text, limits, children }: { title: string; mode: string; text: string; limits: string[]; children: React.ReactNode }) {
  return (
    <article className="border border-[#272219] p-3 text-sm leading-6 text-[#d8d2c2]">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{title}</h3>
        <span className="border border-[#2f2a1e] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f9cc8]">{mode}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[#d8d2c2]">{text}</p>
      <div className="mt-2 space-y-1 text-xs text-[#9f9788]">{children}</div>
      {limits.length ? <p className="mt-2 text-xs text-[#d08b63]">Limits: {limits.join(' | ')}</p> : null}
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border border-[#272219] bg-[#080806]/94">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
        {title}<span>{open ? '-' : '+'}</span>
      </button>
      {open ? <div className="border-t border-[#272219] p-4">{children}</div> : null}
    </section>
  );
}

export default function StudioFieldClient() {
  const [objectKind, setObjectKind] = useState<StudioObjectKind>('demo');
  const [title, setTitle] = useState('');
  const [referenceGenre, setReferenceGenre] = useState('');
  const [currentState, setCurrentState] = useState('draft');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [audio, setAudio] = useState<AudioMetadata | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instagramDraft, setInstagramDraft] = useState({ url: '', date: '', contentType: '', engagement: '', qualitative: '', nextAction: '' });
  const [evaluating, setEvaluating] = useState(false);
  const [message, setMessage] = useState('Studio persistence: localStorage metadata only. Audio binary is never stored or uploaded.');

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeStoredProject).filter((project): project is StudioProject => Boolean(project));
        setProjects(normalized);
        setSelectedId(normalized[0]?.id ?? null);
        if (normalized.length !== parsed.length || parsed.some((item: any) => item?.evaluation && !item?.report)) {
          setMessage('Stale template evaluations were discarded. Press Evaluar to generate the SFI report from /api/studio/evaluate.');
        }
      }
    } catch {
      setMessage('localStorage_read_failed: studio metadata ignored.');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId) ?? projects[0] ?? null, [projects, selectedId]);
  const decisionRequired = useMemo(() => projects.filter((project) => project.decision === 'decision_required' || project.tasks.some((task) => !task.closed && task.evidenceState === 'missing')), [projects]);

  async function selectAudio(file: File | null) {
    if (!file) return;
    const metadata: AudioMetadata = { fileName: file.name, size: file.size, mime: file.type || 'unknown', duration: null };
    setAudio(metadata);
    setAudioFeatures(null);

    const url = URL.createObjectURL(file);
    const element = new Audio();
    element.preload = 'metadata';
    element.src = url;
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : null;
      setAudio({ ...metadata, duration });
      URL.revokeObjectURL(url);
    };
    element.onerror = () => {
      setAudio(metadata);
      URL.revokeObjectURL(url);
    };

    const features = await extractAudioFeatures(file);
    setAudioFeatures(features);
    if (features.duration !== null) setAudio({ ...metadata, duration: features.duration });
  }

  function createProject() {
    const name = title.trim() || audio?.fileName?.replace(/\.[^.]+$/, '') || 'Proyecto sin titulo';
    const project: StudioProject = {
      id: `studio-project-${Date.now()}`,
      objectKind,
      title: name,
      referenceGenre: referenceGenre.trim(),
      currentState,
      deadline,
      note,
      audio,
      audioFeatures,
      report: null,
      tasks: [],
      decision: 'decision_required',
      instagramSignal: '',
      producerOffer: '',
      updatedAt: new Date().toISOString(),
    };
    setProjects((current) => [project, ...current]);
    setSelectedId(project.id);
    setMessage('Proyecto creado. Metadata persistida en localStorage; audio binary no se guarda.');
  }

  function patchProject(id: string, patch: Partial<StudioProject>) {
    setProjects((current) => current.map((project) => project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project));
  }

  async function evaluateProject(project: StudioProject) {
    setEvaluating(true);
    setMessage('Evaluando con /api/studio/evaluate: audio features, MIHM, ScoreFriction, WorldSpect y Cultural Vector.');
    try {
      const response = await fetch('/api/studio/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          object_id: project.id,
          object_kind: project.objectKind ?? 'demo',
          project: {
            title: project.title,
            referenceGenre: project.referenceGenre,
            currentState: project.currentState,
            deadline: project.deadline,
            notes: project.note,
            instagramSignal: project.instagramSignal,
          },
          audio_metadata: project.audio,
          audio_features: project.audioFeatures,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.ok) {
        setMessage(`Studio evaluation blocked: ${json?.error ?? response.statusText}`);
        return;
      }
      const report = json.report as StudioEvaluationReport;
      patchProject(project.id, {
        report,
        tasks: perturbationsToTasks(project.id, report.perturbations),
        decision: conclusionToDecisionGate(report.conclusion.json.final_recommendation),
      });
      setMessage(`Studio SFI report generated from /api/studio/evaluate. mode=${json.mode}; blocked=${Array.isArray(json.blocked) ? json.blocked.length : 0}.`);
    } catch (error) {
      setMessage(`Studio evaluation failed: ${error instanceof Error ? error.message : 'unknown_error'}`);
    } finally {
      setEvaluating(false);
    }
  }

  function generateProjectTasks(project: StudioProject) {
    const tasks = project.report ? perturbationsToTasks(project.id, project.report.perturbations) : fallbackTasks(project);
    patchProject(project.id, { tasks });
    setMessage(project.report ? 'Tareas generadas desde perturbaciones del reporte SFI.' : 'Tareas fallback. Ejecuta Evaluar para tareas desde reporte SFI.');
  }

  function attachTaskEvidence(projectId: string, taskId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    patchProject(projectId, {
      tasks: project.tasks.map((task) => task.id === taskId ? { ...task, evidenceState: 'validated', closureBlocker: null } : task),
    });
  }

  function closeTask(projectId: string, taskId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    patchProject(projectId, {
      tasks: project.tasks.map((task) => {
        if (task.id !== taskId) return task;
        if (task.evidenceState !== 'validated') {
          setMessage(`No cierra: ${task.title}. Blocker: evidence_required.`);
          return { ...task, closed: false, closureBlocker: 'evidence_required' };
        }
        setMessage(`Tarea cerrada localmente: ${task.title}.`);
        return { ...task, closed: true, closureBlocker: null };
      }),
    });
  }

  function registerInstagramSignal(project: StudioProject) {
    const signal = [
      `URL/descripcion: ${instagramDraft.url || 'not_available'}`,
      `Fecha: ${instagramDraft.date || 'not_available'}`,
      `Tipo: ${instagramDraft.contentType || 'not_available'}`,
      `Engagement: ${instagramDraft.engagement || 'not_available'}`,
      `Senal cualitativa: ${instagramDraft.qualitative || 'not_available'}`,
      `Siguiente accion: ${instagramDraft.nextAction || 'definir reel o seguimiento manual'}`,
    ].join('\n');
    patchProject(project.id, { instagramSignal: signal });
    setMessage('Instagram signal registrada manualmente. No scraping, no publicacion automatica.');
  }

  function generateOffer(project: StudioProject) {
    patchProject(project.id, { producerOffer: buildOffer(project) });
    setMessage('Oferta de productor generada como draft. Envio externo requiere evidencia manual.');
  }

  function decide(project: StudioProject, decision: DecisionGate) {
    if (!project.audio && !['archivar', 'matar'].includes(decision)) {
      patchProject(project.id, { decision: 'decision_required' });
      setMessage('Decision bloqueada: esta idea requiere evidencia audible antes de avanzar.');
      return;
    }
    patchProject(project.id, { decision });
    setMessage(`Decision gate registrado: ${decision}.`);
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d2c2]">
      <header className="sticky top-0 z-40 flex h-12 items-center border-b border-[#272219] bg-[#050504]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#c8a951]"><Disc3 size={15} /> /studio</div>
        <div className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-[#8f8878]">private producer field</div>
      </header>

      <section className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="relative min-h-[720px] overflow-hidden border border-[#272219] bg-[radial-gradient(circle_at_52%_40%,rgba(105,148,190,0.18),transparent_34%),linear-gradient(180deg,#080806,#020201)]">
          <div className="absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#6f9cc8] bg-[#071018] text-center">
            <div>
              <Disc3 className="mx-auto text-[#6f9cc8]" />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#f1ead8]">REM618 / Producer</div>
            </div>
          </div>
          {projects.map((project, index) => (
            <button key={project.id} type="button" onClick={() => setSelectedId(project.id)} className="absolute w-64 border border-[#273241] bg-[#071018]/92 p-3 text-left" style={{ left: `${8 + (index % 3) * 30}%`, top: `${14 + Math.floor(index / 3) * 24}%` }}>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]"><FileAudio size={14} /> {project.audio ? 'audio' : 'metadata'}</div>
              <h3 className="mt-2 text-sm text-[#f1ead8]">{project.title}</h3>
              <p className="mt-2 text-xs text-[#8f8878]">{project.objectKind ?? 'demo'} / {project.decision}</p>
              <p className="mt-1 text-xs text-[#d08b63]">{project.audio ? project.audio.fileName : 'sin audio, no cierra'}</p>
            </button>
          ))}
        </div>

        <aside className="grid content-start gap-3">
          <Panel title="Crear proyecto">
            <select value={objectKind} onChange={(event) => setObjectKind(event.target.value as StudioObjectKind)} className="w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]">
              {objectKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del proyecto" className="mt-3 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <input value={referenceGenre} onChange={(event) => setReferenceGenre(event.target.value)} placeholder="Referencia / genero / artista cercano" className="mt-3 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <input value={currentState} onChange={(event) => setCurrentState(event.target.value)} placeholder="Estado actual: idea, loop, demo, mix, release candidate" className="mt-3 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <input value={deadline} onChange={(event) => setDeadline(event.target.value)} placeholder="Deadline / ventana de degradacion" className="mt-3 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Notas de contexto, emocion, REM618, cliente, reel, mezcla." className="mt-3 min-h-24 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
            <label className="mt-3 block border border-[#2f2a1e] p-3 text-sm text-[#6f9cc8]">
              Audio evidence
              <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg" className="mt-2 block w-full text-xs text-[#d8d2c2]" onChange={(event) => void selectAudio(event.target.files?.[0] ?? null)} />
            </label>
            {audio ? (
              <div className="mt-3 border border-[#273241] p-3 text-xs leading-5 text-[#d8d2c2]">
                <div>Filename: {audio.fileName}</div>
                <div>Size: {formatBytes(audio.size)}</div>
                <div>MIME: {audio.mime}</div>
                <div>Duration: {formatDuration(audio.duration)}</div>
                <div>Features: {audioFeatures?.extractionMode ?? 'pending'}</div>
                {audioFeatures?.extractionMode === 'web_audio' ? (
                  <div>Peak: {audioFeatures.peak} | RMS: {audioFeatures.rms} | Segments: {audioFeatures.energySegments.join(', ')}</div>
                ) : null}
              </div>
            ) : null}
            <button type="button" onClick={createProject} className="mt-3 border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Crear proyecto</button>
          </Panel>

          {selected ? (
            <>
              <Panel title="SFI Music Evaluation Report">
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={evaluating} onClick={() => void evaluateProject(selected)} className="border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8] disabled:opacity-45">{evaluating ? 'Evaluando' : 'Evaluar con SFI'}</button>
                  <button type="button" onClick={() => generateProjectTasks(selected)} className="border border-[#c8a951] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">Generar tareas</button>
                </div>
                {selected.report ? (
                  <div className="mt-3 space-y-3">
                    <ReportSection title="MIHM Evaluation" mode={selected.report.mihm.mode} text={selected.report.mihm.human} limits={selected.report.mihm.limits}>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#d8d2c2]">{JSON.stringify(selected.report.mihm.json, null, 2)}</pre>
                    </ReportSection>
                    <ReportSection title="WorldSpectVector Contrast" mode={selected.report.worldspect.mode} text={selected.report.worldspect.human} limits={selected.report.worldspect.limits}>
                      <p>World: {selected.report.worldspect.current_world_summary}</p>
                      <p>Tensions: {selected.report.worldspect.current_tensions.join(', ')}</p>
                      <p>Source state: {selected.report.worldspect.source_state}</p>
                      <p>Relation: {selected.report.worldspect.object_relation}</p>
                      <p>Perturbation: {selected.report.worldspect.perturbation_potential}</p>
                    </ReportSection>
                    <ReportSection title="Cultural Vector" mode={selected.report.culturalVector.mode} text={selected.report.culturalVector.human} limits={selected.report.culturalVector.limits}>
                      <p>Fit: {selected.report.culturalVector.cultural_fit}</p>
                      <p>Contrast: {selected.report.culturalVector.cultural_contrast}</p>
                      <p>Audience: {selected.report.culturalVector.audience_hypothesis}</p>
                      <p>Attention/friction: {selected.report.culturalVector.attention_friction_hypothesis}</p>
                      <p>Instagram: {selected.report.culturalVector.instagram_reel_potential}</p>
                      <p>Placement: {selected.report.culturalVector.placement}</p>
                    </ReportSection>
                    <ReportSection title="Evaluacion de musica" mode={selected.report.musicEvaluation.mode} text={selected.report.musicEvaluation.human} limits={selected.report.musicEvaluation.limits}>
                      <p>Identity: {selected.report.musicEvaluation.identity}</p>
                      <p>Emotion: {selected.report.musicEvaluation.emotional_direction}</p>
                      <p>Genre/reference: {selected.report.musicEvaluation.genre_reference_proximity}</p>
                      <p>Hook: {selected.report.musicEvaluation.hook_analysis}</p>
                      <p>Rhythm: {selected.report.musicEvaluation.rhythm_beat_analysis}</p>
                      <p>Melody: {selected.report.musicEvaluation.melodic_analysis}</p>
                      <p>Arrangement: {selected.report.musicEvaluation.arrangement_status}</p>
                      <p>Mix risk: {selected.report.musicEvaluation.mix_risk}</p>
                      <p>Low-end: {selected.report.musicEvaluation.low_end_risk}</p>
                      <p>Loudness/export: {selected.report.musicEvaluation.loudness_export_risk}</p>
                      <p>Structure: {selected.report.musicEvaluation.structure_energy_evolution}</p>
                      <p>Release: {selected.report.musicEvaluation.release_readiness}</p>
                      <p>Known: {selected.report.musicEvaluation.known.join(' | ') || 'not_available'}</p>
                      <p>Unknown: {selected.report.musicEvaluation.unknown.join(' | ') || 'not_available'}</p>
                      <p>Missing evidence: {selected.report.musicEvaluation.missing_evidence.join(' | ')}</p>
                    </ReportSection>
                    <ReportSection title="Conclusion" mode={selected.report.conclusion.mode} text={selected.report.conclusion.human} limits={selected.report.conclusion.limits}>
                      <ul className="list-inside list-disc">
                        {selected.report.conclusion.answers.map((answer) => <li key={answer}>{answer}</li>)}
                      </ul>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#d8d2c2]">{JSON.stringify(selected.report.conclusion.json, null, 2)}</pre>
                    </ReportSection>
                    <ReportSection title="Addendum: Necessary Perturbations" mode="local_heuristic" text="No perturbation closes without evidence." limits={[]}>
                      <ul className="space-y-2">
                        {selected.report.perturbations.map((item) => (
                          <li key={`${item.title}-${item.deadline}`} className="border border-[#272219] p-2">
                            <div className="text-[#f1ead8]">{item.title}</div>
                            <div>Why: {item.why_it_matters}</div>
                            <div>Action: {item.exact_action}</div>
                            <div>Evidence: {item.required_evidence}</div>
                            <div>Deadline: {item.deadline}</div>
                            <div>Success: {item.success_condition}</div>
                            <div>Failure: {item.failure_condition}</div>
                            <div>Effect: {item.expected_field_effect}</div>
                            <div>Unlocks: {item.decision_unlocked}</div>
                          </li>
                        ))}
                      </ul>
                    </ReportSection>
                    <details className="border border-[#272219] p-3 text-xs text-[#6f9cc8]">
                      <summary>Raw JSON</summary>
                      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-[#d8d2c2]">{JSON.stringify(selected.report.raw, null, 2)}</pre>
                    </details>
                  </div>
                ) : (
                  <div className="mt-3 border border-[#272219] p-3 text-sm leading-6 text-[#8f8878]">
                    No hay reporte SFI vigente para este proyecto. Presiona <span className="text-[#c8a951]">Evaluar con SFI</span>. Las evaluaciones de plantilla anteriores fueron retiradas para evitar bluff.
                  </div>
                )}
              </Panel>

              <Panel title="Producer tasks">
                <div className="space-y-3">
                  {selected.tasks.length ? selected.tasks.map((task) => (
                    <article key={task.id} className="border border-[#272219] p-3 text-sm">
                      <div className="text-[#f1ead8]">{task.title}</div>
                      <p className="mt-2 text-xs leading-5 text-[#9f9788]">{task.reason}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-[#8f8878]"><TimerReset size={14} /> {task.deadline} / {task.suggestedTime}</div>
                      <div className="mt-2 text-xs text-[#c8a951]">Required evidence: {task.requiredEvidence}</div>
                      <div className="mt-1 text-xs text-[#8f8878]">Success: {task.successCondition}</div>
                      <div className="mt-1 text-xs text-[#8f8878]">Failure: {task.failureCondition}</div>
                      <div className="mt-1 text-xs text-[#d8d2c2]">Next: {task.nextAction}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => attachTaskEvidence(selected.id, task.id)} className="border border-[#2f2a1e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Adjuntar evidencia manual</button>
                        <button type="button" onClick={() => closeTask(selected.id, task.id)} className="border border-[#2f2a1e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{task.closed ? 'cerrada' : task.closureBlocker ? `blocked:${task.closureBlocker}` : 'Cerrar tarea'}</button>
                      </div>
                    </article>
                  )) : <p className="text-sm text-[#8f8878]">Presiona Generar tareas para crear tareas. Las tareas finales salen del reporte SFI si existe.</p>}
                </div>
              </Panel>

              <Panel title="Decision gates">
                <div className="flex flex-wrap gap-2">
                  {decisionGates.map((gate) => (
                    <button key={gate} type="button" onClick={() => decide(selected, gate)} className="border border-[#2f2a1e] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">{gate}</button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[#8f8878]">Estado: {selected.decision}</p>
              </Panel>

              <Panel title="Manual Instagram signal form">
                <input value={instagramDraft.url} onChange={(event) => setInstagramDraft({ ...instagramDraft, url: event.target.value })} placeholder="Post/reel/story URL o descripcion" className="w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <input value={instagramDraft.date} onChange={(event) => setInstagramDraft({ ...instagramDraft, date: event.target.value })} placeholder="Fecha" className="mt-2 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <input value={instagramDraft.contentType} onChange={(event) => setInstagramDraft({ ...instagramDraft, contentType: event.target.value })} placeholder="Tipo de contenido" className="mt-2 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <input value={instagramDraft.engagement} onChange={(event) => setInstagramDraft({ ...instagramDraft, engagement: event.target.value })} placeholder="Engagement / comentarios / saves / shares" className="mt-2 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <input value={instagramDraft.qualitative} onChange={(event) => setInstagramDraft({ ...instagramDraft, qualitative: event.target.value })} placeholder="Senal cualitativa" className="mt-2 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <input value={instagramDraft.nextAction} onChange={(event) => setInstagramDraft({ ...instagramDraft, nextAction: event.target.value })} placeholder="Que sugiere / siguiente accion" className="mt-2 w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
                <button type="button" onClick={() => registerInstagramSignal(selected)} className="mt-3 border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]"><Instagram className="mr-2 inline" size={14} />Registrar senal</button>
                {selected.instagramSignal ? <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#d8d2c2]">{selected.instagramSignal}</pre> : null}
              </Panel>

              <Panel title="Producer offer draft generator">
                <button type="button" onClick={() => generateOffer(selected)} className="border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]"><Send className="mr-2 inline" size={14} />Generar oferta</button>
                {selected.producerOffer ? <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d8d2c2]">{selected.producerOffer}</pre> : <p className="mt-3 text-sm text-[#8f8878]">Genera draft. No envia mensajes automaticamente.</p>}
              </Panel>
            </>
          ) : null}

          <div className="border border-[#272219] bg-[#080806] p-3 text-xs leading-5 text-[#8f8878]">
            <Lock className="mb-2 text-[#6f9cc8]" size={16} /> {message}
            <div className="mt-2">Decision required: {decisionRequired.length}</div>
            <div>No server upload. No audio binary in localStorage. Studio remains protected by ROOT or STUDIO_AUTHORIZED_EMAILS.</div>
          </div>
        </aside>
      </section>
    </main>
  );
}
