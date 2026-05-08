export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
  <url><loc>${baseUrl}/terminal</loc></url>
  <url><loc>${baseUrl}/llms.txt</loc></url>
</urlset>`
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } })
}
