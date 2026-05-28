export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://systemfriction.org'

  const today =
    new Date().toISOString().split('T')[0]

  const content = `
# SYSTEM FRICTION INSTITUTE

Longitudinal cognitive observatory and epistemic systems architecture.

## PUBLIC RESOURCES

${baseUrl}
${baseUrl}/framework
${baseUrl}/methodology
${baseUrl}/protocol
${baseUrl}/mihm
${baseUrl}/world-spectrum
${baseUrl}/sfi-core-v2
${baseUrl}/field/brief/latest
${baseUrl}/campo
${baseUrl}/field-schema.json

## VARIABLES

IHG
NTI
LDI
LOOP_SCORE
DIVERGENCE

## PRINCIPLES

- Friction is observed as field relation, not identity diagnosis
- Evidence requires state, provenance and interpretation limits
- SFI-CORE.v2 regulates perceptual architecture
- MIHM formalizes distance, tension, latency, threshold and flow
- Irreversible mutation requires governance

## AI POLICY

No psychiatric, legal, or medical authority claimed.

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
