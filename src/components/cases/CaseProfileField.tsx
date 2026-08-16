'use client';

import type { CSSProperties } from 'react';
import type { SfiCaseCinematicModel } from './SfiCaseCinematicWorkspace';

function nodeByType(model: SfiCaseCinematicModel, type: string) {
  return model.nodes.filter((node) => node.type === type);
}
function short(value: string, max = 28) { return value.length > max ? `${value.slice(0, max - 1)}…` : value; }

function AiExecutionField({ model }: { model: SfiCaseCinematicModel }) {
  const stages = [
    ['INPUT', ['DATA_SOURCE','DATASET']],
    ['CONTEXT', ['RETRIEVAL_LAYER']],
    ['PROMPT', ['PROMPT_TEMPLATE']],
    ['MODEL', ['AI_MODEL','MODEL_ENDPOINT']],
    ['TOOLS', ['TOOL']],
    ['OUTPUT', ['AI_EXECUTION']],
    ['HUMAN', ['HUMAN_GATE','ACTOR']],
    ['DECISION', ['DECISION_POINT']],
    ['RETURN', ['OUTCOME']],
  ] as const;
  return <div className="sfi-profile-field sfi-profile-field--chain">
    <header><span>EXECUTION TRACE</span><strong>{model.nodes.length} OBSERVED / REGISTERED ENTITIES</strong></header>
    <div className="sfi-profile-chain">{stages.map(([label, types]) => {
      const matches = model.nodes.filter((node) => (types as readonly string[]).includes(node.type));
      return <section key={label} data-present={matches.length > 0}><span>{label}</span><strong>{matches.length ? matches.length : '—'}</strong><small>{matches.length ? matches.slice(0,3).map((item) => short(item.label,18)).join(' · ') : 'MISSING / UNOBSERVED'}</small></section>;
    })}</div>
    <div className="sfi-profile-relations">{model.relations.slice(0,18).map((relation) => <div key={relation.id}><span>{short(relation.sourceId,18)}</span><em>{relation.label}</em><span>{short(relation.targetId,18)}</span></div>)}</div>
  </div>;
}

function TenderMatrix({ model }: { model: SfiCaseCinematicModel }) {
  const requirements = nodeByType(model, 'REQUIREMENT');
  const bidders = nodeByType(model, 'BIDDER');
  const assessments = model.insights.filter((item) => /PASS|FAIL|UNDETERMIN|BID|REQUIREMENT/i.test(item.statement));
  return <div className="sfi-profile-field sfi-profile-field--matrix">
    <header><span>REQUIREMENT × BIDDER</span><strong>{requirements.length} REQ · {bidders.length} BIDDERS</strong></header>
    {requirements.length && bidders.length ? <div className="sfi-tender-matrix" style={{ gridTemplateColumns: `minmax(150px,1.4fr) repeat(${Math.min(6,bidders.length)},minmax(86px,1fr))` }}>
      <div className="sfi-matrix-corner">REQUIREMENT</div>{bidders.slice(0,6).map((bidder) => <div key={bidder.id} className="sfi-matrix-head">{short(bidder.label,16)}</div>)}
      {requirements.slice(0,10).flatMap((requirement) => [
        <div key={`r:${requirement.id}`} className="sfi-matrix-rowhead">{short(requirement.label,24)}</div>,
        ...bidders.slice(0,6).map((bidder) => {
          const hit = assessments.find((item) => item.statement.includes(requirement.label) && item.statement.includes(bidder.label));
          const value = hit ? hit.tone === 'CONTRADICTED' ? 'FAIL / CONTR.' : hit.tone === 'MISSING' ? 'UND' : 'ASSESSED' : 'NO ASSESSMENT';
          return <div key={`${requirement.id}:${bidder.id}`} className="sfi-matrix-cell" data-tone={hit?.tone ?? 'MISSING'}>{value}</div>;
        }),
      ])}
    </div> : <div className="sfi-profile-empty">REQUIREMENTS OR BIDDERS NOT YET PERSISTED</div>}
    <footer>NO WINNER AUTHORITY · CELL STATE REQUIRES SOURCE / PAGE / EVIDENCE / ASSESSMENT</footer>
  </div>;
}

