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
${baseUrl}/montecarlo

## VARIABLES

IHG
NTI
LDI
LOOP_SCORE
DIVERGENCE

## PRINCIPLES

- Friction is measurable
- Contradiction accumulates entropy
- Longitudinal behavior outweighs isolated declarations
- Outputs are probabilistic
- Human cognition is dynamic

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