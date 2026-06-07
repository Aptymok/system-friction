export type RootVisorPromptKind =
  | 'registered'
  | 'absent_record'
  | 'general_knowledge'
  | 'inference'
  | 'new_signal'
  | 'possible_evidence'
  | 'pattern_candidate'
  | 'hypothesis'
  | 'personal_signal';

export type RootVisorPromptClassification = {
  kind: RootVisorPromptKind;
  label: string;
  explanation: string;
  responseFrame: string;
};

function normalize(input: string) {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function hasAny(input: string, terms: string[]) {
  return terms.some((term) => input.includes(term));
}

export function classifyRootVisorPrompt(prompt: string, hasVisibleRecord = false): RootVisorPromptClassification {
  const normalized = normalize(prompt);

  if (hasAny(normalized, ['me duele', 'dolor', 'ansiedad', 'cansancio', 'sueno', 'cuerpo', 'siento que', 'mi familia', 'mi casa', 'mi perro', 'mi gato'])) {
    return {
      kind: 'personal_signal',
      label: 'Senal personal o corporal.',
      explanation: 'La consulta puede ser importante para el usuario, pero no aparece automaticamente como evidencia institucional.',
      responseFrame: 'Declarar si hay registro visible; si no lo hay, conversar como senal nueva sin diagnosticar ni registrar.',
    };
  }

  if (hasAny(normalized, ['evidencia', 'prueba', 'fuente', 'documento', 'captura', 'link', 'registro'])) {
    return hasVisibleRecord
      ? {
          kind: 'registered',
          label: 'Registro visible.',
          explanation: 'Hay material visible para leer desde SFI.',
          responseFrame: 'Usar el registro y separar lectura, implicacion y limite de evidencia.',
        }
      : {
          kind: 'possible_evidence',
          label: 'Posible evidencia no registrada.',
          explanation: 'La consulta menciona evidencia, pero no hay rastro visible suficiente en el contexto recibido.',
          responseFrame: 'Pedir fuente o ruta de observacion; no tratarlo como hecho.',
        };
  }

  if (hasAny(normalized, ['patron', 'repeticion', 'se repite', 'siempre', 'cada vez'])) {
    return {
      kind: 'pattern_candidate',
      label: 'Candidato a patron.',
      explanation: 'La consulta apunta a repeticion, pero necesita rastro y criterio antes de consolidarse.',
      responseFrame: 'Separar repeticion observada, evidencia faltante y proxima observacion.',
    };
  }

  if (hasAny(normalized, ['hipotesis', 'podria', 'puede ser', 'tal vez', 'quizas'])) {
    return {
      kind: 'hypothesis',
      label: 'Hipotesis.',
      explanation: 'La consulta pide posibilidad, no cierre.',
      responseFrame: 'Responder como hipotesis y declarar que no fortalece atractor sin Accion de Realidad verificable.',
    };
  }

  if (hasAny(normalized, ['que es', 'explica', 'como funciona', 'por que', 'porque'])) {
    return {
      kind: 'general_knowledge',
      label: 'Conocimiento general.',
      explanation: 'La consulta puede contestarse sin inventar registro.',
      responseFrame: 'Usar conocimiento general y marcar si no hay registro SFI.',
    };
  }

  if (hasVisibleRecord) {
    return {
      kind: 'registered',
      label: 'Registro visible.',
      explanation: 'El Visor tiene memoria visible relacionada con la consulta.',
      responseFrame: 'Leer el registro sin convertir propuestas o pruebas en ejecucion real.',
    };
  }

  return {
    kind: 'absent_record',
    label: 'Sin registro visible.',
    explanation: 'No hay rastro suficiente en la memoria visible del Visor.',
    responseFrame: 'Responder como inferencia, conocimiento general o ruta de observacion, sin fingir registro.',
  };
}
