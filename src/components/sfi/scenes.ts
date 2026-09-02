export const SCENE_KEYS=['field','root','cases','governance','twin'] as const;
export type SceneKey=typeof SCENE_KEYS[number];

export const INTERNAL_SCENE_KEYS=['root','cases','governance','twin'] as const;
export type InternalSceneKey=typeof INTERNAL_SCENE_KEYS[number];

export const LEGACY_INTERNAL_SCENES=['systems','archive','falsification','optionality','authority','agents','identity','models','genai'] as const;

export const SCENE_LABELS:Record<SceneKey,{label:string;title:string;subtitle:string}>={
  field:{label:'FIELD',title:'Campo de observación',subtitle:'Observatorio público de señales y contexto mundial.'},
  root:{label:'OBSERVATORIO',title:'Observatorio de Fricción',subtitle:'Navega cuentas, atractores, trayectorias, proyectos, casos y fricciones activas.'},
  cases:{label:'CASOS',title:'Casos',subtitle:'Expedientes completos, evidencia, contraste, aprendizaje y reporte.'},
  governance:{label:'GOBERNANZA IA',title:'Gobernanza de IA',subtitle:'Opera agentes, continuidad, evidencia y decisiones con autoridad explícita.'},
  twin:{label:'TWIN / SPINE',title:'Cognitive Twin / Spine',subtitle:'Observa y gobierna lo que SFI sostiene, aprende, contradice y utiliza.'},
};
