import { NextResponse } from 'next/server'
import { getPythonBridgeContract } from '@/lib/amv/core/pythonBridgeAdapter'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getPythonBridgeContract('available_not_invoked'))
}
