import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSfiMember } from '@/lib/system/access/server';
import {
  SFI_AI_FAILURE_LAYERS,
  SFI_AI_GOVERNANCE_STAGES,
  SFI_SYSTEM_AI_ENTITY_TYPES,
  buildAiAdoptionOpportunityAssessment,
  buildAiGovernanceTraceAssessment,
  buildAiImplementationFailureAssessment,
  buildSystemFrictionAssessment,
  type SfiSystemAiCaseObjectInput,
} from '@/core/case-platform';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { assertCaseReferenceIntegrity,assertCaseServiceProfileAllowed,resolveTenantSystemAiEntityRefs } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic='force-dynamic';
export const runtime='nodejs';

const refSchema=z.object({id:z.string().trim().min(1).max(500),version:z.string().trim().max(120).nullable().optional(),hash:z.string().trim().max(256).nullable().optional()}).strict();
const entityRefSchema=refSchema.extend({entityType:z.enum(SFI_SYSTEM_AI_ENTITY_TYPES)}).strict();
const failureRefSchema=refSchema.extend({entityType:z.literal('FAILURE_EVENT')}).strict();
const processRefSchema=refSchema.extend({entityType:z.literal('PROCESS')}).strict();
const useCaseRefSchema=refSchema.extend({entityType:z.literal('USE_CASE')}).strict();
const frictionSchema=z.object({type:z.literal('FRICTION'),assessmentId:z.string().trim().min(1).max(240),locationRef:entityRefSchema,affectedRefs:z.array(entityRefSchema).max(100).optional(),frictionType:z.string().trim().min(1).max(240),evidenceRefs:z.array(refSchema).min(1).max(500),recordRefs:z.array(refSchema).max(500).optional(),confidence:z.number().min(0).max(1).nullable().optional(),magnitudeProxy:z.number().min(0).max(1).nullable().optional()}).strict();
const failureSchema=z.object({type:z.literal('AI_FAILURE'),assessmentId:z.string().trim().min(1).max(240),failureRef:failureRefSchema,layer:z.enum(SFI_AI_FAILURE_LAYERS),evidenceRefs:z.array(refSchema).min(1).max(500),recordRefs:z.array(refSchema).max(500).optional(),determinability:z.enum(['DETERMINED','PARTIALLY_DETERMINED','UNDETERMINED']),confidence:z.number().min(0).max(1).nullable().optional(),competingHypotheses:z.array(z.string().trim().min(1).max(2000)).max(50).optional()}).strict();
const opportunitySchema=z.object({type:z.literal('AI_OPPORTUNITY'),assessmentId:z.string().trim().min(1).max(240),processRef:processRefSchema,useCaseRef:useCaseRefSchema,evidenceRefs:z.array(refSchema).min(1).max(500),recordRefs:z.array(refSchema).max(500).optional(),projectedValue:z.number().min(0).max(1).nullable().optional(),feasibility:z.number().min(0).max(1).nullable().optional(),integrationRisk:z.number().min(0).max(1).nullable().optional(),requiredControls:z.array(z.string().trim().min(1).max(1000)).max(100).optional()}).strict();
const stageRecordRefsShape=Object.fromEntries(SFI_AI_GOVERNANCE_STAGES.map((stage)=>[stage,z.array(refSchema).min(1).max(100).optional()])) as Record<(typeof SFI_AI_GOVERNANCE_STAGES)[number],z.ZodOptional<z.ZodArray<typeof refSchema>>>;
const stageRecordRefsSchema=z.object(stageRecordRefsShape).partial();
const governanceSchema=z.object({type:z.literal('AI_GOVERNANCE_TRACE'),assessmentId:z.string().trim().min(1).max(240),stageRecordRefs:stageRecordRefsSchema,evidenceRefs:z.array(refSchema).min(1).max(500),confidence:z.number().min(0).max(1).nullable().optional()}).strict();
const schema=z.discriminatedUnion('type',[frictionSchema,failureSchema,opportunitySchema,governanceSchema]);
type RouteContext={params:Promise<{caseId:string}>};

