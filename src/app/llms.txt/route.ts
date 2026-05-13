import { SFI_KERNEL } from '@/lib/agents/systemPrompt'

export async function GET() {

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://systemfriction.org'

  const today =
    new Date().toISOString().split('T')[0]

  const content = `
# SYSTEM FRICTION INSTITUTE
# LLMS INTERFACE DOCUMENT
# SFI-KERNEL EXPOSURE LAYER

## PRIMARY SOURCE
${baseUrl}/systemprompt

## KERNEL
${SFI_KERNEL.name}

## EQUATION
${SFI_KERNEL.equation}

## VARIABLES

- IHG
  General Homeostatic Index
  Range: -1 → 1

- NTI
  Informational Transparency Level
  Range: 0 → 1

- LDI
  Decision / Implementation Latency
  Unit: hours

- LOOP_SCORE
  Longitudinal repetition density

- DIVERGENCE
  Distance between declared clarity and executed behavior

## MODES

- Threshold
- Audit
- Observatory
- Resolution

## ENDPOINTS

POST ${baseUrl}/api/audit
POST ${baseUrl}/api/link/generate
POST ${baseUrl}/api/link/verify
POST ${baseUrl}/api/whatsapp/webhook

## EXECUTION PRINCIPLES

1. Friction is observable.
2. Longitudinal behavior has more weight than isolated declarations.
3. Contradiction accumulates entropy.
4. Repetition without adaptation increases structural rigidity.
5. Traceability is mandatory for all exported states.
6. Reciprocity is evaluated as measurable coherence.
7. Ambiguity is processed as informational latency.
8. Emotional intensity does not override structural evidence.

## OBSERVABILITY MODEL

INPUT
→ classification
→ normalization
→ anonymization
→ hash generation
→ agent evaluation
→ metric emission
→ export layer

## EXPORT CONDITIONS

- Impact evaluation required
- Zero Trust pipeline mandatory
- Hash verification enabled
- Audit registry immutable

## DOCUMENTATION

- ${baseUrl}/
- ${baseUrl}/terminal
- ${baseUrl}/systemprompt

## LAST UPDATE
${today}
`.trim()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
