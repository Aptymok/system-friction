export const SCENE_KEYS=['field','root','cases','governance','twin'] as const;
export type SceneKey=typeof SCENE_KEYS[number];

export const INTERNAL_SCENE_KEYS=['root','cases','governance','twin'] as const;
export type InternalSceneKey=typeof INTERNAL_SCENE_KEYS[number];

export const LEGACY_INTERNAL_SCENES=['systems','archive','falsification','optionality','authority','agents','identity','models','genai'] as const;

type SceneLabel={label:string;title:string;subtitle:string};
type SceneSpec=SceneLabel&{key:SceneKey;markers:string[];liveSource:string};

export const SCENE_LABELS:Record<SceneKey,SceneLabel>={
  field:{label:'FIELD',title:'Observation Field',subtitle:'Live public observatory: persisted sources, derived metrics, traceable hypotheses, trajectory, RETURN and contrast.'},
  root:{label:'ROOT',title:'ROOT · Sovereign Operation',subtitle:'Institutional authority: actionable human obligations, decisions, reports and access to SFI surfaces.'},
  cases:{label:'CASES',title:'Cases',subtitle:'Complete case files, evidence, contrast, learning and reporting.'},
  governance:{label:'AI GOVERNANCE',title:'AI Governance',subtitle:'Operate agents, continuity, evidence and decisions with explicit authority.'},
  twin:{label:'TWIN / SPINE',title:'Cognitive Twin / Spine',subtitle:'Observe and govern what SFI maintains, learns, contradicts and uses.'},
};

export const SCENES:Record<SceneKey,SceneSpec>={
  field:{key:'field',...SCENE_LABELS.field,markers:['source_record','derived_metric','hypothesis_graph','trajectory','return','contrast'],liveSource:'/api/observatory/world'},
  root:{key:'root',...SCENE_LABELS.root,markers:['authority','decision','report','account','attractor','trajectory','project','case'],liveSource:'/api/root/workboard'},
  cases:{key:'cases',...SCENE_LABELS.cases,markers:['evidence','hypothesis','intervention','return','contrast','report'],liveSource:'/api/cases'},
  governance:{key:'governance',...SCENE_LABELS.governance,markers:['agent','authority','proposal','evidence','heartbeat'],liveSource:'/api/acp/proposals'},
  twin:{key:'twin',...SCENE_LABELS.twin,markers:['snapshot','lineage','contradiction','learning','quarantine'],liveSource:'/api/root/cognitive-spine/status'},
};
