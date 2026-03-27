import React, { useState } from 'react'
import './index.css'

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="page">
      <Nav />
      <main>
        <HeroSection onCTA={() => setChatOpen(true)} />
        <MetricsSection />
        <HowItWorksSection />
        <MIHMPersonalSection />
        <InstallSection />
      </main>
      <Footer />
      {chatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}
    </div>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="nav">
      <span className="nav-logo">SF²</span>
      <div className="nav-links">
        <a href="#como">Cómo funciona</a>
        <a href="#mihm">MIHM Personal</a>
        <a href="#instalar">Instalar</a>
      </div>
    </nav>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ onCTA }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="badge">Motor MIHM v2 · iOS-first</span>
        <h1>SystemFriction</h1>
        <p className="hero-sub">
          Mide tu fricción sistémica. Simula escenarios de evolución personal.
          Genera un plan de micro-acciones con el motor MIHM.
        </p>
        <div className="hero-ctas">
          <button className="cta-primary" onClick={onCTA}>
            Inicia Plática →
          </button>
          <a className="cta-secondary" href="#como">Ver cómo funciona</a>
        </div>
      </div>
      <div className="hero-metrics">
        <MiniMetric label="IHG" value="0.62" color="var(--blue)" desc="Homeostasis" />
        <MiniMetric label="NTI" value="0.34" color="var(--orange)" desc="Tensión" />
        <MiniMetric label="R" value="0.78" color="var(--green)" desc="Resiliencia" />
        <MiniMetric label="F" value="0.18" color="var(--red)" desc="Fricción" />
      </div>
    </section>
  )
}

function MiniMetric({ label, value, color, desc }) {
  return (
    <div className="mini-metric">
      <span className="mm-label" style={{ color }}>{label}</span>
      <span className="mm-value">{value}</span>
      <span className="mm-desc">{desc}</span>
    </div>
  )
}

// ── Métricas ──────────────────────────────────────────────────────────────────

