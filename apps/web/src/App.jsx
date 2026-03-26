import React from 'react'
import './index.css'

export default function App() {
  return (
    <main className="landing">
      <header>
        <h1>SystemFriction</h1>
        <p className="tagline">Motor MIHM Personal — Conoce y proyecta tu fricción sistémica</p>
      </header>
      <section className="hero">
        <h2>Inicia Plática</h2>
        <p>
          SystemFriction usa el motor MIHM para analizar tu estado cognitivo,
          simular escenarios de evolución y generar un plan de acciones por micro-tics.
        </p>
        <button className="cta" onClick={() => alert('Próximamente: app iOS disponible')}>
          Inicia Plática →
        </button>
      </section>
      <section className="what">
        <h3>¿Qué es MIHM Personal?</h3>
        <ul>
          <li><strong>IHG</strong> — Índice de Homeostasis Global: mide el equilibrio de tu sistema.</li>
          <li><strong>NTI</strong> — Nivel de Tensión Interna: la presión acumulada.</li>
          <li><strong>R</strong> — Resiliencia: capacidad de recuperación.</li>
          <li><strong>IAD</strong> — Índice de Atención Distribuida.</li>
          <li><strong>ETE</strong> — Eficiencia de Transición de Estado.</li>
        </ul>
        <p>
          El motor genera 3 escenarios (consenso, eficiencia, wildcard) y un plan
          de micro-acciones para alcanzar el estado objetivo.
        </p>
      </section>
      <footer>
        <p>SystemFriction v2 · <a href="https://github.com/aptymok/system-friction">GitHub</a></p>
      </footer>
    </main>
  )
}
