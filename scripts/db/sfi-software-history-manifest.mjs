const claimBoundary = 'A merged pull request proves that the referenced code change entered the repository history. It does not by itself prove production execution, scientific validity, causal efficacy, autonomy or external adoption.';

function milestone({ key, title, pr, observedAt, summary }) {
  return {
    key,
    title,
    module:'institution',
    kind:'software_milestone',
    sourceName:'GitHub · Aptymok/system-friction',
    sourceUrl:`https://github.com/Aptymok/system-friction/pull/${pr}`,
    privateRef:null,
    caseId:'SFI-SOFTWARE-CONVERGENCE-2026',
    summary,
    observedAt,
    publicWeight:.2,
    dateBasis:'SOURCE_DATE',
    epistemicClass:'IMPORTED_PROVENANCE',
    claimBoundary,
  };
}

export const SFI_SOFTWARE_HISTORY = [
  milestone({key:'sfi-pr196-provider-repair',pr:196,title:'Repair Groq GPT-OSS execution and Hugging Face fallback',observedAt:'2026-08-10T17:47:35Z',summary:'Provider-routing repair: direct Groq health, GPT-OSS-aware parameters and current Hugging Face chat endpoint; health remained contingent on observed provider response.'}),
  milestone({key:'sfi-pr197-root-graph-unification',pr:197,title:'Unify ROOT evidence graph and rebuildable-data boundary',observedAt:'2026-08-10T18:13:25Z',summary:'Unified ROOT evidence graph rendering and reclassified graph/neural indices as rebuildable projections instead of sources of truth.'}),
  milestone({key:'sfi-pr199-canonical-evidence-graph',pr:199,title:'Canonical evidence graph rebuild and truthful ROOT state',observedAt:'2026-08-11T01:54:10Z',summary:'Established one canonical evidence object per evidence hash and rebuilt graph projections from evidence/provenance rather than persistence-table duplication.'}),
  milestone({key:'sfi-pr200-root-runtime-reports',pr:200,title:'ROOT runtime truth, report inbox and recurring institutional reports',observedAt:'2026-08-11T07:09:27Z',summary:'Added explicit agent read/write/execute truth, ROOT-owned report reading and recurring report lanes without adding another cron.'}),
  milestone({key:'sfi-pr201-method-lab-convergence',pr:201,title:'Converge CHRONOS, CRL and simulations into one Method Lab',observedAt:'2026-08-11T07:45:49Z',summary:'Converged CHRONOS, CRL, CT Reentry, sociotechnical and economic protocols under one Method Lab apparatus while preserving simulation/observation separation.'}),
  milestone({key:'sfi-pr202-ct-reentry-program',pr:202,title:'Integrate CT-A01 longitudinal reentry and System Friction program',observedAt:'2026-08-11T15:40:48Z',summary:'Integrated CT-A01 genesis/heartbeat/lineage boundaries and formalized the single institutional cycle from Observatory through ROOT.'}),
  milestone({key:'sfi-pr203-ct-longitudinal-circuit',pr:203,title:'Complete CT longitudinal circuit and reconcile Phi/WorldVector/MOP-S',observedAt:'2026-08-11T16:13:04Z',summary:'Completed journal/snapshot/fork/mutation-candidate lineage mechanics and reconciled method-scoped Phi semantics and experimental MOP-S registration.'}),
  milestone({key:'sfi-pr204-root-acp-convergence',pr:204,title:'Converge ROOT/ACP authority and institutional readiness',observedAt:'2026-08-11T17:33:37Z',summary:'Consolidated governance lifecycle, conflicts, promotion receipts, readiness and development-registry truth boundaries.'}),
  milestone({key:'sfi-pr205-final-convergence',pr:205,title:'Close final SFI convergence and add Apex Method Lab pilot',observedAt:'2026-08-11T18:33:32Z',summary:'Closed remaining convergence contracts: governed ancestral Twin reentry, specialized Method Lab contracts, Studio→Field handoff and return/contrast boundary.'}),
  milestone({key:'sfi-pr206-runtime-wiring',pr:206,title:'Wire final SFI closure through runtime surfaces',observedAt:'2026-08-11T19:17:39Z',summary:'Wired immutable Studio→Field identity, T0 frozen return conditions, Observatory publication gate and final runtime QA.'}),
  milestone({key:'sfi-pr207-core-integration',pr:207,title:'Close SFI core integration: Cognitive Twin, operating field and full-cycle proof',observedAt:'2026-08-11T22:00:30Z',summary:'Integrated Cognitive Twin across institutional organs, fixed evidence identity/false closure, added cross-organ operating cycles, clean READY-empty semantics and full-cycle proof.'}),
  milestone({key:'sfi-pr209-surface-convergence',pr:209,title:'Converge Observatory, Method Lab and institutional pipeline',observedAt:'2026-08-11T23:31:38Z',summary:'Converged Observatory into a longitudinal public surface, unified Method Lab visual/operational surface, added explicit institutional pipeline and made Studio an optional specialized branch.'}),
];

const seen=new Set();
for(const item of SFI_SOFTWARE_HISTORY){
  if(seen.has(item.key))throw new Error(`duplicate_software_history_key:${item.key}`);
  seen.add(item.key);
  if(!Number.isFinite(Date.parse(item.observedAt)))throw new Error(`invalid_software_history_date:${item.key}`);
}
