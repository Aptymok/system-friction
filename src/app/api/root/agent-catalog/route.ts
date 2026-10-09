import { NextResponse } from 'next/server';
import { KNOWN_AGENTS } from '@/lib/root/telemetry/agentRegistry';
import { requireRootViewer } from '@/lib/root/server';
export const dynamic='force-dynamic';
export async function GET(){
  const gate=await requireRootViewer('root.console.read');
  if(!gate.ok)return NextResponse.json(gate.body,{status:gate.status});
  return NextResponse.json({source:'CODE_REGISTRY',runtimeVerified:false,items:KNOWN_AGENTS.map(agent=>({key:agent.agentKey,name:agent.name,kind:agent.entityKind,declaredStatus:agent.initialStatus,permissions:agent.permissions,capability:agent.capability}))},{headers:{'Cache-Control':'no-store'}});
}
