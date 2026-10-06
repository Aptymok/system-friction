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
  {src:'/assets/sfi/ui/luminous_gold_celestial_timeline_spine.png',role:'geometry',depth:2,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/ui/golden_celestial_timeline_sigil.png',role:'signal',depth:4,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/02_03_overlay_constellation.png',role:'geometry',depth:1,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const REPOSITORY_ASSETS = Object.freeze([
  {src:'/assets/sfi/system/reference/06_elements_archive.png',role:'structure',depth:3,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/scenes/06_archive_board.png',role:'signal',depth:4,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/institutional/futuristic_golden_archive_pedestal.png',role:'structure',depth:2,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const WORLD_VECTOR_ASSETS = Object.freeze([
  {src:'/assets/sfi/world/world-network.png',role:'terrain',depth:2,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/02_03_overlay_network.png',role:'geometry',depth:4,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/02_03_overlay_constellation.png',role:'signal',depth:5,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const METHOD_LAB_ASSETS = Object.freeze([
  {src:'/assets/sfi/system/reference/04_overlay_orbits.png',role:'geometry',depth:4,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/ui/red_de_inferencia_futurista_hud.png',role:'signal',depth:5,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/05_element_platform.png',role:'structure',depth:2,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const REALITY_CHAIN_ASSETS = Object.freeze([
  {src:'/assets/sfi/system/reference/05_overlay_network.png',role:'geometry',depth:3,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/05_element_portal.png',role:'structure',depth:5,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/05_element_platform.png',role:'terrain',depth:2,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const OBSERVATORY_ASSETS = Object.freeze([
  {src:'/assets/sfi/institutional/observatory-frame.png',role:'structure',depth:2,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/golden_holographic_observatory_console.png',role:'signal',depth:4,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/ui/interfaz_hud_dorada_del_observatorio.png',role:'geometry',depth:5,motion:'slow-drift',alpha:true},
] satisfies readonly SceneAsset[]);

const ROOT_ASSETS = Object.freeze([
  {src:'/assets/sfi/ui/golden_celestial_astrolabe_hud.png',role:'geometry',depth:2,motion:'slow-drift',alpha:true},
  {src:'/assets/sfi/ui/red_de_inferencia_futurista_hud.png',role:'signal',depth:5,motion:'pointer-parallax',alpha:true},
  {src:'/assets/sfi/system/reference/05_overlay_network.png',role:'geometry',depth:4,motion:'pointer-parallax',alpha:true},
] satisfies readonly SceneAsset[]);

export const SCENES: readonly Scene[] = [
  {
    id:'intro',
    number:'00',
    eyebrow:'SYSTEM FRICTION INSTITUTE',
    title:'System Friction',
    accent:'Institute',
    lead:'Evidence, Authority & RETURN in Real Institutions',
    background:'/sfi/nyc/runtime/background.avif',
    assets:NYC_ASSETS,
    frames:[
      {label:'PUBLIC ORIENTATION',title:'Institutional intelligence must remain reconstructible.',text:'SFI studies how signals become evidence, how evidence becomes authority, how authority becomes execution, and how reality returns as a constraint on what the institution believes next.'},
    ],
    actions:[{label:'Enter Observatory',href:'/observatory',kind:'primary'}],
    tiles:[
      {label:'REGISTRY',title:'Institutional registry',description:'Methods, records, publications and Discovery Mesh.',image:'/sfi/nyc/runtime/structure.avif',href:'/publications'},
      {label:'AI WEEK NYC 2026',title:'October 8 · 7:00 PM ET',description:'After AI Governance: Evidence, Authority & RETURN in Real Institutions.',image:'/sfi/nyc/runtime/earth.avif',href:'https://gomry.com/l/Kzcb3xl'},
      {label:'FRICTION NOTES',title:'Field notes',description:'Short-form institutional observations on friction, evidence and consequence.',image:'/sfi/nyc/runtime/lines.avif',href:'/publications'},
      {label:'OBSERVATORY',title:'World & institutional state',description:'Satellite, hypotheses, trajectory, RETURN and live sources.',image:'/sfi/nyc/runtime/moon.avif',href:'/observatory'},
    ],
  },
  {
    id:'timeline',
    number:'01',
    eyebrow:'TIMELINE / LONGITUDINAL MEMORY',
    title:'TIME',
    accent:'LINE',
    lead:'Everything the institution can reconstruct over time.',
    background:'/assets/sfi/system/reference/02_03_world_background.png',
    assets:TIMELINE_ASSETS,
    frames:[
      {label:'INSTITUTION',title:'Institutional events remain ordered.',text:'Decisions, methods, changes and observed returns can be inspected against the state that existed when they occurred.'},
      {label:'WORLD',title:'World state keeps its own clock.',text:'External conditions are preserved as longitudinal context rather than rewritten from the perspective of the present.'},
      {label:'CASE',title:'A case carries a reconstructible sequence.',text:'Evidence, inference, authority, execution and RETURN remain distinguishable across the case lifecycle.'},
      {label:'PROJECT',title:'Projects retain trajectory and intervention history.',text:'Milestones, perturbations, dependencies and observed outcomes remain addressable without relying on team memory.'},
    ],
    actions:[{label:'Open Institutional Timeline',href:'/observatory#timeline',kind:'primary'}],
  },
  {
    id:'repository',
    number:'02',
    eyebrow:'REPOSITORY / PROVENANCE',
    title:'REPO',
    accent:'SITORY',
    lead:'Documents, evidence, publications, provenance and trajectories.',
    background:'/assets/sfi/scenes/06_archive_background.png',
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
    id:'world-vector',
    number:'03',
    eyebrow:'WORLD VECTOR / LONGITUDINAL FIELD',
    title:'WORLD',
    accent:'VECTOR',
    lead:'The longitudinal state of the environment and its trajectories.',
    background:'/assets/sfi/world/world-clean.png',
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
    id:'method-lab',
    number:'04',
    eyebrow:'METHOD LAB / EXPERIMENTATION',
    title:'METHOD',
    accent:'LAB',
    lead:'Protocols, rival hypotheses and reproducible experimentation.',
    background:'/assets/sfi/scenes/laboratorio_de_redes_neuronales_holográficas.png',
    assets:METHOD_LAB_ASSETS,
    frames:[
      {label:'METHODS',title:'A method states how a question is approached.',text:'Method selection remains inspectable instead of disappearing inside model output.'},
      {label:'PROTOCOLS',title:'Protocols define the experiment before the result.',text:'Inputs, controls, stopping conditions and expected observations are recorded before interpretation.'},
      {label:'RUNS',title:'Every run carries its own receipt.',text:'Model, evidence, parameters, timing and outputs remain reconstructible across repeated experiments.'},
      {label:'RIVAL HYPOTHESES',title:'Competing explanations are preserved.',text:'A preferred explanation does not erase alternatives that remain compatible with the evidence.'},
      {label:'SIMULATION',title:'Simulation is not observation.',text:'Synthetic or model-generated outcomes remain SIMULATED until reality provides an observed return.'},
      {label:'REPRODUCIBILITY',title:'A result must survive re-entry.',text:'Re-running the method should expose what changed in evidence, model context and output rather than hiding variation.'},
    ],
    actions:[{label:'Enter Method Lab',href:'/method-lab',kind:'primary'}],
  },
  {
    id:'reality-chain',
    number:'05',
    eyebrow:'REALITY CHAIN / RECONSTRUCTION',
    title:'REALITY',
    accent:'CHAIN',
    lead:'Reconstruct what existed, when it appeared, and what the institution knew.',
    background:'/assets/sfi/system/reference/05_background_earth.png',
    assets:REALITY_CHAIN_ASSETS,
    frames:[
      {label:'REAL WORLD',title:'The chain begins outside the institution.',text:'Reality exists before it is sensed, recorded or interpreted by an institutional system.'},
      {label:'SIGNAL',title:'Something becomes detectable.',text:'A signal records that something was sensed; it does not yet establish a claim.'},
      {label:'EVIDENCE',title:'A record becomes support under a method.',text:'Evidence requires a defined question, provenance and admissible relation to the claim.'},
      {label:'INFERENCE',title:'Interpretation remains separate from observation.',text:'Reasoning can transform evidence into a hypothesis without converting that hypothesis into fact.'},
      {label:'AUTHORITY / EXECUTION',title:'Reasoning is different from permission and action.',text:'Who may authorize and who actually executes remain separate reconstructible transitions.'},
      {label:'RETURN',title:'Reality answers after execution.',text:'Observed consequence closes the loop only when it is compared with what the institution expected beforehand.'},
    ],
    actions:[
      {label:'Reconstruct in ROOT',href:'/root?reading=REALITY_CHAIN',kind:'primary'},
      {label:'Open Evidence Review',href:'/root/evidence-review',kind:'secondary'},
    ],
  },
  {
    id:'observatory',
    number:'06',
    eyebrow:'OBSERVATORY / LIVE FIELD',
    title:'OBSERVA',
    accent:'TORY',
    lead:'Signals, sources, tensions and trajectories in the live field.',
    background:'/assets/sfi/scenes/golden_observatory_over_a_glowing_planet.png',
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
    id:'root',
    number:'07',
    eyebrow:'ROOT / CANONICAL COGNITIVE FIELD',
    title:'ROOT',
    accent:'',
    lead:'Reasoning is different from authority. A canonical model of how evidence, inference and institutions interlock in the real world.',
    background:'/assets/sfi/system/reference/futuristic_golden_evidence_command_center.png',
    assets:ROOT_ASSETS,
    frames:[
      {label:'FRICTION MAP',title:'Relations shape what can happen.',text:'Friction is represented as a property of connected systems rather than as an isolated defect or score.'},
      {label:'CANONICAL',title:'Canonical state remains bounded by evidence.',text:'ROOT can organize represented state without converting missing or simulated information into observed truth.'},
      {label:'WORLD VECTOR',title:'Institutional reasoning remains situated in a changing world.',text:'External trajectories enter as context while preserving their own provenance and temporal boundary.'},
      {label:'LEARNING',title:'Learning requires governed re-entry.',text:'Observed RETURN can change confidence, method or future action without rewriting the prior chain.'},
      {label:'AUTHORITY BOUNDARY',title:'Capability never silently becomes authority.',text:'ROOT can reason across the field while sovereign actions remain constrained by explicit authority.'},
    ],
    actions:[{label:'Enter ROOT',href:'/root',kind:'primary'}],
  },
] as const;
