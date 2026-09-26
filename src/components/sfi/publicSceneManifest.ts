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
 * SFI public spatial grammar
 *
 * Vertical = enter another scale / institutional space.
 * Horizontal = move laterally inside the same system field.
 * Pointer = subtle depth only.
 *
 * The Reality Chain is an analytical instrument; it is not the geography
 * of the public site. SFI observes complex systems far beyond AI.
 *
 * ENTRY → OBSERVATORY → SYSTEM FIELD → FRICTION → INSTITUTION → LIBRARY → RETURN
 */
export const SCENES: readonly Scene[] = [
  {
    id:'entry-world',
    number:'01',
    scale:'planetary',
    eyebrow:'SYSTEM FRICTION INSTITUTE',
    title:'THE WORLD',
    accent:'ALREADY MOVES.',
    lead:'Systems interact before they are understood. SFI observes where relationships create friction, change and consequence.',
    background:'/assets/sfi/scenes/sala_inicial.png',
    assets:[],
    frames:[
      {label:'ENTRY',title:'Enter the field.',text:'Observe systems as relationships in motion rather than isolated objects.'},
    ],
    hotspots:[],
    primaryHref:'/observatory',
    primaryLabel:'ENTER OBSERVATORY',
    secondaryHref:'/institution',
    secondaryLabel:'ABOUT SFI',
  },
  {
    id:'observatory-dashboard',
    number:'02',
    scale:'orbital',
    eyebrow:'OBSERVATORY',
    title:'NOTHING',
    accent:'OPERATES ALONE.',
    lead:'Cities, water, energy, institutions, networks and people form coupled systems. The observatory is where those relations become visible.',
    background:'/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_website_inte.png',
    assets:[],
    frames:[
      {label:'WORLD',title:'A moving field.',text:'The world is not a backdrop. It is the coupled field in which every system is already affecting others.'},
      {label:'SYSTEMS',title:'Interconnected realities.',text:'Energy, water, logistics, institutions, markets, ecosystems and people exchange constraints and possibilities.'},
      {label:'PATTERNS',title:'Signals in the noise.',text:'Repeated relations can reveal structure without being confused with cause.'},
      {label:'PEOPLE',title:'Consequences become lived.',text:'Every system eventually resolves into access, burden, risk, trust and lived consequence.'},
    ],
    hotspots:[],
    primaryHref:'/observatory',
    primaryLabel:'OPEN OBSERVATORY',
    secondaryHref:'/field',
    secondaryLabel:'ENTER FIELD',
  },
  {
    id:'system-field',
    number:'03',
    scale:'territory',
    eyebrow:'SYSTEM FIELD',
    title:'RELATIONS',
    accent:'SHAPE THE POSSIBLE.',
    lead:'A system is not its parts. It is the changing arrangement of flows, dependencies, boundaries and feedback among them.',
    background:'/assets/sfi/system/reference/SFI_Un_Mundo_en_Movimiento.png',
    assets:[
      {src:'/assets/sfi/overlays/red_global_de_conexiones_luminosas.png',role:'signal',depth:1,motion:'pointer-parallax',scale:'planetary',alpha:true},
    ],
    frames:[
      {label:'ENERGY',title:'Capacity moves.',text:'Energy links production, infrastructure, territory, cost and institutional continuity.'},
      {label:'TERRITORY',title:'Space changes the system.',text:'Geography shapes access, exposure, distance, concentration and vulnerability.'},
      {label:'INFRASTRUCTURE',title:'Dependencies become physical.',text:'Networks, transport, compute, water and facilities constrain what other systems can do.'},
      {label:'INFORMATION',title:'Signals reorganize action.',text:'Information changes coordination, expectation and response across otherwise distant nodes.'},
      {label:'INSTITUTIONS',title:'Rules alter trajectories.',text:'Mandates, procedures and authority determine which possibilities become legitimate action.'},
    ],
    hotspots:[],
    primaryHref:'/field',
    primaryLabel:'EXPLORE FIELD',
    secondaryHref:'/world-vector',
    secondaryLabel:'WORLD VECTOR',
  },
  {
    id:'friction',
    number:'04',
    scale:'territory',
    eyebrow:'FRICTION',
    title:'WHERE SYSTEMS MEET,',
    accent:'POSSIBILITIES CHANGE.',
    lead:'Friction is not simply failure. It appears where systems, incentives, constraints, timescales and interpretations meet.',
    background:'/assets/sfi/system/reference/a_wide_cinematic_futuristic_sci_fi_ui_website_he.png',
    assets:[
      {src:'/assets/sfi/overlays/orbit-overlay.png',role:'signal',depth:1,motion:'slow-drift',scale:'orbital',alpha:true},
    ],
    frames:[
      {label:'CONVERGENCE',title:'Systems reinforce one another.',text:'Aligned flows can concentrate capability, legitimacy, capital or opportunity.'},
      {label:'INTERFERENCE',title:'One system changes another.',text:'A local action can produce remote effects through dependencies that are not visible from a single node.'},
      {label:'DIVERGENCE',title:'Different realities persist.',text:'Actors can inhabit the same system while seeing different evidence, incentives and consequences.'},
      {label:'CONSTRAINT',title:'Limits redirect possibility.',text:'Scarcity, rules, geometry, timing and authority can reshape the available path without stopping the system.'},
    ],
    hotspots:[],
    primaryHref:'/observatory',
    primaryLabel:'OBSERVE FRICTION',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'institution',
    number:'05',
    scale:'institutional',
    eyebrow:'INSTITUTION',
    title:'COMPLEXITY BECOMES',
    accent:'RESPONSIBILITY.',
    lead:'Institutions transform signals into memory, interpretation, authority and action. Their internal boundaries determine what the world can become through them.',
    background:'/assets/sfi/institutional/celestial_observatory_temple_interior.png',
    assets:[
      {src:'/assets/sfi/institutional/institution-frame.png',role:'structure',depth:1,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/overlays/light.png',role:'atmosphere',depth:2,motion:'slow-drift',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'PROCESS',title:'Signals enter procedure.',text:'Processes determine what can be recognized, routed, delayed, escalated or ignored.'},
      {label:'MEMORY',title:'Institutions remember selectively.',text:'Records preserve some states and erase others; reconstructibility depends on what survives.'},
      {label:'AUTHORITY',title:'Capability is not permission.',text:'Authority defines who may transform interpretation into consequential action.'},
      {label:'EXECUTION',title:'Action changes the field.',text:'Execution alters conditions outside the institution and creates the need for RETURN.'},
    ],
    hotspots:[],
    primaryHref:'/institution',
    primaryLabel:'ENTER INSTITUTION',
    secondaryHref:'/library',
    secondaryLabel:'OPEN LIBRARY',
  },
  {
    id:'library',
    number:'06',
    scale:'institutional',
    eyebrow:'LIBRARY / PUBLIC ARCHIVE',
    title:'MEMORY THAT',
    accent:'CAN BE RECOVERED.',
    lead:'The Library is the public memory surface: records, observations, publications and evidence that can be retrieved instead of merely remembered.',
    background:'/assets/sfi/system/reference/índice_dorado_del_archivo_estelar.png',
    assets:[],
    frames:[
      {label:'SOURCE',title:'Where did it come from?',text:'Origin and provenance remain attached to claims and records.'},
      {label:'RECORD',title:'What was preserved?',text:'A record captures an institutional state that can later be reconstructed.'},
      {label:'EVIDENCE',title:'What can withstand inspection?',text:'Evidence remains recoverable, inspectable and open to contradiction.'},
      {label:'PUBLICATION',title:'What becomes public memory?',text:'Publication exposes bounded findings without pretending that the archive is complete.'},
    ],
    hotspots:[],
    primaryHref:'/library',
    primaryLabel:'ENTER LIBRARY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLICATIONS',
  },
  {
    id:'return',
    number:'07',
    scale:'institutional',
    eyebrow:'RETURN',
    title:'REALITY CHANGES',
    accent:'WHAT COMES NEXT.',
    lead:'After action, the system answers back. Outcomes, contradictions and consequences must be able to alter the next interpretation and decision.',
    background:'/assets/sfi/scenes/antes_y_después_retorno_estable.png',
    assets:[
      {src:'/assets/sfi/ui/icons/06_return_loop.png',role:'signal',depth:1,motion:'scale-out',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'OUTCOME',title:'What happened?',text:'Observed result remains separate from the intention that preceded it.'},
      {label:'CONTRAST',title:'What survived reality?',text:'Expectation is compared with consequence without rewriting the prior state.'},
      {label:'CORRECTION',title:'What changes now?',text:'RETURN can alter memory, confidence, method, authority or the next available action.'},
    ],
    hotspots:[],
    primaryHref:'/observatory',
    primaryLabel:'RETURN TO OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLISHED RETURNS',
  },
] as const;
