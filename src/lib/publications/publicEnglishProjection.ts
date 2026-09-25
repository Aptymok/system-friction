export type PublicEnglishProjection = Readonly<{
  title: string;
  subtitle: string;
  summary: string;
}>;

const PUBLIC_ENGLISH_PROJECTIONS: Record<string, PublicEnglishProjection> = {
  'notas-temporales-v1': {
    title: 'Temporary Notes',
    subtitle: 'Systemic observation for a world in transition',
    summary: 'SFI monthly institutional publication preserving a time-bounded reading of the observed field, its evidence, contradictions, open questions and later RETURN.',
  },
  'la-crisis-ya-no-ocurre-como-evento-ocurre-como-estado': {
    title: 'Crisis No Longer Happens as an Event. It Happens as a State.',
    subtitle: 'Notes on longitudinal observation, perceptual saturation and systems that continue operating while degrading.',
    summary: 'A public observation about persistent crisis conditions, normalization and the limits of event-based reading.',
  },
  'la-senal-aparece-antes-de-poder-nombrarla': {
    title: 'The Signal Appears Before It Can Be Named',
    subtitle: 'Notes on observation, recognition and phenomena that begin to exist before they can be explained.',
    summary: 'A public observation about weak signals, delayed recognition and the gap between appearance and naming.',
  },
  'lo-que-persiste-empieza-a-parecer-normal': {
    title: 'What Persists Begins to Look Normal',
    subtitle: 'Notes on habituation to anomaly, public traces and phenomena that expand before being recognized.',
    summary: 'A public observation about persistence, normalization and the loss of salience around continuing anomalies.',
  },
  'trayectoria': {
    title: 'Trajectory',
    subtitle: 'Notes on vectors, accumulated imperceptible change and the detection of direction in complex systems.',
    summary: 'A public observation about direction, accumulation and longitudinal reading.',
  },
  'fenomenos-persistentes-un-atlas-en-construccion': {
    title: 'Persistent Phenomena. An Atlas in Progress.',
    subtitle: 'Notes on configurations that return, move and preserve direction through time.',
    summary: 'A public atlas observation focused on persistence, displacement and recurrence.',
  },
  'el-observador-como-parte-del-instrumento': {
    title: 'The Observer as Part of the Instrument',
    subtitle: 'Notes on metacognition, assisted record keeping and the transformation of observation into infrastructure.',
    summary: 'A public method note about the observer, instrumentation and the preservation of observational limits.',
  },
  'infraestructura-para-observar-lo-que-no-se-deja-ver': {
    title: 'Infrastructure for Observing What Resists Visibility',
    subtitle: 'Notes on evidence, traceability and the transformation of intuition into an instrument.',
    summary: 'A public method note about moving from intuition toward traceable observation.',
  },
  'memoria-antes-que-explicacion': {
    title: 'Memory Before Explanation',
    subtitle: 'Notes on what persists while collective attention looks elsewhere.',
    summary: 'A public return note about memory, persistence and delayed interpretation.',
  },
  'atlas': {
    title: 'Atlas',
    subtitle: 'Notes on cartography in emerging territories.',
    summary: 'A public observation about mapping uncertain or still-forming fields without overstating certainty.',
  },
  'el-punto-de-origen-estaba-al-final': {
    title: 'The Point of Origin Was at the End',
    subtitle: 'Notes on a trajectory that could only be recognized after it had already been traversed.',
    summary: 'A public return note about retrospective legibility and longitudinal reconstruction.',
  },
  't-9-minutos-ia-instituciones-y-friccion': {
    title: 'T-9 Minutes: AI, Institutions and Friction',
    subtitle: 'An observed decision window before the system closes around a response.',
    summary: 'A public institutional observation about decision timing, AI and organizational friction.',
  },
  't-72-horas-la-senal-no-era-la-cancion': {
    title: 'T+72 Hours: The Signal Was Not the Song',
    subtitle: 'KXTXR, REM618, 111 and QUE NO: what appears when a work can be observed before, during and after entering the world.',
    summary: 'A public trajectory note separating publication, signal, memory, body and RETURN.',
  },
  'kavak-estado-autoridad-ejecucion': {
    title: 'KAVAK / STATE / AUTHORITY / EXECUTION',
    subtitle: 'A falsifiable observation about what remains reconstructible when communicated state and material closure diverge.',
    summary: 'A public case note about state, authority, execution and reconstructibility.',
  },
  'the-reality-chain': {
    title: 'The Reality Chain',
    subtitle: 'Evidence, Artificial Intelligence and the Collapse of the Distance Between Observation and Claim',
    summary: 'A public-source friction brief about reconstructibility across observation, evidence, inference, authority, execution and RETURN.',
  },
  'the-years-that-did-exist': {
    title: 'The Years That Did Exist',
    subtitle: 'From phantom time to a comparative anatomy of civilizational capacity',
    summary: 'A public research note comparing historical claims and civilizational capacity without promoting synthesis to law.',
  },
};

export function publicEnglishProjection(slug: string, fallback?: Partial<PublicEnglishProjection>): PublicEnglishProjection {
  return PUBLIC_ENGLISH_PROJECTIONS[slug] ?? {
    title: fallback?.title || 'SFI Publication',
    subtitle: fallback?.subtitle || 'Public institutional record',
    summary: fallback?.summary || 'This canonical object is preserved by SFI with identity, provenance and epistemic boundaries.',
  };
}

export function publicEnglishObservationLabel(kind: string | null | undefined) {
  const labels: Record<string, string> = {
    SIGNAL: 'SIGNAL',
    TRAJECTORY: 'TRAJECTORY',
    CASE: 'CASE',
    METHOD: 'METHOD',
    MEMORY: 'MEMORY',
    ATLAS: 'ATLAS',
    INSTITUTIONAL: 'INSTITUTIONAL',
  };
  return labels[kind || ''] || 'OBSERVATION';
}
