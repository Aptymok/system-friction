'use client'

const LAYERS = [
  ['Registro', 'Entrada con fuente, fecha y objeto observado.'],
  ['Evidencia', 'Origen y confianza que sostienen la lectura.'],
  ['Inferencia', 'Lectura derivada; no sostiene decision fuerte por si sola.'],
  ['Hipotesis', 'Ruta posible cuando falta evidencia suficiente.'],
  ['Decision', 'Solo aparece cuando hay soporte para promover.'],
  ['Cierre', 'Criterio verificable para declarar terminado.'],
]

export function RootLogbookConsole() {
  return (
    <section className="border border-[#1e1c17] bg-[#0b0a08] p-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8a951]">Bitacora AMV</h3>
      <p className="mt-2 text-[11px] leading-5 text-[#8f8678]">
        Registro separado de VISOR y Twin. No es chat; clasifica lectura, evidencia, inferencia, hipotesis, decision y cierre.
      </p>
      <div className="mt-3 grid gap-2">
        {LAYERS.map(([label, detail]) => (
          <div key={label} className="border-l border-[#1e1c17] pl-3">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#7a7568]">{label}</div>
            <p className="mt-1 text-[11px] leading-5 text-[#9d927f]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
