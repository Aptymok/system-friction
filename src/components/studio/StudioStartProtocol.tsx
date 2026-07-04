const studioTruth = [
  {
    label: 'ACCESS',
    value: 'Private route. ROOT/system users pass. Studio collaborators pass only through STUDIO_AUTHORIZED_EMAILS.',
    state: 'protected',
  },
  {
    label: 'PERSISTENCE',
    value: 'localStorage stores metadata, reports, tasks and decisions. Audio binary is not uploaded or stored.',
    state: 'local-only',
  },
  {
    label: 'EVALUATION',
    value: 'The console calls /api/studio/evaluate with safe metadata and Web Audio features when the browser can decode the file.',
    state: 'live endpoint',
  },
  {
    label: 'BOUNDARY',
    value: 'No scraping. No automatic publishing. No ROOT mutation from Studio. No closure without evidence.',
    state: 'non-negotiable',
  },
];

const firstSession = [
  'Create one concrete project: REM618 fragment, beat, loop, demo, client note, reference or Instagram signal.',
  'Attach audio evidence when available. The browser extracts duration, peak, RMS, clipping risk and segment energy locally.',
  'Run Evaluar con SFI. Read mode labels before acting: real_engine, local_audio_features, local_heuristic, source_unavailable or blocked_safe_contract.',
  'Generate tasks from the report. Fallback tasks are allowed only when the report has not been executed.',
  'Close tasks only after manual evidence is attached. The system must not convert intention into closure.',
  'Register Instagram signals manually. Studio records pressure; it does not scrape or publish.',
  'Generate producer offer only as draft. External sending remains manual and evidence-based.',
];

const lanes = [
  {
    title: 'REM618 continuity',
    description: 'Keeps artistic persistence legible without forcing every object into the same attractor.',
  },
  {
    title: 'Producer portfolio',
    description: 'Converts usable fragments into proof loops, reference checks, short demos and client-facing offers.',
  },
  {
    title: 'Client acquisition',
    description: 'Separates pitchable material from private experiments through decision gates and required evidence.',
  },
  {
    title: 'Cultural signal',
    description: 'Accepts manual Instagram/community observations without pretending live social scraping exists.',
  },
];

export default function StudioStartProtocol() {
  return (
    <section className="border-b border-[#272219] bg-[#050504] px-4 py-6 text-[#d8d2c2]">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="border border-[#272219] bg-[radial-gradient(circle_at_18%_20%,rgba(111,156,200,0.16),transparent_28%),linear-gradient(180deg,#090907,#030302)] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#6f9cc8]">SFI Studio / Start Protocol</div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-[#f1ead8] md:text-5xl">
            Private producer field for REM618, Edwing, portfolio pressure and evidence-based closure.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9f9788]">
            Studio is not a public dashboard and not a mockup layer. It is the operational intake for music objects, manual cultural signals, producer tasks and decision gates. The console below already performs the execution; this block defines the first-session contract before entering it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#studio-console" className="border border-[#6f9cc8] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6f9cc8]">
              Enter console
            </a>
            <a href="/repository" className="border border-[#2f2a1e] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#c8a951]">
              Evidence repository
            </a>
          </div>
        </div>

        <div className="grid gap-3">
          {studioTruth.map((item) => (
            <article key={item.label} className="border border-[#272219] bg-[#080806] p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">{item.label}</h2>
                <span className="border border-[#2f2a1e] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#6f9cc8]">{item.state}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#d8d2c2]">{item.value}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="border border-[#272219] bg-[#080806] p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Operational lanes</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {lanes.map((lane) => (
              <article key={lane.title} className="border border-[#272219] p-3">
                <h3 className="text-sm text-[#f1ead8]">{lane.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#9f9788]">{lane.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="border border-[#272219] bg-[#080806] p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">First session sequence</h2>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-[#d8d2c2]">
            {firstSession.map((step, index) => (
              <li key={step} className="grid grid-cols-[28px_1fr] gap-2">
                <span className="font-mono text-[10px] text-[#6f9cc8]">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
