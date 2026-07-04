import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, route: 'root_operation_placeholder' });
}
