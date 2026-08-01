import 'server-only';

export async function GET() {
  return Response.json({
    ok: true,
    module: 'mihm',
    status: 'available'
  });
}