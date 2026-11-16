import { NextResponse } from 'next/server';
import { requireSfiMember, AccessDeniedError } from '@/lib/system/access/server';
import { getLlmProviderStatus, getLlmOperationPlan } from '@/lib/ai/providerRouter';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/** Owner-accessible read-only status for the EXISTING central SFI model broker.
 * A configured key is not a successful canary; a free price is not proof that
 * the configured API account is enrolled in its free tier.
 * No provider API is called by this endpoint.
 */
export async function GET() {
  try {
    const {profile}=await requireSfiMember();
    const access=profile.module_access && typeof profile.module_access==='object'
      ?profile.module_access as Record<string,unknown>:{};
    if(access.studio!==true)return NextResponse.json({ok:false,error:'STUDIO_ACCESS_REQUIRED'},{status:403});
    const allowed=['gemini','groq'] as const;
    const providers=getLlmProviderStatus()
      .filter(item=>allowed.some(name=>name===item.id))
      .map(item=>({
        id:item.id,configured:item.configured,state:item.state,
        canaryOk:item.canaryOk,lastSuccessAt:item.lastSuccessAt,
        lastFailureAt:item.lastFailureAt,lastCheckedAt:item.lastCheckedAt,
        model:item.model,
        models:item.models.map(m=>({model:m.model,role:m.role,state:m.circuitOpen?'BLOCKED':
          m.canaryOk===true?'HEALTHY':m.canaryOk===false?'DEGRADED':'UNTESTED'})),
      }));
    const plan=getLlmOperationPlan({
      task:'graph_interpretation',
      preferredProvider:'gemini',
      requirements:{providerAllowlist:['gemini','groq']},
    });
    return NextResponse.json({
      ok:true,contract:'SFI-STUDIO-CENTRAL-LLM-READ-1.0',
      providerPriority:['gemini','groq'],
      providers,plan:{
        state:plan.state,
        candidates:plan.candidates.map(c=>({
          provider:c.provider,model:c.model,health:c.health,
        })),
      },
      zeroCostStatus:'UNVERIFIED_PROVIDER_ACCOUNT_TIER',
      billingFreeTierValidated:false,
      externalLlmCallsPerformed:0,
      modelOutputIsEvidence:false,
      operationalRule:'The model analyzes existing owner-scoped Studio context; it does not own originals, authorize spending, publish content or certify RETURN.',
    },{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    if(error instanceof AccessDeniedError)return NextResponse.json({ok:false,error:error.code},{status:error.status});
    return NextResponse.json({ok:false,error:'STUDIO_LLM_STATUS_UNAVAILABLE'},{status:503});
  }
}
