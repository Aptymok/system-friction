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

export type SceneAction = {
  label: string;
  href: string;
  kind?: 'primary' | 'secondary';
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
  actions?: readonly SceneAction[];
  tiles?: readonly SceneTile[];
};

const NYC_ASSETS = Object.freeze([
  {src:'/sfi/nyc/runtime/clouds.avif',role:'atmosphere',depth:1,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/moon.avif',role:'celestial',depth:2,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/golden-circle.avif',role:'geometry',depth:3,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/lines.avif',role:'geometry',depth:4,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/structure.avif',role:'structure',depth:5,motion:'static',alpha:true},
  {src:'/sfi/nyc/runtime/earth.avif',role:'terrain',depth:6,motion:'static',alpha:true},
] satisfies readonly SceneAsset[]);

const TIMELINE_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_TIMELINE_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const REPOSITORY_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_REPOSITORY_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const WORLD_VECTOR_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_WORLD_VECTOR_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const METHOD_LAB_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_METHOD_LAB_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const REALITY_CHAIN_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_REALITY_CHAIN_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const OBSERVATORY_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_OBSERVATORY_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

const ROOT_ASSETS = Object.freeze([
  {src:'/assets/sfi/instruments/SFI_ROOT_HERO_LAYER.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

export const SCENES: readonly Scene[] = [
  {
    id:'intro',
    number:'00',
    eyebrow:'',
    title:'System Friction',
    accent:'Institute',
    lead:'SYSTEM | FRICTION | INSTITUTE',
    background:'/sfi/nyc/runtime/background.avif',
    assets:NYC_ASSETS,
    frames:[
      {label:'PUBLIC ORIENTATION',title:'Institutional intelligence must remain reconstructible.',text:'SFI studies how signals become evidence, how evidence becomes authority, how authority becomes execution, and how reality returns as a constraint on what the institution believes next.'},
    ],
    tiles:[
      {label:'REGISTRY',title:'Institutional registry',description:'Methods, records, publications and Discovery Mesh.',image:'/sfi/nyc/runtime/structure.avif',href:'/publications'},
      {label:'AI WEEK NYC 2026',title:'October 8 · 7:00 PM ET',description:'After AI Governance: Evidence, Authority & RETURN in Real Institutions.',image:'/sfi/nyc/runtime/earth.avif',href:'https://gomry.com/l/Kzcb3xl'},
      {label:'FRICTION NOTES',title:'Field notes',description:'Short-form institutional observations on friction, evidence and consequence.',image:'/sfi/nyc/runtime/lines.avif',href:'/publications'},
      {label:'OBSERVATORY',title:'World & institutional state',description:'Satellite, hypotheses, trajectory, RETURN and live sources.',image:'/sfi/nyc/runtime/moon.avif',href:'/observatory'},
    ],
  },
  {
    id:'root',
    number:'05',
    eyebrow:'ROOT / CANONICAL COGNITIVE FIELD',
    title:'ROOT',
    accent:'',
    lead:'Reasoning is different from authority. A canonical model of how evidence, inference and institutions interlock in the real world.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:ROOT_ASSETS,
    frames:[
      {label:'FRICTION MAP',title:'Relations shape what can happen.',text:'Friction is represented as a property of connected systems rather than as an isolated defect or score.'},
      {label:'CANONICAL',title:'Canonical state remains bounded by evidence.',text:'ROOT can organize represented state without converting missing or simulated information into observed truth.'},
      {label:'WORLD VECTOR',title:'Institutional reasoning remains situated in a changing world.',text:'External trajectories enter as context while preserving their own provenance and temporal boundary.'},
      {label:'LEARNING',title:'Learning requires governed re-entry.',text:'Observed RETURN can change confidence, method or future action without rewriting the prior chain.'},
      {label:'REALITY CHAIN',title:'A case remains temporally reconstructible.',text:'Real world, signal, observation, evidence, inference, authority, execution and RETURN remain separate.'},
      {label:'AUTHORITY BOUNDARY',title:'Capability never silently becomes authority.',text:'ROOT can reason across the field while sovereign actions remain constrained by explicit authority.'},
    ],
    actions:[{label:'Enter ROOT',href:'/root',kind:'primary'}],
    tiles:[
      {label:'Governance',title:'Governance',description:'Inspect governed decisions.',image:'/assets/sfi/instruments/SFI_ROOT_ICON_GOVERNANCE.png',href:'/governance'},
      {label:'Cases & Projects',title:'Cases & Projects',description:'Reconstruct institutional work.',image:'/assets/sfi/instruments/SFI_ROOT_ICON_CASES_PROJECTS.png',href:'/cases'},
      {label:'Institutional Attractor',title:'Institutional Attractor',description:'Read institutional direction.',image:'/assets/sfi/instruments/SFI_ROOT_ICON_ATTRACTOR.png',href:'/root'},
      {label:'Authority Boundary',title:'Authority Boundary',description:'Inspect permission to act.',image:'/assets/sfi/instruments/SFI_ROOT_ICON_AUTHORITY_BOUNDARY.png',href:'/root?reading=HIERARCHY'},
    ],
  },

  {
    id:'observatory',
    number:'01',
    eyebrow:'OBSERVATORY / LIVE FIELD',
    title:'OBSERVA',
    accent:'TORY',
    lead:'Signals, sources, tensions and trajectories in the live field.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:OBSERVATORY_ASSETS,
    frames:[
      {label:'SOURCES',title:'The live field remains source-bound.',text:'Data, testimony, institutions and instruments remain identifiable as origins rather than disappearing into one feed.'},
      {label:'FIELD',title:'Live conditions are observed without pretending completeness.',text:'Emerging signals and changing context remain visible together with what is unavailable or degraded.'},
      {label:'HYPOTHESES',title:'Possible explanations remain hypotheses.',text:'Patterns and anomalies can generate candidate futures without being promoted to canonical truth.'},
      {label:'TRAJECTORY',title:'The field is read through movement.',text:'Tensions, vectors and likely paths become inspectable as changing relations through time.'},
    ],
    actions:[{label:'Enter Observatory',href:'/observatory',kind:'primary'}],
  },
  {
    id:'reality-chain',
    number:'06',
    eyebrow:'REALITY CHAIN / RECONSTRUCTION',
    title:'REALITY',
    accent:'CHAIN',
    lead:'Reconstruct what existed, when it appeared, and what the institution knew.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:REALITY_CHAIN_ASSETS,
    frames:[
      {label:'REAL WORLD',title:'The chain begins outside the institution.',text:'Reality exists before it is sensed, recorded or interpreted by an institutional system.'},
      {label:'SIGNAL',title:'Something becomes detectable.',text:'A signal records that something was sensed; it does not yet establish a claim.'},
      {label:'OBSERVATION',title:'A condition or event is observed and dated.',text:'Observation preserves what was observed and when, before a record is used as evidence.'},
      {label:'EVIDENCE',title:'A record becomes support under a method.',text:'Evidence requires a defined question, provenance and admissible relation to the claim.'},
      {label:'INFERENCE',title:'Interpretation remains separate from observation.',text:'Reasoning can transform evidence into a hypothesis without converting that hypothesis into fact.'},
      {label:'AUTHORITY',title:'Institutional permission remains explicit.',text:'Preserve who had institutional permission to decide or authorize.'},
      {label:'EXECUTION',title:'Material action is reconstructed separately.',text:'Preserve what action was actually performed, independently of permission or intention.'},
      {label:'RETURN',title:'Reality answers after execution.',text:'Observed consequence closes the loop only when it is compared with what the institution expected beforehand.'},
    ],
    actions:[
      {label:'Reconstruct a Case',href:'/root?reading=REALITY_CHAIN',kind:'primary'},
      {label:'Open Source',href:'/root/evidence-review',kind:'secondary'},
      {label:'Open Evidence',href:'/root/evidence-review',kind:'secondary'},
      {label:'View Passport',href:'/root?reading=REALITY_CHAIN',kind:'secondary'},
    ],
  },
  {
    id:'method-lab',
    number:'04',
    eyebrow:'METHOD LAB / EXPERIMENTATION',
    title:'METHOD',
    accent:'LAB',
    lead:'Protocols, rival hypotheses and reproducible experimentation.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:METHOD_LAB_ASSETS,
    frames:[
      {label:'METHODS',title:'A method states how a question is approached.',text:'Method selection remains inspectable instead of disappearing inside model output.'},
      {label:'PROTOCOLS',title:'Protocols define the experiment before the result.',text:'Inputs, controls, stopping conditions and expected observations are recorded before interpretation.'},
      {label:'RUNS',title:'Every run carries its own receipt.',text:'Model, evidence, parameters, timing and outputs remain reconstructible across repeated experiments.'},
      {label:'RIVAL HYPOTHESES',title:'Competing explanations are preserved.',text:'A preferred explanation does not erase alternatives that remain compatible with the evidence.'},
      {label:'SIMULATION',title:'SIMULATION ≠ OBSERVATION',text:'Synthetic or model-generated outcomes remain SIMULATED until reality provides an observed return.'},
      {label:'REPRODUCIBILITY',title:'A result must survive re-entry.',text:'Re-running the method should expose what changed in evidence, model context and output rather than hiding variation.'},
    ],
    actions:[{label:'Enter Method Lab',href:'/method-lab',kind:'primary'}],
  },
  {
    id:'world-vector',
    number:'02',
    eyebrow:'WORLD VECTOR / LONGITUDINAL FIELD',
    title:'WORLD',
    accent:'VECTOR',
    lead:'The longitudinal state of the environment and its trajectories.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:WORLD_VECTOR_ASSETS,
    frames:[
      {label:'DOMAINS',title:'Multiple domains move at different rates.',text:'Political, economic, technological and institutional signals remain separate until a method justifies aggregation.'},
      {label:'NOW',title:'Current state is a dated observation.',text:'The present reading is not timeless truth; it is the most recent bounded state available to the instrument.'},
      {label:'TENSIONS',title:'Friction becomes visible as relation and change.',text:'Contradictions, gradients and pressure points remain inspectable instead of being collapsed into one score.'},
      {label:'TRAJECTORIES',title:'Direction matters more than a snapshot.',text:'Longitudinal movement distinguishes persistent change from transient noise.'},
      {label:'HISTORICAL RECONSTRUCTION',title:'Past frames remain past frames.',text:'Historical reconstruction uses evidence available at that time and does not project future knowledge backward.'},
      {label:'PROJECTION',title:'Projection remains explicitly non-observed.',text:'Possible futures are useful only while their simulated or inferred status remains visible.'},
    ],
    actions:[{label:'Enter World Vector',href:'/observatory#trajectory',kind:'primary'}],
  },
  {
    id:'repository',
    number:'03',
    eyebrow:'REPOSITORY / PROVENANCE',
    title:'REPO',
    accent:'SITORY',
    lead:'Documents, evidence, publications, provenance and trajectories.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:REPOSITORY_ASSETS,
    frames:[
      {label:'SOURCE RECORDS',title:'The source remains distinct from the claim.',text:'Documents, datasets and records retain origin, time and access conditions so later interpretation can be reconstructed.'},
      {label:'EVIDENCE',title:'Evidence is admitted against a question.',text:'A visible record does not automatically become evidence; relevance and support remain explicit.'},
      {label:'PUBLICATIONS',title:'Publication exposes an institutional object.',text:'Exposure, discovery, citation and later adoption remain separate observations.'},
      {label:'CASE OBJECTS',title:'Case artifacts remain connected to their lineage.',text:'Records, analyses, decisions and outcomes are preserved as addressable objects rather than flattened summaries.'},
      {label:'PROVENANCE',title:'Every object keeps where it came from.',text:'Lineage makes it possible to distinguish source, transformation, inference and later explanation.'},
    ],
    actions:[{label:'Enter Repository',href:'/publications?view=registry',kind:'primary'}],
  },
  {
    id:'timeline',
    number:'07',
    eyebrow:'TIMELINE / LONGITUDINAL MEMORY',
    title:'TIME',
    accent:'LINE',
    lead:'Everything the institution can reconstruct over time.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:TIMELINE_ASSETS,
    frames:[
      {label:'INSTITUTION',title:'Institutional events remain ordered.',text:'Decisions, methods, changes and observed returns can be inspected against the state that existed when they occurred.'},
      {label:'WORLD',title:'World state keeps its own clock.',text:'External conditions are preserved as longitudinal context rather than rewritten from the perspective of the present.'},
      {label:'CASE',title:'A case carries a reconstructible sequence.',text:'Evidence, inference, authority, execution and RETURN remain distinguishable across the case lifecycle.'},
      {label:'PROJECT',title:'Projects retain trajectory and intervention history.',text:'Milestones, perturbations, dependencies and observed outcomes remain addressable without relying on team memory.'},
    ],
    actions:[{label:'Open Institutional Timeline',href:'/observatory#timeline',kind:'primary'}],
  },
] as const;
