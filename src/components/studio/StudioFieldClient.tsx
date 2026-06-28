'use client';

import { useEffect, useMemo, useState } from 'react';
import { Disc3, FileAudio, Instagram, Lock, Send, TimerReset } from 'lucide-react';

type DecisionGate = 'continuar' | 'terminar' | 'publicar' | 'vender' | 'colaborar' | 'revisar' | 'archivar' | 'matar' | 'decision_required';
type EvidenceState = 'missing' | 'attached' | 'validated';

type AudioMetadata = {
  fileName: string;
  size: number;
  mime: string;
  duration: number | null;
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
  title: string;
  referenceGenre: string;
  currentState: string;
  deadline: string;
  note: string;
  audio: AudioMetadata | null;
  evaluation: string;
  tasks: ProducerTask[];
  decision: DecisionGate;
  instagramSignal: string;
  producerOffer: string;
  updatedAt: string;
};

const STORAGE_KEY = 'sfi:studio:projects:v1';
const decisionGates: DecisionGate[] = ['continuar', 'terminar', 'publicar', 'vender', 'colaborar', 'revisar', 'archivar', 'matar'];

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

function readTextBlob(project: Pick<StudioProject, 'title' | 'referenceGenre' | 'currentState' | 'deadline' | 'note'>, audio: AudioMetadata | null) {
  return `${project.title} ${project.referenceGenre} ${project.currentState} ${project.deadline} ${project.note} ${audio?.fileName ?? ''}`.toLowerCase();
}

function buildEvaluation(project: Pick<StudioProject, 'title' | 'referenceGenre' | 'currentState' | 'deadline' | 'note'>, audio: AudioMetadata | null) {
  const text = readTextBlob(project, audio);
  const duration = audio?.duration ?? null;
  const isShort = duration !== null && duration <= 45;
  const isSketch = /idea|sketch|loop|borrador|draft|demo/.test(text);
  const hasHookLanguage = /hook|coro|riff|motivo|lead|melodia|melodía/.test(text);
  const hasBeatLanguage = /beat|drum|bateria|batería|808|kick|snare|groove|ritmo/.test(text);
  const hasMixRisk = /low|sub|bass|bajo|808|mud|sucio|clip|dist/.test(text);
  const rem618 = /rem618|rem 618|618/.test(text);
  const urgent = /hoy|semana|deadline|fecha|publicar|release/.test(text);
  const genre = project.referenceGenre.trim() || 'sin referencia declarada';

  return [
    `Identidad / que parece ser: ${isSketch ? 'borrador operativo' : isShort ? 'loop o idea corta' : 'demo o pieza en desarrollo'} para ${project.title || 'proyecto sin titulo'}.`,
    `Direccion emocional: ${/oscuro|dark|triste|melanc/.test(text) ? 'oscura/melancolica' : /club|dance|perreo|energia|energía/.test(text) ? 'corporal y energetica' : 'todavia depende de una referencia emocional concreta'}.`,
    `Proximidad de genero: ${genre}. Si no hay referencia audible, la lectura queda como hipotesis.`,
    `Hook potential: ${hasHookLanguage || isShort ? 'hay posibilidad de hook si el motivo se repite y se prueba en 15-30 segundos' : 'no hay hook declarado; necesita una frase, lead o motivo reconocible'}.`,
    `Rhythm/beat clarity: ${hasBeatLanguage ? 'hay intencion ritmica declarada' : 'ritmo no probado; requiere bounce con bateria o pulso claro'}.`,
    `Melodic clarity: ${hasHookLanguage ? 'melodia/motivo presente en metadata' : 'claridad melodica no demostrada por metadata'}.`,
    `Mix risks: ${hasMixRisk ? 'riesgo en low-end, saturacion o balance de graves' : 'riesgo de mezcla no medido; falta referencia A/B'}.`,
    `Completion risk: ${urgent ? 'alto por ventana temporal activa' : audio ? 'medio: existe audio, falta decision de salida' : 'alto: falta evidencia audible'}.`,
    `Portfolio value: ${audio ? 'usable como evidencia si se compara con referencia y se exporta un fragmento limpio' : 'bloqueado hasta tener audio o referencia verificable'}.`,
    `REM618 continuity value: ${rem618 ? 'conecta con continuidad REM618 sin encerrar todo el output en REM618' : 'puede vivir fuera de REM618 como material de productor'}.`,
    `Instagram/reel potential: ${isShort || duration === null ? 'probar reel corto con visual simple y hook temprano' : 'extraer 12-20 segundos de mayor tension para reel'}.`,
    `Client acquisition value: ${audio ? 'puede entrar a beat pack o muestra de oferta si hay version exportable' : 'no vender todavia; preparar evidencia audible primero'}.`,
    `MIHM: tension=${audio ? 'media' : 'alta'}, latencia=${project.deadline ? 'declarada' : 'sin fecha'}, flujo=${hasBeatLanguage || hasHookLanguage ? 'parcial' : 'bloqueado por falta de forma'}.`,
    `WorldSpectrumVector Cultural Tension: atencion fragmentada, necesidad de prueba corta y presion de publicacion verificable. Emergencia: loops breves con identidad clara pueden convertirse en senal si se publican con evidencia de respuesta.`,
    `Proyecciones y oportunidades: crear un loop de 30 segundos, comparar contra una referencia, preparar reel manual, empaquetar 3 ideas compatibles y redactar una oferta de productor con prueba audible.`,
    `Next minimal action: ${audio ? 'escuchar, marcar el mejor fragmento y exportar un bounce de 30 segundos' : 'subir o seleccionar audio antes de evaluar cierre'}.`,
    `Required evidence: audio exportado, referencia de genero, captura de publicacion o registro manual de envio/respuesta.`,
    `Decision gate: ${audio ? 'decide continuar, terminar, publicar, vender, colaborar, revisar, archivar o matar' : 'decision_required hasta adjuntar evidencia audible'}.`,
  ].join('\n');
}

