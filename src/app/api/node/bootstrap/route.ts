import { NextResponse } from 'next/server'
import { createNode } from '@/lib/store/runtimeStore'

export async function POST() {
  return NextResponse.json({ node: createNode('web') })
}
