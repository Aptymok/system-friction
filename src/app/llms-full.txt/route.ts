export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const content = `
# SYSTEM FRICTION INSTITUTE

Canonical public surface for longitudinal observation of systemic friction.

## Canonical Routes

- ${baseUrl}/
- ${baseUrl}/sfi-core-v2
- ${baseUrl}/field/brief/latest
- ${baseUrl}/campo
- ${baseUrl}/observatory
- ${baseUrl}/field-schema.json

## Public Doctrine

SFI observes fields, relations, patterns and regimes of friction.
It does not diagnose identities. It does not present private runtime data as public proof.

## Core Concepts

- SFI-CORE.v2: perceptual operating canon.
- MIHM: multidimensional homeostasis model.
- Field Brief: minimal public observation unit.
- Documentary Repository: evidence with state, provenance and interpretation limits.
- Governance: irreversible mutation requires traceable approval.

## Last Update

${today}
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
