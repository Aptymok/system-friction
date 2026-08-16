import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import {
  normalizeAiDecisionTrace,
  normalizeAiExecutionTrace,
  normalizeSystemAiEntityRecord,
  normalizeSystemFailureEvent,
  type SfiSystemAiIntakePackage,
} from '@/core/case-platform';
import { persistOperationalSystemAiIntakePackage } from '@/lib/sfi/case-platform/systemAiRepository';
import { assertCaseServiceProfileAllowed } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema=z.object({id:z.string().trim().min(1).max(500),version:z.string().trim().max(120).nullable().optional(),hash:z.string().trim().max(256).nullable().optional()}).strict();
const entityTypeSchema=z.enum(['SYSTEM','COMPONENT','PROCESS','WORKFLOW','ACTOR','INTERFACE','DATA_SOURCE','DATASET','AI_SYSTEM','AI_MODEL','MODEL_ENDPOINT','PROMPT_TEMPLATE','RETRIEVAL_LAYER','TOOL','AI_EXECUTION','DECISION_POINT','HUMAN_GATE','CONTROL','FAILURE_EVENT','USE_CASE','INTEGRATION_POINT','OUTCOME']);
const aiSystemRefSchema=refSchema.extend({entityType:z.literal('AI_SYSTEM')}).strict();
const aiModelRefSchema=refSchema.extend({entityType:z.literal('AI_MODEL')}).strict();
const promptRefSchema=refSchema.extend({entityType:z.literal('PROMPT_TEMPLATE')}).strict();
const dataRefSchema=refSchema.extend({entityType:z.literal('DATA_SOURCE')}).strict();
const toolRefSchema=refSchema.extend({entityType:z.literal('TOOL')}).strict();
const componentRefSchema=refSchema.extend({entityType:z.literal('COMPONENT')}).strict();
const processRefSchema=refSchema.extend({entityType:z.literal('PROCESS')}).strict();
const executionRefSchema=refSchema.extend({entityType:z.literal('AI_EXECUTION')}).strict();
const gateRefSchema=refSchema.extend({entityType:z.literal('HUMAN_GATE')}).strict();
const actorRefSchema=refSchema.extend({entityType:z.literal('ACTOR')}).strict();

const entitySchema=z.object({type:z.literal('ENTITY'),entityType:entityTypeSchema,entityId:z.string().trim().min(1).max(240),label:z.string().trim().max(500).nullable().optional(),attributes:z.record(z.string(),z.unknown()).optional(),observedAt:z.string().trim().max(80).nullable().optional(),sourceRefs:z.array(refSchema).max(500).optional()}).strict();
const executionSchema=z.object({type:z.literal('AI_EXECUTION'),executionId:z.string().trim().min(1).max(240),aiSystemRef:aiSystemRefSchema,modelRef:aiModelRefSchema,startedAt:z.string().trim().min(1).max(80),finishedAt:z.string().trim().max(80).nullable().optional(),status:z.string().trim().min(1).max(120),promptTemplateRef:promptRefSchema.nullable().optional(),dataSourceRefs:z.array(dataRefSchema).max(100).optional(),toolRefs:z.array(toolRefSchema).max(100).optional(),inputHash:z.string().trim().max(256).nullable().optional(),contextHash:z.string().trim().max(256).nullable().optional(),outputHash:z.string().trim().max(256).nullable().optional(),sourceRefs:z.array(refSchema).max(500).optional()}).strict();
const failureSchema=z.object({type:z.literal('FAILURE_EVENT'),failureId:z.string().trim().min(1).max(240),occurredAt:z.string().trim().min(1).max(80),failureType:z.string().trim().min(1).max(240),description:z.string().trim().max(4000).nullable().optional(),componentRef:componentRefSchema.nullable().optional(),processRef:processRefSchema.nullable().optional(),aiExecutionRef:executionRefSchema.nullable().optional(),sourceRefs:z.array(refSchema).max(500).optional()}).strict();
const decisionSchema=z.object({type:z.literal('DECISION_TRACE'),decisionId:z.string().trim().min(1).max(240),decidedAt:z.string().trim().min(1).max(80),disposition:z.string().trim().min(1).max(240),aiExecutionRef:executionRefSchema.nullable().optional(),humanGateRef:gateRefSchema.nullable().optional(),authorityActorRef:actorRefSchema.nullable().optional(),sourceRefs:z.array(refSchema).max(500).optional()}).strict();
const intakeSchema=z.discriminatedUnion('type',[entitySchema,executionSchema,failureSchema,decisionSchema]);
const SYSTEM_AI_PROFILES=['SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH'] as const;
type RouteContext={params:Promise<{caseId:string}>};

export async function POST(request:Request,context:RouteContext){
  try{
    const{user}=await requireAuthenticatedUser();
    const{caseId}=await context.params;
    await assertCaseServiceProfileAllowed(caseId,user.id,[...SYSTEM_AI_PROFILES]);
    const body=intakeSchema.parse(await request.json());
    let packet:SfiSystemAiIntakePackage;
    if(body.type==='ENTITY') packet=normalizeSystemAiEntityRecord(body);
    else if(body.type==='AI_EXECUTION') packet=normalizeAiExecutionTrace(body);
    else if(body.type==='FAILURE_EVENT') packet=normalizeSystemFailureEvent(body);
    else packet=normalizeAiDecisionTrace(body);
    const result=await persistOperationalSystemAiIntakePackage({caseId,userId:user.id,packet});
    return NextResponse.json({
      ok:true,
      contract:packet.contract,
      ...result,
      boundary:'System/AI intake validates the full packet first and persists object + relations in one database transaction. Raw prompts/inputs are not required; AI output does not become a decision, failure does not establish root cause, and no institutional truth is written.',
    },{status:201});
  }catch(error){
    return sfiCaseApiFailure(error);
  }
}
