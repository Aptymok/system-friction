import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    framework: 'SFI-CORE.v2',
    kernel: 'https://systemfriction.org/systemprompt.html',
    reproducibility: 'open_source',
    audit_process: 'MOP-H',
    sensors: ['IHG', 'NTI', 'LDI']
  })
}