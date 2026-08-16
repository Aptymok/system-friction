import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { SFI_SYSTEM_AI_ENTITY_TYPES,SFI_SYSTEM_AI_RELATION_TYPES,type SfiSystemAiRelationDraft } from '@/core/case-platform';
import { listOperationalSystemAiRelations,recordOperationalSystemAiRelation } from '@/lib/sfi/case-platform/systemAiRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic='force-dynamic'; export const runtime='nodejs';
const refSchema=z.object({id:z.string().trim().min(1).max(500),version:z.string().trim().max(120).nullable().optional(),hash:z.string().trim().max(256).nullable().optional()}).strict();
const entityRefSchema=refSchema.extend({entityType:z.enum(SFI_SYSTEM_AI_ENTITY_TYPES)}).strict();
const schema=z.object({relationKey:z.string().trim().min(1).max(500),relationType:z.enum(SFI_SYSTEM_AI_RELATION_TYPES),from:entityRefSchema,to:entityRefSchema,sourceRefs:z.array(refSchema).max(500).optional(),recordRefs:z.array(refSchema).max(500).optional(),payload:z.record(z.string(),z.unknown()).optional(),observedAt:z.string().trim().max(80).nullable().optional()}).strict();
type RouteContext={params:Promise<{caseId:string}>};
export async function GET(_:Request,context:RouteContext){try{const{user}=await requireAuthenticatedUser();const{caseId}=await context.params;return NextResponse.json({ok:true,contract:'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0',relations:await listOperationalSystemAiRelations(caseId,user.id)});}catch(error){return sfiCaseApiFailure(error);}}
export async function POST(request:Request,context:RouteContext){try{const{user}=await requireAuthenticatedUser();const{caseId}=await context.params;const body=schema.parse(await request.json());const relation:SfiSystemAiRelationDraft={...body,evidenceRefs:[],epistemicRole:'RECORD'} as SfiSystemAiRelationDraft;const saved=await recordOperationalSystemAiRelation({caseId,userId:user.id,relation});return NextResponse.json({ok:true,relation:saved,epistemicBoundary:'Client-declared System/AI relations remain RECORD and cannot carry evidence claims or inferred causality.'},{status:201});}catch(error){return sfiCaseApiFailure(error);}}
