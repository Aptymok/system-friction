export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const content = `
# SYSTEM FRICTION INSTITUTE

Public institutional surface for observing systemic friction through evidence, minimal perturbation and operational decisions.

## PUBLIC RESOURCES

${baseUrl}
${baseUrl}/repository
${baseUrl}/field
${baseUrl}/contact
${baseUrl}/privacy
${baseUrl}/login
${baseUrl}/signup
${baseUrl}/field-schema.json

## PRIVATE ROUTES

/root and /studio require authorization and must not be treated as public evidence. /field is public intake; account memory and User Twin remain private.

## AI POLICY

No psychiatric, legal, medical or financial authority claimed. Private runtime state is not public validation.

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
