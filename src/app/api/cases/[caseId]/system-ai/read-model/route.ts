import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { buildSystemAiObservatoryReadModel } from '@/lib/sfi/case-platform/systemAiReadModel';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
export const dynamic='force-dynamic'; export const runtime='nodejs';
type RouteContext={params:Promise<{caseId:string}>};
export async function GET(_:Request,context:RouteContext){try{const{user}=await requireAuthenticatedUser();const{caseId}=await context.params;const model=await buildSystemAiObservatoryReadModel(caseId,user.id);return NextResponse.json({ok:true,...model,boundary:'Read model contains topology/assessment data but no visual layout, automatic ranking, truth authority, or execution authority.'});}catch(error){return sfiCaseApiFailure(error);}}