function MetricsSection() {
  const metrics = [
    { label: 'IHG', full: 'Índice de Homeostasis Global', color: 'var(--blue)',
      desc: 'Mide el equilibrio entre demanda y capacidad del sistema cognitivo. Rango [-1, 1].' },
    { label: 'NTI', full: 'Nivel de Tensión Interna', color: 'var(--orange)',
      desc: 'Presión acumulada en el sistema. Alta NTI reduce la capacidad de procesamiento.' },
    { label: 'R', full: 'Resiliencia', color: 'var(--green)',
      desc: 'Velocidad y profundidad de recuperación ante perturbaciones.' },
    { label: 'IAD', full: 'Índice de Atención Distribuida', color: 'var(--purple)',
      desc: 'Calidad de la atención distribuida entre múltiples tareas.' },
    { label: 'ETE', full: 'Eficiencia de Transición de Estado', color: 'var(--teal)',
      desc: 'Qué tan rápido el sistema transita entre estados (estrés ↔ calma).' },
  ]

  return (
    <section className="metrics-section" id="mihm">
      <h2>Métricas MIHM</h2>
      <p className="section-sub">El motor calcula 5 indicadores de tu estado cognitivo en tiempo real.</p>
      <div className="metrics-grid">
        {metrics.map(m => (
          <div key={m.label} className="metric-card">
            <span className="mc-label" style={{ color: m.color }}>{m.label}</span>
            <span className="mc-full">{m.full}</span>
            <p className="mc-desc">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    { n: '01', title: 'Captura', desc: 'Texto, voz (STT), cara (Vision) y audio (SoundAnalysis) → CognitiveSnapshot.' },
    { n: '02', title: 'Simula', desc: 'El motor MIHM corre la ODE dinámica con tu snapshot como estado inicial.' },
    { n: '03', title: 'Debate', desc: 'SHINJI/REI/SHADOW/KAWORU votan y argumentan sobre 8 escenarios generados.' },
    { n: '04', title: 'Elige', desc: 'Selecciona entre consenso, eficiencia o wildcard.' },
    { n: '05', title: 'Actúa', desc: 'El sistema genera un plan de micro-acciones por tics. Márcalos conforme avanzas.' },
  ]

  return (
    <section className="how-section" id="como">
      <h2>Cómo funciona</h2>
      <div className="steps">
        {steps.map(s => (
          <div key={s.n} className="step">
            <span className="step-n">{s.n}</span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── MIHM Personal ─────────────────────────────────────────────────────────────

function MIHMPersonalSection() {
  return (
    <section className="personal-section">
      <div className="personal-content">
        <h2>MIHM Personal</h2>
        <p>
          El motor MIHM fue diseñado originalmente para sistemas sociotécnicos.
          <strong> MIHM Personal</strong> lo adapta para el estado cognitivo individual:
          una herramienta de autoconocimiento cuantitativo.
        </p>
        <ul className="personal-list">
          <li>Captura multimodal en tu iPhone (voz + cara + audio)</li>
          <li>Simulación determinista con seed reproducible</li>
          <li>Debate real entre 4 agentes con perspectivas distintas</li>
          <li>Plan accionable por micro-tics (objetivos → micro-objetivos → criterios)</li>
          <li>Trazabilidad radical: cada output guarda inputs_hash, seed, versión del motor</li>
        </ul>
        <div className="personal-badge">
          <span>Privacidad by design</span>
          <p>Todo corre en tu dispositivo. Sin servidor central. Sin tus datos en la nube.</p>
        </div>
      </div>
    </section>
  )
}

// ── Instalar ──────────────────────────────────────────────────────────────────

function InstallSection() {
  return (
    <section className="install-section" id="instalar">
      <h2>Instalar</h2>
      <div className="install-steps">
        <div className="install-card">
          <h3>iOS (principal)</h3>
          <ol>
            <li>Clona el repositorio: <code>git clone github.com/aptymok/system-friction</code></li>
            <li>Abre <code>apps/ios/SystemFriction.xcodeproj</code> en Xcode 15+</li>
            <li>Selecciona tu dispositivo y presiona ▶</li>
            <li>Acepta los permisos de micrófono, cámara y reconocimiento de voz</li>
          </ol>
        </div>
        <div className="install-card">
          <h3>Web (esta landing)</h3>
          <ol>
            <li><code>cd apps/web && npm install</code></li>
            <li><code>npm run dev</code></li>
            <li>Abre <code>localhost:5173</code></li>
          </ol>
        </div>
      </div>
    </section>
  )
}

// ── Chat Widget (Inicio de Plática embebible) ─────────────────────────────────

function ChatWidget({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'eidolon', text: '¡Hola! Soy el Salón Eidelon. ¿Cómo te sientes hoy? Cuéntame en una frase.' }
  ])
  const [input, setInput] = useState('')

  function send() {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    const response = generateWebResponse(input)
    setMessages(prev => [...prev, userMsg, { role: 'eidolon', text: response }])
    setInput('')
  }

  return (
    <div className="chat-widget">
      <div className="chat-header">
        <span>Salón Eidelon</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Escribe algo..."
        />
        <button onClick={send}>→</button>
      </div>
    </div>
  )
}

function generateWebResponse(text) {
  const lower = text.toLowerCase()
  if (lower.includes('bien') || lower.includes('excelente')) {
    return 'Interesante. Tu IHG estimado es positivo. Para un análisis completo, instala la app iOS y captura con voz + cámara.'
  }
  if (lower.includes('mal') || lower.includes('estrés') || lower.includes('cansado')) {
    return 'Tu NTI parece elevada. El motor MIHM puede ayudarte a identificar el origen de esa tensión. ¿Quieres instalar la app?'
  }
  return 'Fascinante. El motor MIHM necesita más datos para calcular tu fricción. ¿Quieres instalar la app iOS para captura completa?'
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="footer">
      <p>SystemFriction v2 · Motor MIHM Personal · CC BY 4.0 · Juan Antonio Marín Liera</p>
      <p><a href="https://github.com/aptymok/system-friction">GitHub</a></p>
    </footer>
  )
}
