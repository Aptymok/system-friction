import { NextResponse } from 'next/server'
import { createDashboardContract } from '@/lib/amv/core/dashboardFactory'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json(createDashboardContract(body && typeof body === 'object' ? body : {}))
}
