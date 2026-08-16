import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { listTenantSystemAiRelations } from '@/lib/sfi/case-platform/systemAiRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
export const dynamic='force-dynamic'; export const runtime='nodejs';
type RouteContext={params:Promise<{tenantId:string}>};
export async function GET(_:Request,context:RouteContext){try{const{user}=await requireAuthenticatedUser();const{tenantId}=await context.params;return NextResponse.json({ok:true,contract:'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0',tenantId,relations:await listTenantSystemAiRelations(tenantId,user.id),boundary:'Tenant System/AI graph ≠ institutional SFI graph.'});}catch(error){return sfiCaseApiFailure(error);}}
