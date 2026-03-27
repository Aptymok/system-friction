import React, { useState } from 'react'

const SECTIONS = [
  {
    id: 'mihm-ode',
    title: 'MIHM — Sistema ODE',
    formulas: [
      {
        label: 'dIHG/dt',
        expr: 'α·(1 − NTI) − (1 − R)·0.15 + ξ(t)',
        desc: 'La homeostasis crece con baja tensión y alta resiliencia. ξ(t) es ruido seeded.',
      },
      {
        label: 'dNTI/dt',
        expr: '−β·NTI + (1 − IHG)·0.10 + u·0.05',
        desc: 'La tensión decae naturalmente pero se alimenta de IHG bajo. u es el control Pontryagin.',
      },
      {
        label: 'dR/dt',
        expr: 'γ·(1 − R)·ETE − NTI·0.08',
        desc: 'Resiliencia crece cuando ETE es alta y NTI no la erosiona.',
      },
      {
        label: 'dIAD/dt',
        expr: 'δ·(R − IAD) − NTI·0.05',
        desc: 'Atención distribuida converge a R; tensión la degrada.',
      },
      {
        label: 'dETE/dt',
        expr: 'η·(R·0.5 + IAD·0.5 − ETE)',
        desc: 'Eficiencia de transición converge al promedio de R e IAD.',
      },
    ],
  },
  {
    id: 'pontryagin',
    title: 'Control de Pontryagin',
    formulas: [
      {
        label: 'u*(t)',
        expr: 'u = −K · NTI,   K = √(1.2 / 0.75) ≈ 1.265',
        desc: 'Control óptimo que minimiza la integral de NTI² + u² sobre horizonte T. K se deriva de las condiciones de optimalidad del Hamiltoniano.',
      },
      {
        label: 'Fricción Sistémica',
        expr: 'F = NTI·0.4 + (1−R)·0.3 + (1−ETE)·0.3',
        desc: 'Métrica escalar agregada. F > 0.75 → COLLAPSE, > 0.6 → CRITICAL, > 0.4 → DEGRADED.',
      },
    ],
  },
  {
    id: 'socsim',
    title: 'SocSim Ψ — ODE Acoplado',
    formulas: [
      {
        label: 'dA/dt',
        expr: '(intensity·0.8 − A)·0.3 + ξ',
        desc: 'Activación converge hacia la intensidad del texto entrante.',
      },
      {
        label: 'dP/dt',
        expr: '(polarization − P)·0.2 + T·0.08 − C·0.05 + ξ',
        desc: 'Polarización se alimenta de la tensión y es mitigada por coherencia.',
      },
      {
        label: 'dC/dt',
        expr: '(coherence − C)·0.2 − P·0.06 + S·0.04 + ξ',
        desc: 'Coherencia converge a la coherencia textual; P la erosiona, S la sostiene.',
      },
      {
        label: 'dT/dt',
        expr: '(tension − T)·0.25 + X·0.06 + shock·0.1 + ξ',
        desc: 'Tensión sistémica responde a la tensión textual, fricción y shocks externos.',
      },
      {
        label: 'dR/dt',
        expr: '((1−T)·0.5 + C·0.3 − P·0.2 − R)·0.08 + ξ',
        desc: 'Resiliencia Ψ es promovida por baja tensión y alta coherencia.',
      },
      {
        label: 'FSoc',
        expr: 'FSoc = T·0.4 + P·0.3 + X·0.3',
        desc: 'Fricción social. Aggregado de tensión, polarización y fricción sistémica Ψ.',
      },
      {
        label: 'RSoc',
        expr: 'RSoc = R·0.5 + C·0.3 + S·0.2',
        desc: 'Resiliencia social. Ponderada por R, coherencia y sincronía.',
      },
      {
        label: 'FractureRisk',
        expr: 'FR = T·0.5 + P·0.3 + (1−R)·0.2',
        desc: 'Riesgo de fractura sistémica. FR > 0.6 indica bifurcación inminente.',
      },
    ],
  },
  {
    id: 'retro-b',
    title: 'Retro Mode B — Transformación Heatmap',
    formulas: [
      {
        label: 'Paso 1: Inversión',
        expr: 'v\'ᵢ = 1 − vᵢ   ∀ i ∈ [0, 32²)',
        desc: 'Inversión bit a bit del campo escalar. Transforma el mapa de calor en su complemento.',
      },
      {
        label: 'Paso 2: Perturbación',
        expr: 'v\'ᵢ = clamp(vᵢ + jitter − scanline,  0, 1)',
        desc: 'jitter ~ U(−0.14, +0.14) por pixel. scanline = 0.10 cada 3ª fila. Introduce degradación analógica.',
      },
      {
        label: 'Paso 3: φ Inversion (curva no lineal)',
        expr: 'v\'ᵢ = σ_φ(vᵢ) = 1 / (1 + exp(−(2vᵢ−1)·π·φ / φ))',
        desc: 'φ = 1.6180339887 (razón áurea). Curva sigmoidal paramétrica que comprime extremos y amplifica midtones.',
      },
    ],
  },
  {
    id: 'integrador',
    title: 'Integrador RK4',
    formulas: [
      {
        label: 'Método Runge-Kutta 4',
        expr: 'x(t+dt) = x + (dt/6)·(k₁ + 2k₂ + 2k₃ + k₄)',
        desc: '',
      },
      {
        label: 'k₁..k₄',
        expr: 'k₁=f(x),  k₂=f(x+k₁·dt/2),  k₃=f(x+k₂·dt/2),  k₄=f(x+k₃·dt)',
        desc: 'Cuatro evaluaciones del campo vectorial f en puntos intermedios. Error O(dt⁵) por paso.',
      },
    ],
  },
]

export default function MathExtender() {
  const [open, setOpen] = useState({ 'mihm-ode': true })

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <>
      <div className="sec">
        <div className="sec-hd">
          <span className="sec-n">01</span>
          <span className="sec-t">Math Extender</span>
        </div>
        <div className="sec-d">
          Documentación matemática del motor MIHM, SocSim Ψ, control de Pontryagin e integrador RK4.
          Todas las ecuaciones corresponden exactamente al código en ejecución.
        </div>
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.id} className="sec">
          <div
            className="sec-hd"
            style={{cursor:'pointer'}}
            onClick={() => toggle(sec.id)}
          >
            <span className="sec-n">{sec.id}</span>
            <span className="sec-t">{sec.title}</span>
            <span style={{marginLeft:'auto',fontSize:10,fontFamily:'monospace',color:'var(--t3)'}}>
              {open[sec.id] ? '▲' : '▼'}
            </span>
          </div>

          {open[sec.id] && sec.formulas.map((f, i) => (
            <div key={i} className="math-section">
              <div className="math-section-ttl">{f.label}</div>
              <div className="math-formula">{f.expr}</div>
              {f.desc && <div className="math-desc">{f.desc}</div>}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
