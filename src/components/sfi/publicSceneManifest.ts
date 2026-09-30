export type SceneFrame = {
  label: string;
  title: string;
  text: string;
};

export type SceneTile = {
  label: string;
  title: string;
  description: string;
  image: string;
  targetSceneId?: string;
  href?: string;
};

export type SceneAsset = {
  src: string;
  role: 'atmosphere' | 'celestial' | 'geometry' | 'structure' | 'terrain' | 'signal';
  depth: number;
  motion: 'static' | 'slow-drift' | 'pointer-parallax';
  alpha?: boolean;
};

export type Scene = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  background: string;
  assets: readonly SceneAsset[];
  frames: readonly SceneFrame[];
  tiles?: readonly SceneTile[];
};

const NYC_ASSETS = Object.freeze([
  {src:'/sfi/nyc/runtime/clouds.avif',role:'atmosphere',depth:1,motion:'slow-drift',alpha:true},
  {src:'/sfi/nyc/runtime/moon.avif',role:'celestial',depth:2,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/golden-circle.avif',role:'geometry',depth:3,motion:'slow-drift',alpha:true},
  {src:'/sfi/nyc/runtime/lines.avif',role:'geometry',depth:4,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/structure.avif',role:'structure',depth:5,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/earth.avif',role:'terrain',depth:6,motion:'static',alpha:true},
] satisfies readonly SceneAsset[]);

const BACKGROUND='/sfi/nyc/runtime/background.avif';

export const SCENES: readonly Scene[] = [
  {
    id:'intro',
    number:'00',
    eyebrow:'SYSTEM FRICTION INSTITUTE · NEW YORK 2026',
    title:'SYSTEM FRICTION',
    accent:'INSTITUTE.',
    lead:'An independent institutional research environment for evidence, authority, execution and RETURN in complex sociotechnical systems.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'PUBLIC ORIENTATION',title:'Institutional intelligence must remain reconstructible.',text:'SFI studies how signals become evidence, how evidence becomes authority, how authority becomes execution, and how reality returns as a constraint on what the institution believes next.'},
    ],
    tiles:[
      {label:'REGISTRY',title:'Institutional registry',description:'Methods, records, evidence objects and governed institutional memory.',image:'/sfi/nyc/runtime/structure.avif',targetSceneId:'authority'},
      {label:'AI WEEK NEW YORK',title:'October 8 · 7:00 PM ET',description:'After AI Governance: Evidence, Authority & RETURN in Real Institutions.',image:'/sfi/nyc/runtime/earth.avif',targetSceneId:'time'},
      {label:'FRICTION NOTES',title:'Field notes',description:'Short-form institutional observations on friction, evidence and consequence.',image:'/sfi/nyc/runtime/lines.avif',targetSceneId:'after-ai-governance'},
      {label:'OBSERVATORY',title:'World & institutional state',description:'Observation, hypotheses, calibration and longitudinal context.',image:'/sfi/nyc/runtime/moon.avif',targetSceneId:'observation'},
    ],
  },
  {
    id:'time',
    number:'01',
    eyebrow:'AI WEEK NEW YORK 2026 · OCT 08 · 19:00 ET',
    title:'THE WORLD',
    accent:'DOES NOT HAVE THE SAME TIME.',
    lead:'AI can be global. Institutions are not. They operate through different clocks, evidence thresholds, authorities and consequences.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'ASYNCHRONY',title:'One event. Different institutional times.',text:'A signal can arrive everywhere at once while becoming actionable at radically different speeds.'},
      {label:'FRICTION',title:'Delay is not neutral.',text:'Procedures, verification, jurisdiction and accountability reshape what an institution can do and when it can do it.'},
      {label:'REALITY',title:'The same signal can become different decisions.',text:'Global intelligence enters local systems that do not share the same memory, authority or tolerance for consequence.'},
    ],
  },
  {
    id:'observation',
    number:'02',
    eyebrow:'OBSERVATORY / OBSERVATION',
    title:'A SIGNAL',
    accent:'IS NOT EVIDENCE.',
    lead:'SFI separates what was sensed from what can legitimately support a claim.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'SOURCE',title:'Something emitted a signal.',text:'Origin, acquisition time and access conditions remain part of the object. A source is not yet a conclusion.'},
      {label:'RECORD',title:'Something was preserved.',text:'A record makes reconstruction possible. It still does not establish relevance, validity or causality.'},
      {label:'EVIDENCE',title:'A claim earns support.',text:'Evidence is admitted against a defined question, method and boundary. Visibility alone is insufficient.'},
    ],
  },
  {
    id:'authority',
    number:'03',
    eyebrow:'REGISTRY / INFERENCE / AUTHORITY',
    title:'EVIDENCE',
    accent:'IS NOT A DECISION.',
    lead:'Reasoning can produce a defensible interpretation faster than an institution can determine whether anyone is authorized to act on it.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'INFERENCE',title:'Interpretation remains interpretation.',text:'Models can rank, summarize and project. Their output remains distinct from institutional fact and institutional will.'},
      {label:'AUTHORITY',title:'Capability is not permission.',text:'The ability to perform an action does not establish who may authorize it, under what mandate, or with what liability.'},
      {label:'GOVERNANCE',title:'Decision rights must remain reconstructible.',text:'A governed system records who decided, under which scope, from which evidence and with which explicit boundary.'},
    ],
  },
  {
    id:'execution',
    number:'04',
    eyebrow:'INTEGRATION / EXECUTION',
    title:'AUTHORITY',
    accent:'IS NOT EXECUTION.',
    lead:'The transition from an approved decision to a material action is where institutional AI becomes consequential.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'CAPABILITY',title:'The system can do something.',text:'Tools, models and adapters define technical possibility, not legitimacy.'},
      {label:'PERMISSION',title:'The system is allowed to do something.',text:'Scopes constrain action to an identified principal, object and operating boundary.'},
      {label:'ACTION',title:'The world is changed.',text:'Execution must create a trace strong enough to reconstruct what happened without pretending that success equals validation.'},
    ],
  },
  {
    id:'return',
    number:'05',
    eyebrow:'CASES / RETURN',
    title:'REALITY',
    accent:'ANSWERS BACK.',
    lead:'After execution, the institution must observe what actually happened and allow the result to change what it believes next.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'OUTCOME',title:'What happened?',text:'Observed result remains separate from the intention, prediction and justification that preceded it.'},
      {label:'CONTRAST',title:'What survived reality?',text:'Expectation is compared with consequence without rewriting the prior state after the fact.'},
      {label:'CORRECTION',title:'What changes now?',text:'Confidence, method, memory, authority or the next available action may all change after RETURN.'},
      {label:'LEARNING',title:'Learning is governed re-entry.',text:'The system may adapt only from what was actually observed, with lineage preserved across the transition.'},
    ],
  },
  {
    id:'after-ai-governance',
    number:'06',
    eyebrow:'METHOD LAB / FIELD EVENTS',
    title:'GOVERNANCE',
    accent:'IS ONLY THE BEGINNING.',
    lead:'System Friction Institute is building an institutional operating model in which AI action remains reconstructible from observation to consequence.',
    background:BACKGROUND,
    assets:NYC_ASSETS,
    frames:[
      {label:'COGNITIVE TWIN',title:'Institutional state becomes inspectable.',text:'Memory, proposals, decisions and learning remain linked without collapsing observation, inference and authority into one layer.'},
      {label:'WORLD VECTOR',title:'Institutions act inside a changing world.',text:'Longitudinal world state is treated as context for institutional decisions rather than as a decorative dashboard.'},
      {label:'METHOD LAB',title:'Simulation does not become reality by declaration.',text:'Experiments, replays and model outputs remain SIMULATED until an observed outcome returns through a governed evidence path.'},
      {label:'AI WEEK NEW YORK',title:'After AI Governance: Evidence, Authority & RETURN in Real Institutions.',text:'October 8, 2026 · 7:00 PM ET · AI Week NY. A public introduction to the institutional problem SFI is designed to make visible.'},
    ],
  },
] as const;
