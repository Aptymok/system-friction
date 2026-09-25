export type SceneFrame = {
  label: string;
  title: string;
  text: string;
};

export type SceneHotspot = {
  x: number;
  y: number;
  label: string;
  text: string;
};

export type SceneAsset = {
  src: string;
  role: 'background' | 'atmosphere' | 'terrain' | 'structure' | 'signal' | 'interface' | 'human';
  depth: number;
  motion: 'static' | 'slow-drift' | 'pointer-parallax' | 'scale-in' | 'scale-out';
  scale: 'institutional' | 'human' | 'city' | 'territory' | 'planetary' | 'orbital';
  alpha?: boolean;
};

export type Scene = {
  id: string;
  number: string;
  scale: SceneAsset['scale'];
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  background: string;
  assets: readonly SceneAsset[];
  frames: readonly SceneFrame[];
  hotspots: readonly SceneHotspot[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

/**
 * Public vertical spine:
 * SFI → SPACE → EARTH → TERRITORY → CITY → INSTITUTION → HUMAN → SFI / RETURN
 *
 * Horizontal frames are lenses, not a second page hierarchy. They may expose
 * method, time, actor, signal, authority or contrast according to the scene.
 *
 * Current image paths intentionally reuse existing production-safe assets.
 * As /public/assets/sfi masters arrive, only this manifest should need to change.
 */
export const SCENES: readonly Scene[] = [
  {
    id:'sfi',
    number:'01',
    scale:'institutional',
    eyebrow:'SYSTEM FRICTION INSTITUTE · PUBLIC ENTRY',
    title:'OBSERVE THE SYSTEM.',
    accent:'CHANGE THE SCALE.',
    lead:'SFI begins as a position from which systems can be observed without pretending that the interface is the world itself.',
    background:'/sfi-scenes/field-cinematic.webp',
    assets:[
      {src:'/sfi-scenes/field.svg',role:'interface',depth:1,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/systems.svg',role:'signal',depth:2,motion:'slow-drift',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/identity.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'SYSTEM',title:'Start with the whole.',text:'A system is treated as relations, constraints and changing options rather than as a decorative diagram.'},
      {label:'METHOD',title:'Separate representation from reality.',text:'The public surface shows a reading position. It does not silently promote interface output into observation.'},
      {label:'BOUNDARY',title:'Keep authority visible.',text:'Public inspection remains read-only. Institutional authority and execution stay elsewhere.'},
    ],
    hotspots:[
      {x:70,y:34,label:'POSITION',text:'SFI is an observing and reconstructive position, not an omniscient viewpoint.'},
      {x:58,y:61,label:'SCALE',text:'Vertical movement changes the physical and institutional scale under inspection.'},
      {x:83,y:68,label:'LENS',text:'Horizontal movement changes the lens without changing the underlying scene.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'UNDERSTAND SFI',
    secondaryHref:'/observatory',
    secondaryLabel:'OPEN OBSERVATORY',
  },
  {
    id:'space',
    number:'02',
    scale:'orbital',
    eyebrow:'SCALE 02 · SPACE',
    title:'DISTANCE CHANGES',
    accent:'WHAT CAN BE SEEN.',
    lead:'The journey moves outward before descending inward. At orbital scale, structure appears before local institutional meaning.',
    background:'/sfi-scenes/world.png',
    assets:[
      {src:'/sfi-scenes/satellite.png',role:'structure',depth:1,motion:'slow-drift',scale:'orbital'},
      {src:'/sfi-scenes/systems.svg',role:'signal',depth:2,motion:'pointer-parallax',scale:'orbital',alpha:true},
      {src:'/sfi-scenes/field.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'orbital',alpha:true},
    ],
    frames:[
      {label:'SYSTEM',title:'Planet before jurisdiction.',text:'At this distance, borders, institutions and roles are secondary to physical continuity.'},
      {label:'SIGNALS',title:'Movement appears before explanation.',text:'Signals can reveal change and coupling without establishing cause or authority.'},
      {label:'TIME',title:'One planet, multiple institutional clocks.',text:'Global simultaneity does not imply synchronized institutional reality.'},
    ],
    hotspots:[
      {x:72,y:34,label:'ORBIT',text:'Distance can expose structure while hiding local consequence.'},
      {x:57,y:62,label:'SIGNAL',text:'A visible signal is a prompt for inspection, not yet an institutional claim.'},
      {x:84,y:68,label:'LIMIT',text:'Resolution limits what can responsibly be inferred at this scale.'},
    ],
    primaryHref:'/field',
    primaryLabel:'READ WORLD FIELD',
    secondaryHref:'/observatory',
    secondaryLabel:'OPEN OBSERVATORY',
  },
  {
    id:'earth',
    number:'03',
    scale:'planetary',
    eyebrow:'SCALE 03 · EARTH',
    title:'THE WORLD IS',
    accent:'NOT ONE CONTEXT.',
    lead:'Planetary continuity contains different territories, infrastructures, timings and institutional realities.',
    background:'/sfi-scenes/world.png',
    assets:[
      {src:'/sfi-scenes/systems.svg',role:'signal',depth:1,motion:'slow-drift',scale:'planetary',alpha:true},
      {src:'/sfi-scenes/optionality.svg',role:'interface',depth:2,motion:'pointer-parallax',scale:'planetary',alpha:true},
      {src:'/sfi-scenes/field.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'planetary',alpha:true},
    ],
    frames:[
      {label:'SYSTEMS',title:'Coupled but not identical.',text:'Infrastructure, information, ecology, institutions and people share conditions without sharing one state.'},
      {label:'CONTRAST',title:'Compare without flattening.',text:'Differences remain visible instead of being averaged into a false global condition.'},
      {label:'TIME',title:'Institutional time diverges.',text:'The same external event can enter institutions through different sequences and delays.'},
    ],
    hotspots:[
      {x:69,y:35,label:'FIELD',text:'The world field is a changing condition set, not a single score.'},
      {x:81,y:55,label:'CONTRAST',text:'Comparison is useful only when the compared populations and times remain explicit.'},
      {x:59,y:71,label:'TRANSITION',text:'The next descent asks where planetary conditions become territorial constraints.'},
    ],
    primaryHref:'/field',
    primaryLabel:'ENTER FIELD',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'territory',
    number:'04',
    scale:'territory',
    eyebrow:'SCALE 04 · TERRITORY',
    title:'CONDITIONS BECOME',
    accent:'LOCAL CONSTRAINTS.',
    lead:'Atmosphere, terrain, water, access and distance alter what systems can do before an institution makes any decision.',
    background:'/sfi-scenes/field-cinematic.webp',
    assets:[
      {src:'/sfi-scenes/field.svg',role:'terrain',depth:1,motion:'scale-in',scale:'territory',alpha:true},
      {src:'/sfi-scenes/systems.svg',role:'signal',depth:2,motion:'pointer-parallax',scale:'territory',alpha:true},
      {src:'/sfi-scenes/optionality.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'territory',alpha:true},
    ],
    frames:[
      {label:'GEOGRAPHY',title:'Physical conditions shape options.',text:'Terrain and access are operational constraints, not visual background.'},
      {label:'INFRASTRUCTURE',title:'Systems materialize in territory.',text:'Networks, routes and services inherit physical limits and create new dependencies.'},
      {label:'FRICTION',title:'Constraint changes optionality.',text:'Friction is read through altered paths, delays, dependencies and costs.'},
    ],
    hotspots:[
      {x:63,y:34,label:'TERRAIN',text:'A physical constraint can precede every institutional explanation.'},
      {x:79,y:55,label:'PATH',text:'Routes expose dependence and asymmetry without proving motive.'},
      {x:58,y:72,label:'OPTION',text:'The relevant question is which options changed and for whom.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'INSPECT CONDITIONS',
    secondaryHref:'/library',
    secondaryLabel:'OPEN METHODS',
  },
  {
    id:'city',
    number:'05',
    scale:'city',
    eyebrow:'SCALE 05 · CITY',
    title:'SYSTEMS BECOME',
    accent:'DENSELY INTERDEPENDENT.',
    lead:'Cities compress infrastructure, people, institutions, signals, authority and consequences into the same operating field.',
    background:'/sfi-scenes/field-cinematic.webp',
    assets:[
      {src:'/sfi-scenes/systems.svg',role:'structure',depth:1,motion:'scale-in',scale:'city',alpha:true},
      {src:'/sfi-scenes/agents.svg',role:'human',depth:2,motion:'pointer-parallax',scale:'city',alpha:true},
      {src:'/sfi-scenes/governance.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'city',alpha:true},
    ],
    frames:[
      {label:'INFRASTRUCTURE',title:'Dependencies become dense.',text:'Transport, communications, energy and services create coupled operating conditions.'},
      {label:'PEOPLE',title:'Different actors occupy different positions.',text:'Visibility, burden and consequence differ by role and access.'},
      {label:'AUTHORITY',title:'Jurisdictions overlap.',text:'Capability, responsibility and permission do not automatically belong to the same actor.'},
      {label:'RETURN',title:'Consequences become public.',text:'Institutional actions leave effects in systems beyond the institution that initiated them.'},
    ],
    hotspots:[
      {x:61,y:34,label:'NETWORK',text:'Density increases both capability and propagation of failure.'},
      {x:80,y:54,label:'AUTHORITY',text:'Multiple institutions can act on the same field under different mandates.'},
      {x:58,y:71,label:'CONSEQUENCE',text:'Public consequence is part of the system state, not an afterthought.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'OPEN OBSERVATORY',
    secondaryHref:'/institution',
    secondaryLabel:'ENTER INSTITUTION',
  },
  {
    id:'institution',
    number:'06',
    scale:'institutional',
    eyebrow:'SCALE 06 · INSTITUTION',
    title:'CAPABILITY IS NOT',
    accent:'AUTHORITY.',
    lead:'The descent enters the institution: evidence, inference, authority, execution and memory become separable states.',
    background:'/images/editorial/notas-de-laboratorio.webp',
    assets:[
      {src:'/sfi-scenes/archive.svg',role:'structure',depth:1,motion:'scale-in',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/authority.svg',role:'interface',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/governance.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'EVIDENCE',title:'Recoverable support.',text:'Institutional memory depends on evidence that can be retrieved, inspected and challenged.'},
      {label:'INFERENCE',title:'Transformation with uncertainty.',text:'Interpretation remains distinguishable from observation.'},
      {label:'AUTHORITY',title:'A governed boundary.',text:'Authority identifies who may permit action, under what scope and with what traceable limit.'},
      {label:'EXECUTION',title:'Authorization is not execution.',text:'The institution must preserve whether an authorized action actually occurred.'},
    ],
    hotspots:[
      {x:65,y:33,label:'EVIDENCE',text:'Provenance and retrieval must survive the interface.'},
      {x:81,y:53,label:'AUTHORITY',text:'Capability does not silently become permission.'},
      {x:59,y:71,label:'EXECUTION',text:'Authorized and executed remain separate states.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'READ INSTITUTIONAL BOUNDARIES',
    secondaryHref:'/library',
    secondaryLabel:'ENTER LIBRARY',
  },
  {
    id:'human',
    number:'07',
    scale:'human',
    eyebrow:'SCALE 07 · HUMAN',
    title:'INSTITUTIONS BECOME',
    accent:'LIVED CONSEQUENCES.',
    lead:'The smallest scale is not a data point. It is a person occupying a role, making a decision, carrying a burden or receiving an effect.',
    background:'/images/editorial/notas-de-laboratorio.webp',
    assets:[
      {src:'/sfi-scenes/agents.svg',role:'human',depth:1,motion:'scale-in',scale:'human',alpha:true},
      {src:'/sfi-scenes/identity.svg',role:'human',depth:2,motion:'pointer-parallax',scale:'human',alpha:true},
      {src:'/sfi-scenes/models.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'human',alpha:true},
    ],
    frames:[
      {label:'EXECUTIVE',title:'Decision horizon.',text:'Risk, optionality, authority, external effect and institutional exposure.'},
      {label:'OPERATOR',title:'Operational horizon.',text:'Constraints, handoffs, queues, tools and immediate consequences.'},
      {label:'ANALYST',title:'Evidence horizon.',text:'Patterns, uncertainty, provenance, rival explanations and missing information.'},
      {label:'CITIZEN',title:'Lived horizon.',text:'Access, burden, trust and the reality produced by institutional action.'},
    ],
    hotspots:[
      {x:55,y:36,label:'POSITION',text:'Visibility changes with role, access, responsibility and distance from the event.'},
      {x:75,y:55,label:'STAKE',text:'Different actors carry different costs when a system is wrong.'},
      {x:62,y:72,label:'BLIND SPOT',text:'No perspective is treated as the complete institution.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'SEE THE INSTITUTE',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'return',
    number:'08',
    scale:'institutional',
    eyebrow:'RETURN · SYSTEM FRICTION INSTITUTE',
    title:'ACTION LEAVES',
    accent:'A TRACE.',
    lead:'The journey closes where it began, but with a changed state. RETURN preserves what happened after action and lets reality alter the next reading.',
    background:'/images/editorial/notas-de-retorno.webp',
    assets:[
      {src:'/sfi-scenes/falsification.svg',role:'interface',depth:1,motion:'scale-out',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/optionality.svg',role:'signal',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/sfi-scenes/field.svg',role:'interface',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'OUTCOME',title:'What happened afterward?',text:'Observed result remains separate from the intention that preceded it.'},
      {label:'CONTRAST',title:'What survived contact with reality?',text:'Expected effects, contradictions and failures are compared without rewriting the prior state.'},
      {label:'CORRECTION',title:'What must change next?',text:'RETURN can alter memory, method, confidence, authority or the next available action.'},
    ],
    hotspots:[
      {x:67,y:34,label:'OUTCOME',text:'Outcome is post-action evidence, not a decorative completion state.'},
      {x:82,y:55,label:'CONTRAST',text:'Contradiction remains visible even when it weakens the original interpretation.'},
      {x:60,y:72,label:'CORRECTION',text:'The system becomes accountable when return can change what comes next.'},
    ],
    primaryHref:'/publications',
    primaryLabel:'READ PUBLISHED RETURNS',
    secondaryHref:'/observatory',
    secondaryLabel:'RETURN TO OBSERVATORY',
  },
] as const;