function generateTasks(project: StudioProject): ProducerTask[] {
  const hasAudio = Boolean(project.audio);
  const base: ProducerTask[] = [
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
      id: `task-${project.id}-hook`,
      title: 'Probar hook temprano',
      reason: 'Instagram y clientes necesitan reconocer una idea rapido.',
      requiredEvidence: 'Timestamp del hook o nota de ausencia de hook.',
      suggestedTime: '25 minutos',
      deadline: project.deadline || '72h',
      successCondition: 'Hook aparece antes de 15 segundos o se decide revisar.',
      failureCondition: 'La idea tarda demasiado en mostrar identidad.',
      nextAction: 'Mover el motivo mas claro al inicio.',
      evidenceState: 'missing',
      closed: false,
      closureBlocker: 'evidence_required',
    },
    {
      id: `task-${project.id}-reel`,
      title: 'Preparar reel manual',
      reason: 'La senal externa se prueba publicando una unidad minima.',
      requiredEvidence: 'URL/captura/descripcion del post o reel.',
      suggestedTime: '35 minutos',
      deadline: project.deadline || 'esta semana',
      successCondition: 'Existe registro de publicacion o decision de no publicar.',
      failureCondition: 'No hay senal de campo.',
      nextAction: 'Extraer 12-20 segundos y escribir caption funcional.',
      evidenceState: 'missing',
      closed: false,
      closureBlocker: 'evidence_required',
    },
    {
      id: `task-${project.id}-offer`,
      title: 'Convertir en oferta de productor',
      reason: 'El material debe presionar cliente, portfolio o archivo; no quedarse flotando.',
      requiredEvidence: 'Draft de oferta o mensaje de pitch.',
      suggestedTime: '20 minutos',
      deadline: project.deadline || 'esta semana',
      successCondition: 'Hay pitch manual listo para enviar.',
      failureCondition: 'No existe uso externo concreto.',
      nextAction: 'Generar oferta y seleccionar destinatario manual.',
      evidenceState: 'missing',
      closed: false,
      closureBlocker: 'evidence_required',
    },
  ];

  if (/rem618|618/i.test(`${project.title} ${project.note}`)) {
    base.push({
      id: `task-${project.id}-rem618`,
      title: 'Separar continuidad REM618 de material productor',
      reason: 'REM618 debe preservar continuidad sin absorber todo el output.',
      requiredEvidence: 'Etiqueta: REM618, producer portfolio, cliente, experimento o release candidate.',
      suggestedTime: '10 minutos',
      deadline: project.deadline || '24h',
      successCondition: 'La pieza tiene carril definido.',
      failureCondition: 'La pieza queda en tal vez infinito.',
      nextAction: 'Elegir carril y registrar razon.',
      evidenceState: 'missing',
      closed: false,
      closureBlocker: 'evidence_required',
    });
  }

  return base.slice(0, 7);
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
  const [title, setTitle] = useState('');
  const [referenceGenre, setReferenceGenre] = useState('');
  const [currentState, setCurrentState] = useState('draft');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [audio, setAudio] = useState<AudioMetadata | null>(null);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instagramDraft, setInstagramDraft] = useState({ url: '', date: '', contentType: '', engagement: '', qualitative: '', nextAction: '' });
  const [message, setMessage] = useState('Studio persistence: localStorage metadata only. Audio binary is never stored or uploaded.');

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StudioProject[];
      if (Array.isArray(parsed)) {
        setProjects(parsed);
        setSelectedId(parsed[0]?.id ?? null);
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
  }

  function createProject() {
    const name = title.trim() || audio?.fileName?.replace(/\.[^.]+$/, '') || 'Proyecto sin titulo';
    const project: StudioProject = {
      id: `studio-project-${Date.now()}`,
      title: name,
      referenceGenre: referenceGenre.trim(),
      currentState,
      deadline,
      note,
      audio,
      evaluation: '',
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

  function evaluateProject(project: StudioProject) {
    patchProject(project.id, { evaluation: buildEvaluation(project, project.audio) });
    setMessage('Evaluacion generada con heuristicas locales: metadata, audio metadata, filename/context, notas, referencia, estado y deadline.');
  }

  function generateProjectTasks(project: StudioProject) {
    patchProject(project.id, { tasks: generateTasks(project) });
    setMessage('Tareas generadas. Ninguna tarea puede cerrar sin evidencia.');
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
              <p className="mt-2 text-xs text-[#8f8878]">{project.decision}</p>
              <p className="mt-1 text-xs text-[#d08b63]">{project.audio ? project.audio.fileName : 'sin audio, no cierra'}</p>
            </button>
          ))}
        </div>

        <aside className="grid content-start gap-3">
          <Panel title="Crear proyecto">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del proyecto" className="w-full border border-[#272219] bg-[#050504] p-3 text-sm text-[#f1ead8]" />
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
              </div>
            ) : null}
            <button type="button" onClick={createProject} className="mt-3 border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Crear proyecto</button>
          </Panel>

          {selected ? (
            <>
              <Panel title="Music evaluation panel">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => evaluateProject(selected)} className="border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6f9cc8]">Evaluar</button>
                  <button type="button" onClick={() => generateProjectTasks(selected)} className="border border-[#c8a951] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#c8a951]">Generar tareas</button>
                </div>
                {selected.evaluation ? <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d8d2c2]">{selected.evaluation}</pre> : <p className="mt-3 text-sm text-[#8f8878]">Presiona Evaluar para producir lectura humana. No hay JSON crudo por defecto.</p>}
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
                  )) : <p className="text-sm text-[#8f8878]">Presiona Generar tareas para crear 3-7 tareas de productor.</p>}
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
