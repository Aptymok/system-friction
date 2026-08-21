export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const content = `
# SYSTEM FRICTION INSTITUTE

Canonical public structure:

- ${baseUrl}/
- ${baseUrl}/repository
- ${baseUrl}/contact
- ${baseUrl}/privacy
- ${baseUrl}/login
- ${baseUrl}/signup
- ${baseUrl}/field-schema.json

Private operational routes:

- /root: founder/root console.
- /field: public Mini MOP-H intake; authenticated User Twin and persistence remain gated by account state.
- /studio: private producer field.

Former product surfaces such as /world-vector, /scorefriction, /founder-console, /sfi-console, /campo, /observatory, /moph and /terminal are not public product centers.

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
