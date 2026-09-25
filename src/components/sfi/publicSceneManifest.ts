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
 * Public experience grammar
 *
 * Vertical = change of scale / scene.
 * Horizontal = change of lens inside the active scene.
 * Pointer = local depth / hotspot inspection.
 *
 * ENTRY → OBSERVATORY → METHOD → INSTITUTION → EVIDENCE → AUTHORITY →
 * HUMAN → RETURN
 *
 * Visual sources are drawn from the canonical /public/assets/sfi corpus.
 */
export const SCENES: readonly Scene[] = [
  {
    id:'entry-world',
    number:'01',
    scale:'planetary',
    eyebrow:'SYSTEM FRICTION INSTITUTE',
    title:'OBSERVE THE WORLD',
    accent:'BEFORE YOU EXPLAIN IT.',
    lead:'A more reconstructible world begins by separating what is seen, what is inferred, and what can be acted upon.',
    background:'/assets/sfi/scenes/sala_inicial.png',
    assets:[
      {src:'/assets/sfi/maps/planeta_tierra.png',role:'background',depth:1,motion:'slow-drift',scale:'orbital'},
      {src:'/assets/sfi/overlays/domo sobre el planeta.png',role:'interface',depth:2,motion:'pointer-parallax',scale:'planetary',alpha:true},
      {src:'/assets/sfi/overlays/shinny_effect.png',role:'atmosphere',depth:3,motion:'slow-drift',scale:'planetary',alpha:true},
      {src:'/assets/sfi/overlays/margen_inicial.png',role:'interface',depth:4,motion:'static',scale:'planetary',alpha:true},
    ],
    frames:[
      {label:'WORLD',title:'Begin with the field.',text:'Systems, territory, institutions and people are observed before a single explanation is privileged.'},
      {label:'POSITION',title:'Every reading has a position.',text:'Observation is situated by time, source, role, access and distance from consequence.'},
      {label:'BOUNDARY',title:'Keep the unknown visible.',text:'What has not been observed remains outside the claim instead of being filled by interface confidence.'},
    ],
    hotspots:[
      {x:69,y:34,label:'WORLD',text:'The world is the field being inspected, not a single institutional representation.'},
      {x:57,y:60,label:'POSITION',text:'SFI begins from an explicit observation position rather than an omniscient view.'},
      {x:82,y:67,label:'ENTER',text:'Move inward to convert planetary visibility into controlled inspection.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'ENTER OBSERVATORY',
    secondaryHref:'/institution',
    secondaryLabel:'UNDERSTAND SFI',
  },
  {
    id:'observatory-dashboard',
    number:'02',
    scale:'orbital',
    eyebrow:'OBSERVATORY / WORLD VECTOR',
    title:'SIGNALS BECOME READABLE',
    accent:'WHEN SCALE IS CONTROLLED.',
    lead:'The observatory is not a static dashboard. It is a position from which planetary signals, institutional time, and systemic contrast can be inspected.',
    background:'/assets/sfi/system/reference/a_wide_cinematic_futuristic_ui_header_website_inte.png',
    assets:[
      {src:'/assets/sfi/overlays/orbit-overlay.png',role:'signal',depth:1,motion:'slow-drift',scale:'orbital',alpha:true},
      {src:'/assets/sfi/overlays/halo_dorado_de_astrolabio_cósmico.png',role:'interface',depth:2,motion:'pointer-parallax',scale:'orbital',alpha:true},
      {src:'/assets/sfi/overlays/amanecer_dorado_celestial_transparente.png',role:'atmosphere',depth:3,motion:'slow-drift',scale:'orbital',alpha:true},
    ],
    frames:[
      {label:'OBSERVATION',title:'Observe what is present.',text:'Signals, positions and changing states appear before explanation.'},
      {label:'EVIDENCE',title:'Preserve what can be recovered.',text:'Evidence must remain retrievable, inspectable and challengeable.'},
      {label:'INFERENCE',title:'Interpret without collapsing uncertainty.',text:'Inference transforms observation but must remain distinguishable from it.'},
      {label:'AUTHORITY',title:'Capability does not equal permission.',text:'Authority identifies who may authorize action and under which boundary.'},
      {label:'EXECUTION',title:'Authorized is not executed.',text:'Systems must preserve whether an authorized act actually occurred.'},
      {label:'RETURN',title:'Outcome must remain visible.',text:'What happened after action changes what the system can responsibly say next.'},
    ],
    hotspots:[
      {x:51,y:28,label:'LOCK',text:'The camera locks onto an observation field before any methodological lens is applied.'},
      {x:74,y:54,label:'SIGNAL',text:'Network intensity directs attention without establishing cause.'},
      {x:87,y:72,label:'VECTOR',text:'World Vector becomes useful when time, location and source boundaries remain visible.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'BEGIN INSPECTION',
    secondaryHref:'/world-vector',
    secondaryLabel:'OPEN WORLD VECTOR',
  },
  {
    id:'method-lenses',
    number:'03',
    scale:'planetary',
    eyebrow:'METHOD LENSES',
    title:'CHANGE THE LENS,',
    accent:'NOT THE REALITY.',
    lead:'Observation, evidence, inference, authority, execution and return are distinct states. The interface may move between them without collapsing them into one.',
    background:'/assets/sfi/world/world-clean.png',
    assets:[
      {src:'/assets/sfi/world/world-network.png',role:'signal',depth:1,motion:'slow-drift',scale:'planetary',alpha:true},
      {src:'/assets/sfi/overlays/network-overlay.png',role:'signal',depth:2,motion:'pointer-parallax',scale:'planetary',alpha:true},
      {src:'/assets/sfi/ui/golden_celestial_astrolabe_hud.png',role:'interface',depth:3,motion:'pointer-parallax',scale:'planetary',alpha:true},
    ],
    frames:[
      {label:'OBSERVATION',title:'Representation is not reality.',text:'Observation preserves where, when and how something became visible.'},
      {label:'EVIDENCE',title:'Evidence survives retrieval.',text:'Institutional use requires provenance that can be recovered and challenged.'},
      {label:'INFERENCE',title:'Inference transforms evidence.',text:'Interpretation keeps uncertainty and rival explanations visible.'},
      {label:'AUTHORITY',title:'Authority is a governed boundary.',text:'Capability never silently becomes permission.'},
      {label:'EXECUTION',title:'Execution is a separate state.',text:'A permitted action may still remain unexecuted.'},
      {label:'RETURN',title:'Reality answers back.',text:'Post-action evidence can contradict the prior model and alter what follows.'},
    ],
    hotspots:[
      {x:66,y:34,label:'LENS',text:'Horizontal movement changes the method lens while preserving the same underlying field.'},
      {x:80,y:57,label:'TRACE',text:'Transitions between states remain reconstructible.'},
      {x:58,y:72,label:'CONTRAST',text:'Contradiction stays visible instead of being averaged away.'},
    ],
    primaryHref:'/library',
    primaryLabel:'INSPECT LENSES',
    secondaryHref:'/publications',
    secondaryLabel:'READ THE METHOD',
  },
  {
    id:'institutional-descent',
    number:'04',
    scale:'institutional',
    eyebrow:'INSTITUTIONAL DESCENT',
    title:'PLANETARY SYSTEMS BECOME',
    accent:'INSTITUTIONAL DECISIONS.',
    lead:'At institutional scale, visibility changes. What was signal becomes process, responsibility, limit and action.',
    background:'/assets/sfi/institutional/celestial_observatory_temple_interior.png',
    assets:[
      {src:'/assets/sfi/institutional/observatory-frame.png',role:'structure',depth:1,motion:'scale-in',scale:'institutional'},
      {src:'/assets/sfi/institutional/institution-frame.png',role:'structure',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/overlays/light.png',role:'atmosphere',depth:3,motion:'slow-drift',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'PROCESS',title:'Signal becomes process.',text:'Institutional rules determine what can enter a formal decision path.'},
      {label:'RESPONSIBILITY',title:'Roles create asymmetric obligations.',text:'Different positions carry different authority, evidence burdens and consequences.'},
      {label:'LIMIT',title:'Institutional boundaries matter.',text:'The same capability can be permitted, prohibited or irrelevant under different mandates.'},
    ],
    hotspots:[
      {x:64,y:34,label:'ENTRY',text:'The world field enters an institutional frame without becoming identical to it.'},
      {x:79,y:54,label:'BOUNDARY',text:'Jurisdiction and mandate shape what can be done.'},
      {x:58,y:72,label:'DESCENT',text:'The next scale moves from institutional structure into recoverable evidence.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'ENTER THE INSTITUTION',
    secondaryHref:'/observatory',
    secondaryLabel:'RETURN TO FIELD',
  },
  {
    id:'archive-evidence',
    number:'05',
    scale:'institutional',
    eyebrow:'EVIDENCE / ARCHIVE',
    title:'A SYSTEM BECOMES RECONSTRUCTIBLE',
    accent:'WHEN EVIDENCE CAN BE RECOVERED.',
    lead:'Memory is not the interface. It is the recoverable trace that allows observation, challenge and continuity.',
    background:'/assets/sfi/institutional/futuristic_golden_archive_pedestal.png',
    assets:[
      {src:'/assets/sfi/ui/dossier_futurista_en_negro_y_oro.png',role:'structure',depth:1,motion:'scale-in',scale:'institutional',alpha:true},
      {src:'/assets/sfi/ui/red_de_inferencia_futurista_hud.png',role:'interface',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/ui/icons/02_evidence_archive.png',role:'interface',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'SOURCE',title:'A source is not yet evidence.',text:'Institutional evidence requires preserved provenance and recoverability.'},
      {label:'RECORD',title:'Records preserve state.',text:'A record allows later reconstruction of what the institution knew or claimed.'},
      {label:'CHALLENGE',title:'Evidence must survive inspection.',text:'A trace that cannot be questioned cannot reliably anchor institutional memory.'},
    ],
    hotspots:[
      {x:62,y:35,label:'SOURCE',text:'Origin remains attached to the claim.'},
      {x:80,y:55,label:'RETRIEVAL',text:'Evidence must remain recoverable after the interface changes.'},
      {x:58,y:71,label:'MEMORY',text:'Institutional memory is a traceable system, not a visual archive effect.'},
    ],
    primaryHref:'/library',
    primaryLabel:'OPEN THE ARCHIVE',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'authority-execution',
    number:'06',
    scale:'institutional',
    eyebrow:'AUTHORITY / EXECUTION',
    title:'CAPABILITY IS NOT AUTHORITY.',
    accent:'AUTHORIZATION IS NOT EXECUTION.',
    lead:'The institution must preserve who could act, who did authorize action, and whether action actually occurred.',
    background:'/assets/sfi/institutional/consejo_global_en_mesa_dorada.png',
    assets:[
      {src:'/assets/sfi/ui/ruta_de_autoridad_capacidad_autoridad_y_ejecució.png',role:'interface',depth:1,motion:'scale-in',scale:'institutional',alpha:true},
      {src:'/assets/sfi/ui/icons/04_authority_axis.png',role:'interface',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/ui/icons/05_execution_node.png',role:'signal',depth:3,motion:'pointer-parallax',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'CAPABILITY',title:'What can the system do?',text:'Technical ability is observed separately from permission.'},
      {label:'AUTHORITY',title:'Who may permit action?',text:'Authority is bounded by role, scope, conditions and responsibility.'},
      {label:'EXECUTION',title:'What actually happened?',text:'Execution is preserved as an observed state rather than inferred from authorization.'},
    ],
    hotspots:[
      {x:62,y:34,label:'CAPABILITY',text:'Capability expands possible action without granting permission.'},
      {x:79,y:54,label:'AUTHORITY',text:'Authority determines whether an action may proceed.'},
      {x:59,y:71,label:'EXECUTION',text:'Executed and authorized remain separate states.'},
    ],
    primaryHref:'/institution',
    primaryLabel:'TRACE DECISION PATH',
    secondaryHref:'/library',
    secondaryLabel:'OPEN METHOD',
  },
  {
    id:'human-scale',
    number:'07',
    scale:'human',
    eyebrow:'HUMAN SCALE',
    title:'SYSTEMS BECOME REAL',
    accent:'AS LIVED CONSEQUENCES.',
    lead:'At human scale, systems stop being abstract. Roles, burdens, trust and consequences become visible.',
    background:'/assets/sfi/people/equipo_de_análisis_bajo_luz_dorada.png',
    assets:[
      {src:'/assets/sfi/people/observer.png',role:'human',depth:1,motion:'scale-in',scale:'human',alpha:true},
      {src:'/assets/sfi/people/analista_profesional_con_tablet_y_luz_dorada.png',role:'human',depth:2,motion:'pointer-parallax',scale:'human',alpha:true},
      {src:'/assets/sfi/ui/interfaz_hud_dorada_de_lente_futurista.png',role:'interface',depth:3,motion:'pointer-parallax',scale:'human',alpha:true},
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
    primaryLabel:'READ POSITIONS',
    secondaryHref:'/publications',
    secondaryLabel:'READ CASES',
  },
  {
    id:'return-loop',
    number:'08',
    scale:'institutional',
    eyebrow:'RETURN',
    title:'WHAT HAPPENED NEXT',
    accent:'MUST CHANGE WHAT COMES NEXT.',
    lead:'Return preserves outcomes after action. It allows reality, contradiction and consequence to alter the next reading of the system.',
    background:'/assets/sfi/scenes/antes_y_después_retorno_estable.png',
    assets:[
      {src:'/assets/sfi/ui/tarjeta_futurista_de_retorno_público.png',role:'interface',depth:1,motion:'scale-out',scale:'institutional',alpha:true},
      {src:'/assets/sfi/ui/icons/06_return_loop.png',role:'signal',depth:2,motion:'pointer-parallax',scale:'institutional',alpha:true},
      {src:'/assets/sfi/overlays/light.png',role:'atmosphere',depth:3,motion:'slow-drift',scale:'institutional',alpha:true},
    ],
    frames:[
      {label:'OUTCOME',title:'What happened afterward?',text:'Observed result remains separate from the intention that preceded it.'},
      {label:'CONTRAST',title:'What survived contact with reality?',text:'Expected effects, contradictions and failures are compared without rewriting the prior state.'},
      {label:'CORRECTION',title:'What must change next?',text:'Return can alter memory, method, confidence, authority or the next available action.'},
    ],
    hotspots:[
      {x:67,y:34,label:'OUTCOME',text:'Outcome is post-action evidence, not a decorative completion state.'},
      {x:82,y:55,label:'CONTRAST',text:'Contradiction remains visible even when it weakens the original interpretation.'},
      {x:60,y:72,label:'CORRECTION',text:'The system becomes accountable when return can change what comes next.'},
    ],
    primaryHref:'/observatory',
    primaryLabel:'RETURN TO OBSERVATORY',
    secondaryHref:'/publications',
    secondaryLabel:'READ PUBLISHED RETURNS',
  },
] as const;