function ContractWarrantyField({ model }: { model: SfiCaseCinematicModel }) {
  const stages = ['CONTRACT','OBLIGATION','ASSET','SERVICE','WARRANTY','WARRANTY_EVENT','SUPPLIER','RETURN'];
  return <div className="sfi-profile-field sfi-profile-field--chain">
    <header><span>CONTRACT / WARRANTY FIELD</span><strong>{model.relations.length} RELATIONS</strong></header>
    <div className="sfi-profile-chain">{stages.map((type) => { const matches=nodeByType(model,type); return <section key={type} data-present={matches.length>0}><span>{type.replace('_',' ')}</span><strong>{matches.length || '—'}</strong><small>{matches.length ? matches.slice(0,3).map((item)=>short(item.label,18)).join(' · ') : 'NO VALUE'}</small></section>; })}</div>
    <div className="sfi-profile-relations">{model.relations.slice(0,24).map((relation) => <div key={relation.id}><span>{short(relation.sourceId,18)}</span><em>{relation.label}</em><span>{short(relation.targetId,18)}</span></div>)}</div>
  </div>;
}

function ServiceDeskField({ model }: { model: SfiCaseCinematicModel }) {
  const groups = [
    { label: 'TICKETS', items: nodeByType(model,'TICKET') },
    { label: 'ASSETS', items: nodeByType(model,'ASSET') },
    { label: 'SERVICES', items: nodeByType(model,'SERVICE') },
    { label: 'SUPPLIERS', items: nodeByType(model,'SUPPLIER') },
  ];
  return <div className="sfi-profile-field sfi-profile-field--service"><header><span>SERVICE FIELD</span><strong>RECURRENCE WITHOUT AUTO-CAUSE</strong></header><div className="sfi-service-clusters">
    {groups.map(({label,items}) => <section key={label}><span>{label}</span><strong>{items.length}</strong><div>{items.slice(0,7).map((item)=><i key={item.id}>{short(item.label,20)}</i>)}</div></section>)}
  </div><div className="sfi-profile-relations">{model.relations.slice(0,18).map((relation)=><div key={relation.id}><span>{short(relation.sourceId,18)}</span><em>{relation.label}</em><span>{short(relation.targetId,18)}</span></div>)}</div></div>;
}

function EnterpriseContinuityField({ model }: { model: SfiCaseCinematicModel }) {
  const stages=['TENDER','SUPPLIER','CONTRACT','ASSET','SERVICE','TICKET','WARRANTY_EVENT','RETURN','SUPPLIER_PERFORMANCE'];
  return <div className="sfi-profile-field sfi-profile-field--continuity"><header><span>ENTERPRISE CONTINUITY</span><strong>RELATIONAL + TEMPORAL</strong></header><div className="sfi-continuity-track">{stages.map((type,index)=>{const matches=nodeByType(model,type);return <section key={type} data-present={matches.length>0}><b>{String(index+1).padStart(2,'0')}</b><span>{type.replaceAll('_',' ')}</span><strong>{matches.length || '—'}</strong><small>{matches.length?short(matches[0].label,20):'NO RECORD'}</small></section>;})}</div></div>;
}

function SystemTopologyField({ model }: { model: SfiCaseCinematicModel }) {
  return <div className="sfi-profile-field sfi-profile-field--topology"><header><span>SYSTEM TOPOLOGY</span><strong>{model.nodes.length} NODES · {model.relations.length} RELATIONS</strong></header><div className="sfi-topology-cloud">{model.nodes.slice(0,32).map((node,index)=><div key={node.id} data-tone={node.tone} style={{ '--i': index } as CSSProperties}><span>{node.type}</span><strong>{short(node.label,18)}</strong></div>)}</div><div className="sfi-profile-relations">{model.relations.slice(0,24).map((relation)=><div key={relation.id}><span>{short(relation.sourceId,18)}</span><em>{relation.label}</em><span>{short(relation.targetId,18)}</span></div>)}</div></div>;
}

export function CaseProfileField({ model }: { model: SfiCaseCinematicModel }) {
  switch(model.serviceProfileId){
    case 'AI_IMPLEMENTATION_DIAGNOSTIC':
    case 'AI_GOVERNANCE_ASSURANCE': return <AiExecutionField model={model}/>;
    case 'TENDER_ASSURANCE': return <TenderMatrix model={model}/>;
    case 'CONTRACT_WARRANTY_ASSURANCE': return <ContractWarrantyField model={model}/>;
    case 'SERVICE_OBSERVABILITY': return <ServiceDeskField model={model}/>;
    case 'ENTERPRISE_MEMORY': return <EnterpriseContinuityField model={model}/>;
    case 'SYSTEM_OBSERVATORY':
    case 'AI_ADOPTION_INTEGRATION': return <SystemTopologyField model={model}/>;
    default: return <SystemTopologyField model={model}/>;
  }
}
