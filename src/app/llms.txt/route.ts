import surfaces from '../../../config/sfi-surfaces.json';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const publicResources = surfaces.public
    .filter((entry) => entry.index)
    .map((entry) => `${baseUrl}${entry.path === '/' ? '' : entry.path}`)
    .join('\n');
  const content = `
# SYSTEM FRICTION INSTITUTE

Institutional observation system for evidence, trajectories, attractors, minimum perturbations and verified returns.

## CANONICAL PUBLIC RESOURCES

${publicResources}
${baseUrl}/field-schema.json

## FEATURED PUBLICATION

${baseUrl}/founder-edition
${baseUrl}/publications/instrumentalizacion-mente-fragmentada-founder-edition.pdf

## PRIVATE ROUTES

/root and /studio require authorization and must not be treated as public evidence. Account memory, Cognitive Twin runtime and constitutive governance controls remain private.

## EPISTEMIC BOUNDARY

Observed, derived, experimental and canonical states are not interchangeable. Runtime capability is not external validation. Models and publications do not substitute for the evidence contract of the method being evaluated.

## LAST UPDATE

${today}
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
