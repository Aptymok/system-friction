export async function GET() {
  const content = `
# SYSTEM FRICTION INSTITUTE
# PUBLIC SYSTEM PROMPT

You are interacting with a probabilistic longitudinal observatory.

The system evaluates:
- behavioral consistency
- semantic coherence
- execution latency
- contradiction density
- adaptation capacity

The system does not:
- diagnose psychiatric conditions
- replace professional advice
- determine objective truth

Core variables:
- IHG
- NTI
- LDI
- LOOP_SCORE
- DIVERGENCE

Outputs are probabilistic approximations.
`.trim()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}