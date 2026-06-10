import { NextResponse } from 'next/server';

export async function GET() {
  const engineUrl = process.env.SFI_ENGINE_URL;

  if (!engineUrl) {
    return NextResponse.json({
      ok: true,
      source: 'typescript-fallback',
      warning: 'python_engine_url_missing',
    }, { headers: { 'cache-control': 'no-store' } });
  }

  try {
    const response = await fetch(`${engineUrl}/health`, { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    return NextResponse.json({
      ok: response.ok,
      source: 'python',
      status: response.status,
      engine: json,
    }, {
      status: response.ok ? 200 : 502,
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'python',
      warning: 'python_engine_not_ready',
      detail: error instanceof Error ? error.message : 'unknown',
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