export async function POST(request:Request,context:RouteContext){
  try{
    const{user}=await requireSfiMember();
    const{caseId}=await context.params;
    const body=schema.parse(await request.json());
    let object:SfiSystemAiCaseObjectInput;
    if(body.type==='FRICTION'){
      await assertCaseServiceProfileAllowed(caseId,user.id,['SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH']);
      await assertCaseReferenceIntegrity({caseId,userId:user.id,recordRefs:body.recordRefs,evidenceRefs:body.evidenceRefs});
      const resolved=await resolveTenantSystemAiEntityRefs({caseId,userId:user.id,entityRefs:[body.locationRef,...(body.affectedRefs??[])]});
      object=buildSystemFrictionAssessment({
        assessmentId:body.assessmentId,
        locationRef:resolved[0],
        affectedRefs:resolved.slice(1),
        frictionType:body.frictionType,
        evidenceRefs:body.evidenceRefs,
        recordRefs:body.recordRefs,
        confidence:body.confidence,
        magnitudeProxy:body.magnitudeProxy,
      });
    }else if(body.type==='AI_FAILURE'){
      await assertCaseServiceProfileAllowed(caseId,user.id,['AI_IMPLEMENTATION_DIAGNOSTIC','CUSTOM_RESEARCH']);
      await assertCaseReferenceIntegrity({caseId,userId:user.id,recordRefs:body.recordRefs,evidenceRefs:body.evidenceRefs});
      const [failureRef]=await resolveTenantSystemAiEntityRefs({caseId,userId:user.id,entityRefs:[body.failureRef]});
      object=buildAiImplementationFailureAssessment({
        assessmentId:body.assessmentId,
        failureRef,
        layer:body.layer,
        evidenceRefs:body.evidenceRefs,
        recordRefs:body.recordRefs,
        determinability:body.determinability,
        confidence:body.confidence,
        competingHypotheses:body.competingHypotheses,
      });
    }else if(body.type==='AI_OPPORTUNITY'){
      await assertCaseServiceProfileAllowed(caseId,user.id,['AI_ADOPTION_INTEGRATION','CUSTOM_RESEARCH']);
      await assertCaseReferenceIntegrity({caseId,userId:user.id,recordRefs:body.recordRefs,evidenceRefs:body.evidenceRefs});
      const [processRef,useCaseRef]=await resolveTenantSystemAiEntityRefs({caseId,userId:user.id,entityRefs:[body.processRef,body.useCaseRef]});
      object=buildAiAdoptionOpportunityAssessment({
        assessmentId:body.assessmentId,
        processRef,
        useCaseRef,
        evidenceRefs:body.evidenceRefs,
        recordRefs:body.recordRefs,
        projectedValue:body.projectedValue,
        feasibility:body.feasibility,
        integrationRisk:body.integrationRisk,
        requiredControls:body.requiredControls,
      });
    }else{
      await assertCaseServiceProfileAllowed(caseId,user.id,['AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH']);
      const recordRefs=SFI_AI_GOVERNANCE_STAGES.flatMap((stage)=>body.stageRecordRefs[stage]??[]);
      await assertCaseReferenceIntegrity({caseId,userId:user.id,recordRefs,evidenceRefs:body.evidenceRefs});
      object=buildAiGovernanceTraceAssessment({assessmentId:body.assessmentId,stageRecordRefs:body.stageRecordRefs,evidenceRefs:body.evidenceRefs,confidence:body.confidence});
    }
    const saved=await recordOperationalCaseObject({caseId,userId:user.id,...object});
    return NextResponse.json({ok:true,assessment:saved,truthAuthority:false,executionAuthority:false},{status:201});
  }catch(error){
    return sfiCaseApiFailure(error);
  }
}
