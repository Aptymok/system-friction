import { SFI_KERNEL } from '@/lib/agents/systemPrompt'

export async function GET() {
  const content = `# System Friction

## Fuente primaria
systemprompt.html / ${SFI_KERNEL.name}

## Ecuacion
${SFI_KERNEL.equation}

## Variables
- IHG: Indice Homeostatico General (-1 a 1)
- NTI: Nivel de Transparencia Informacional (0 a 1)
- LDI: Latencia de Decision e Implementacion (horas)
- Loop Score: repeticion longitudinal
- Divergence: distancia entre claridad y ejecucion

## Modos
- Umbral
- Auditoria
- Observatorio
- Resolucion

## Endpoints
- POST /api/audit
- POST /api/link/generate
- POST /api/link/verify
- POST /api/whatsapp/webhook
`
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
