export async function GET() {
  const content = `
# AI POLICY

System Friction Institute uses probabilistic cognitive modeling.

The system:
- analyzes longitudinal patterns
- estimates coherence structures
- models behavioral friction
- generates probabilistic observations

The system does not:
- provide medical diagnosis
- provide psychiatric diagnosis
- provide legal conclusions
- determine immutable identity

All outputs are interpretative approximations.

Human cognition is dynamic and context dependent.

Users remain responsible for all decisions and interpretations.
`.trim()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}