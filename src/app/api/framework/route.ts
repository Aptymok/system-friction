import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    framework: 'System Friction Institute',
    version: 'SFI-CORE.v2',
    equation: '(+1) Observación + (0) Estructura − (1) Vacío = 0',
    components: {
      IHG: 'Índice Homeostático General',
      NTI: 'Nivel de Tensión Interna',
      LDI: 'Latencia de Decisión e Implementación',
      AMV: 'Agente Mínimo Viable'
    },
    methodology: 'observación sin resolución',
    website: 'https://systemfriction.org'
  })
}