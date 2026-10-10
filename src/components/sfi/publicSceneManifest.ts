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

const ACCESS_ASSETS = Object.freeze([
  {src:'/sfi/nyc/runtime/structure.avif',role:'structure',depth:2,motion:'slow-drift',alpha:true},
  {src:'/sfi/nyc/runtime/lines.avif',role:'geometry',depth:3,motion:'static',alpha:true},
] satisfies readonly SceneAsset[]);

export const SCENES: readonly Scene[] = [
  {
    id:'intro',
    number:'00',
    eyebrow:'SYSTEM FRICTION INSTITUTE',
    title:'SFI |',
    accent:'SYSTEM FRICTION INSTITUTE',
    lead:'NOTHING ACTS ALONE. REALITY ANSWERS BACK.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:NYC_ASSETS,
    frames:[
      {label:'PUBLIC ORIENTATION',title:'Institutional intelligence must remain reconstructible.',text:'SFI studies how signals become evidence, how evidence becomes authority, how authority becomes execution, and how reality returns as a constraint on what the institution believes next.'},
    ],
    actions:[{label:'Enter Observatory',href:'/observatory',kind:'primary'}],
    tiles:[
      {label:'REGISTRY',title:'Institutional registry',description:'Methods, records, publications and Discovery Mesh.',image:'/sfi/nyc/runtime/structure.avif',href:'/repository'},
      {label:'AI WEEK NYC 2026',title:'October 8 · 7:00 PM ET',description:'After AI Governance: Evidence, Authority & RETURN in Real Institutions.',image:'/sfi/nyc/runtime/earth.avif',href:'https://gomry.com/l/Kzcb3xl'},
      {label:'FRICTION NOTES',title:'Field notes',description:'Short-form institutional observations on friction, evidence and consequence.',image:'/sfi/nyc/runtime/lines.avif',href:'/repository'},
      {label:'OBSERVATORY',title:'World & institutional state',description:'Satellite, hypotheses, trajectory, RETURN and live sources.',image:'/sfi/nyc/runtime/moon.avif',href:'/observatory'},
    ],
  },
  {
    id:'root',
    number:'01',
    eyebrow:'ROOT / CANONICAL COGNITIVE FIELD',
    title:'ROOT',
    accent:'',
    lead:'Reasoning is different from authority. A canonical model of how evidence, inference and institutions interlock in the real world.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:ROOT_ASSETS,
    frames:[
      {label:'FIELD',title:'The cognitive field remains dense, relational and selectable.',text:'Cases, projects, institutions, actors, documents, concepts, locations, events and methods remain connected without collapsing their provenance.'},
      {label:'TRAJECTORIES',title:'The same field can be read longitudinally.',text:'Temporal structure, recurrence and relation change remain visible without rewriting the current state.'},
      {label:'LEARNING',title:'Learning remains governed re-entry.',text:'RETURN can alter confidence, method and future action without becoming observation or canon by default.'},
      {label:'CONTRAST',title:'Expected and observed states remain comparable.',text:'Contrast exposes where institutional expectation diverged from what reality returned.'},
      {label:'AUTHORITY',title:'Reasoning is different from authority.',text:'Every selected object can expose what may be observed, decided, executed or escalated.'},
      {label:'JR LOGBOOK',title:'JR field history remains visible in the same field.',text:'Persisted field events, observations and relation transitions remain inspectable along the shared timeline.'},
      {label:'MATERIAL ACTIONS',title:'Action remains bounded and evidence-linked.',text:'Approved external work can be assigned and returned without pretending assignment is execution.'},
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
    number:'02',
    eyebrow:'OBSERVATORY / LIVE FIELD',
    title:'OBSERVA',
    accent:'TORY',
    lead:'Signals, sources, tensions and trajectories in the live field.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:OBSERVATORY_ASSETS,
    frames:[
      {label:'SOURCES',title:'The live field remains source-bound.',text:'Every source remains identifiable instead of disappearing into one feed.'},
      {label:'SOURCE HEALTH / FRESHNESS',title:'SFI shows what it can currently see.',text:'Fresh, stale, degraded, unavailable and unknown sources remain explicit.'},
      {label:'FIELD',title:'Live conditions remain bounded observations.',text:'The field never pretends completeness and retains unavailable or degraded regions.'},
      {label:'TERRITORIAL TENSIONS',title:'Geography can be aggregated without becoming causality.',text:'Geo-bound observations may be grouped into derived display regions while unmapped observations and coverage limits remain explicit.'},
      {label:'SIGNALS',title:'Something changed.',text:'Signals are detected changes that require attention; they are not evidence by themselves.'},
      {label:'OBSERVATIONS',title:'What was actually observed remains dated.',text:'Observed state remains distinct from signal, hypothesis and later interpretation.'},
      {label:'HYPOTHESES',title:'Possible explanations remain hypotheses.',text:'Support, contradiction, missing observations and discriminating tests remain visible.'},
      {label:'TRAJECTORY',title:'Movement matters more than a snapshot.',text:'Direction, persistence and divergence remain inspectable through time.'},
      {label:'RECENT CHANGES',title:'Recent changes remain reconstructible.',text:'New observations and source changes remain time-bound and linked to provenance.'},
      {label:'DEGRADED STATES',title:'Blind spots are part of the field.',text:'Degraded coverage remains explicit instead of being interpreted as absence.'},
    ],
    actions:[{label:'Enter Observatory',href:'/observatory',kind:'primary'}],
  },
  {
    id:'reality-chain',
    number:'03',
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
      {label:'PROTOCOLS',title:'Protocols exist before results.',text:'Inputs, controls, stopping conditions and expected observations are declared before interpretation.'},
      {label:'RUNS',title:'Every run carries its own receipt.',text:'Model, evidence, timing and outputs remain reconstructible across repeated experiments.'},
      {label:'RIVAL HYPOTHESES',title:'Competing explanations remain alive.',text:'A preferred explanation does not erase alternatives still compatible with evidence.'},
      {label:'EXPERIMENTS',title:'Experiments bind questions to discriminating observations.',text:'The lab records what is being tested, what may falsify it and what result would matter.'},
      {label:'SIMULATION',title:'SIMULATION ≠ OBSERVATION',text:'Synthetic or model-generated outcomes remain simulated until reality provides observed RETURN.'},
      {label:'COUNTERFACTUALS',title:'Counterfactuals expose dependence on assumptions.',text:'Changed variables remain explicit so alternate outcomes can be compared without becoming observed history.'},
      {label:'REPRODUCIBILITY',title:'A result must survive re-entry.',text:'Re-running the method exposes changes in evidence, model context and output instead of hiding variation.'},
      {label:'PROVIDER / MODEL',title:'Model identity remains inspectable.',text:'Provider and model are part of the run receipt rather than invisible infrastructure.'},
      {label:'PARAMETERS',title:'Parameters remain reconstructible.',text:'The conditions under which a result was produced remain addressable.'},
      {label:'HASHES',title:'A result remains content-addressable.',text:'Data, configuration, code and result hashes preserve reproducibility and provenance.'},
      {label:'RESULTS',title:'Results remain separate from real-world RETURN.',text:'A run may complete while external reality has not yet answered.'},
    ],
    actions:[{label:'Enter Method Lab',href:'/method-lab',kind:'primary'}],
  },
  {
    id:'world-vector',
    number:'05',
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
    number:'06',
    eyebrow:'REPOSITORY / PROVENANCE',
    title:'REPO',
    accent:'SITORY',
    lead:'Documents, evidence, publications, provenance and trajectories.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:REPOSITORY_ASSETS,
    frames:[
      {label:'SOURCE RECORDS',title:'The source remains distinct from the claim.',text:'Documents, datasets and records retain origin, time and access conditions.'},
      {label:'EVIDENCE',title:'Evidence is admitted against a question.',text:'A visible record does not automatically become evidence; relevance and support remain explicit.'},
      {label:'PUBLICATIONS',title:'Publication exposes an institutional object.',text:'Exposure, discovery, citation and adoption remain separate observations.'},
      {label:'CASE OBJECTS',title:'Case artifacts remain addressable.',text:'Records, analyses, decisions and outcomes remain connected instead of flattened into summaries.'},
      {label:'PROVENANCE',title:'Every object keeps where it came from.',text:'Source, transformation, inference and later explanation remain distinguishable.'},
      {label:'VERSIONS',title:'Changes remain longitudinally reconstructible.',text:'Each published or internal state retains its version and effective time.'},
      {label:'HASHES',title:'Objects remain content-addressable.',text:'Hashes support verification without becoming the primary human interface.'},
      {label:'LINEAGE',title:'Derivation remains visible.',text:'Lineage shows what an object derives from, what transformed it and what it later produced.'},
      {label:'MANIFESTS',title:'Packages declare what they contain.',text:'Machine-readable manifests keep collections inspectable and portable.'},
    ],
    actions:[{label:'Enter Repository',href:'/repository',kind:'primary'}],
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
      {label:'INSTITUTION',title:'Institutional events remain ordered.',text:'Decisions, methods, changes and observed returns remain tied to the state that existed when they occurred.'},
      {label:'WORLD',title:'World state keeps its own clock.',text:'External conditions remain longitudinal context rather than being rewritten from the present.'},
      {label:'CASE',title:'A case carries a reconstructible sequence.',text:'Evidence, inference, authority, execution and RETURN remain distinguishable.'},
      {label:'PROJECT',title:'Projects retain intervention history.',text:'Milestones, perturbations, dependencies and outcomes remain addressable without team memory.'},
      {label:'DEPLOYMENTS',title:'Deployment is an event, not proof of success.',text:'Technical release remains separate from material consequence and observed RETURN.'},
      {label:'TEMPORAL RELATIONS',title:'Before, after, enables and derives-from remain explicit.',text:'Relations across time remain inspectable instead of being inferred from proximity.'},
    ],
    actions:[{label:'Open Institutional Timeline',href:'/observatory#timeline',kind:'primary'}],
  },
  {
    id:'access',
    number:'08',
    eyebrow:'ACCESS / INSTITUTIONAL ENTRY',
    title:'ACCESS',
    accent:'',
    lead:'Identity is not authority. Access reveals what an authenticated actor may observe, operate or govern.',
    background:'/sfi/nyc/runtime/background.avif',
    assets:ACCESS_ASSETS,
    frames:[
      {label:'IDENTITY',title:'Identity establishes who is present.',text:'Authentication identifies the actor without silently granting institutional authority.'},
      {label:'ROLES',title:'Roles describe institutional position.',text:'Observer, Operator, Controller, ROOT and System remain distinct responsibility layers.'},
      {label:'PERMISSIONS',title:'Permissions remain inspectable.',text:'Capability access is visible before an action is attempted.'},
      {label:'ENVIRONMENTS',title:'Production, staging, sandbox and archive remain separate.',text:'The same identity can have different permissions in different operational environments.'},
      {label:'SESSIONS',title:'Active sessions remain accountable.',text:'Session state, authentication method and recent access remain reconstructible.'},
      {label:'ACCESS LOG',title:'Access itself leaves a trace.',text:'Institutional entry, scope requests and material access changes remain part of the record.'},
    ],
    actions:[{label:'Institutional Access',href:'/login',kind:'primary'}],
  },
] as const;
