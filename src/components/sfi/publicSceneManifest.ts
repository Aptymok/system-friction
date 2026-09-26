export type SceneFrame = {
  label: string;
  title: string;
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
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

/**
 * Public spatial journey.
 *
 * Visible human destinations are deliberately bounded to:
 * SIGN IN · OBSERVATORY · PUBLICATIONS.
 *
 * ENTRY → OBSERVATORY → SYSTEM FIELD → FRICTION → INSTITUTION → RETURN
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
    primaryHref:'/login',
    primaryLabel:'SIGN IN',
    secondaryHref:'/observatory',
    secondaryLabel:'OBSERVATORY',
  },
  {
    id:'observatory-dashboard',
    number:'02',
    scale:'orbital',
    eyebrow:'OBSERVATORY',
    title:'NOTHING',
    accent:'OPERATES ALONE.',
    lead:'Cities, water, energy, institutions, networks and people form coupled systems. The observatory is where those relations become visible.',
    background:'/assets/sfi/system/reference/02_03.png',
    assets:[],
    frames:[
      {label:'WORLD',title:'A moving field.',text:'The world is not a backdrop. It is the coupled field in which every system is already affecting others.'},
      {label:'SYSTEMS',title:'Interconnected realities.',text:'Energy, water, logistics, institutions, markets, ecosystems and people exchange constraints and possibilities.'},
      {label:'PATTERNS',title:'Signals in the noise.',text:'Repeated relations can reveal structure without being confused with cause.'},
      {label:'PEOPLE',title:'Consequences become lived.',text:'Every system eventually resolves into access, burden, risk, trust and lived consequence.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'OPEN OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLICATIONS',
  },
  {
    id:'system-field',
    number:'03',
    scale:'territory',
    eyebrow:'SYSTEM FIELD',
    title:'RELATIONS',
    accent:'SHAPE THE POSSIBLE.',
    lead:'A system is not its parts. It is the changing arrangement of flows, dependencies, boundaries and feedback among them.',
    background:'/assets/sfi/system/reference/02_03.png',
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
    primaryHref:'/observatory',
    primaryLabel:'OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLICATIONS',
  },
  {
    id:'friction',
    number:'04',
    scale:'territory',
    eyebrow:'FRICTION',
    title:'WHERE SYSTEMS MEET,',
    accent:'POSSIBILITIES CHANGE.',
    lead:'Friction is not simply failure. It appears where systems, incentives, constraints, timescales and interpretations meet.',
    background:'/assets/sfi/scenes/04_05_background.png',
    assets:[
      {src:'/assets/sfi/scenes/07_return_network.png',role:'signal',depth:1,motion:'pointer-parallax',scale:'orbital',alpha:true},
      {src:'/assets/sfi/scenes/04_observer.png',role:'human',depth:3,motion:'pointer-parallax',scale:'human',alpha:true},
    ],
    frames:[
      {label:'CONVERGENCE',title:'Systems reinforce one another.',text:'Aligned flows can concentrate capability, legitimacy, capital or opportunity.'},
      {label:'INTERFERENCE',title:'One system changes another.',text:'A local action can produce remote effects through dependencies that are not visible from a single node.'},
      {label:'DIVERGENCE',title:'Different realities persist.',text:'Actors can inhabit the same system while seeing different evidence, incentives and consequences.'},
      {label:'CONSTRAINT',title:'Limits redirect possibility.',text:'Scarcity, rules, geometry, timing and authority can reshape the available path without stopping the system.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLICATIONS',
  },
  {
    id:'institution',
    number:'05',
    scale:'institutional',
    eyebrow:'INSTITUTION',
    title:'COMPLEXITY BECOMES',
    accent:'RESPONSIBILITY.',
    lead:'Institutions transform signals into memory, interpretation, authority and action. Their internal boundaries determine what the world can become through them.',
    background:'/assets/sfi/scenes/04_05_background.png',
    assets:[
      {src:'/assets/sfi/scenes/07_return_network.png',role:'signal',depth:1,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/scenes/05_board.png',role:'human',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'PROCESS',title:'Signals enter procedure.',text:'Processes determine what can be recognized, routed, delayed, escalated or ignored.'},
      {label:'MEMORY',title:'Institutions remember selectively.',text:'Records preserve some states and erase others; reconstructibility depends on what survives.'},
      {label:'AUTHORITY',title:'Capability is not permission.',text:'Authority defines who may transform interpretation into consequential action.'},
      {label:'EXECUTION',title:'Action changes the field.',text:'Execution alters conditions outside the institution and creates the need for RETURN.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'PUBLICATIONS',
  },
  {
    id:'return',
    number:'06',
    scale:'institutional',
    eyebrow:'RETURN',
    title:'RETURN.',
    accent:'REALITY ANSWERS BACK.',
    lead:'Outcomes emerge. Contradictions surface. Consequences accumulate. Effects move back into the world and become evidence for what comes next.',
    background:'/assets/sfi/scenes/07_return_background.png',
    assets:[
      {src:'/assets/sfi/scenes/07_return_network.png',role:'signal',depth:1,motion:'pointer-parallax',scale:'planetary',alpha:true},
      {src:'/assets/sfi/scenes/07_return_monument.png',role:'structure',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/scenes/07_return_people.png',role:'human',depth:4,motion:'pointer-parallax',scale:'human',alpha:true},
    ],
    frames:[
      {label:'OUTCOME',title:'What happened?',text:'Observed result remains separate from the intention that preceded it.'},
      {label:'CONTRAST',title:'What survived reality?',text:'Expectation is compared with consequence without rewriting the prior state.'},
      {label:'CORRECTION',title:'What changes now?',text:'RETURN can alter memory, confidence, method, authority or the next available action.'},
    ],
    primaryHref:'/publications',
    primaryLabel:'PUBLICATIONS',
    secondaryHref:'/observatory',
    secondaryLabel:'OBSERVATORY',
  },
] as const;
