export const SCENE_KEYS=['field','root','cases','governance','twin'] as const;
export type SceneKey=typeof SCENE_KEYS[number];

export const INTERNAL_SCENE_KEYS=['root','cases','governance','twin'] as const;
export type InternalSceneKey=typeof INTERNAL_SCENE_KEYS[number];

export const LEGACY_INTERNAL_SCENES=['systems','archive','falsification','optionality','authority','agents','identity','models','genai'] as const;

type SceneLabel={label:string;title:string;subtitle:string};
type SceneSpec=SceneLabel&{key:SceneKey;markers:string[];liveSource:string};

export const SCENE_LABELS:Record<SceneKey,SceneLabel>={
  field:{label:'FIELD',title:'Campo de observación',subtitle:'Observatorio público vivo: fuentes persistidas, métricas derivadas, hipótesis trazables, trayectoria, retorno y contraste.'},
  root:{label:'ROOT',title:'ROOT · Operación soberana',subtitle:'Autoridad institucional: obligaciones humanas accionables, decisiones, reportes y acceso a superficies SFI.'},
  cases:{label:'CASOS',title:'Casos',subtitle:'Expedientes completos, evidencia, contraste, aprendizaje y reporte.'},
  governance:{label:'GOBERNANZA IA',title:'Gobernanza de IA',subtitle:'Opera agentes, continuidad, evidencia y decisiones con autoridad explícita.'},
  twin:{label:'TWIN / SPINE',title:'Cognitive Twin / Spine',subtitle:'Observa y gobierna lo que SFI sostiene, aprende, contradice y utiliza.'},
};

export const SCENES:Record<SceneKey,SceneSpec>={
  field:{key:'field',...SCENE_LABELS.field,markers:['source_record','derived_metric','hypothesis_graph','trajectory','return','contrast'],liveSource:'/api/observatory/world'},
  root:{key:'root',...SCENE_LABELS.root,markers:['authority','decision','report','account','attractor','trajectory','project','case'],liveSource:'/api/root/workboard'},
  cases:{key:'cases',...SCENE_LABELS.cases,markers:['evidence','hypothesis','intervention','return','contrast','report'],liveSource:'/api/cases'},
  governance:{key:'governance',...SCENE_LABELS.governance,markers:['agent','authority','proposal','evidence','heartbeat'],liveSource:'/api/acp/proposals'},
  twin:{key:'twin',...SCENE_LABELS.twin,markers:['snapshot','lineage','contradiction','learning','quarantine'],liveSource:'/api/root/cognitive-spine/status'},
};
