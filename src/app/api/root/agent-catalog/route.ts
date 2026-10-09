import { NextResponse } from 'next/server';
import { KNOWN_AGENTS } from '@/lib/root/telemetry/agentRegistry';
export const dynamic='force-dynamic';
export async function GET(){
  return NextResponse.json({source:'CODE_REGISTRY',runtimeVerified:false,items:KNOWN_AGENTS.map(agent=>({key:agent.agentKey,name:agent.name,kind:agent.entityKind,status:agent.initialStatus,permissions:agent.permissions,capability:agent.capability}))},{headers:{'Cache-Control':'no-store'}});
}
