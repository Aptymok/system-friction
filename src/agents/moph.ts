export interface MOPHQuestion {
  id: string
  phase: string
  variable: 'signal' | 'pattern' | 'cost' | 'nti' | 'ego'
  text: string
}

export const MOPH_QUESTIONS: MOPHQuestion[] = [
  { id: 'P01', phase: 'SENAL BRUTA', variable: 'signal', text: 'Que sientes que no esta funcionando en tu vida o trabajo ahora mismo?' },
  { id: 'P02', phase: 'SENAL BRUTA', variable: 'signal', text: 'Desde cuando lo vienes cargando asi?' },
  { id: 'P03', phase: 'SENAL BRUTA', variable: 'signal', text: 'Si tuvieras que ponerlo en una frase simple, cual seria?' },
  { id: 'P04', phase: 'PATRON DE RESPUESTA', variable: 'pattern', text: 'Que has hecho para resolverlo hasta ahora?' },
  { id: 'P05', phase: 'PATRON DE RESPUESTA', variable: 'pattern', text: 'Que pensabas que iba a pasar cuando hiciste eso?' },
  { id: 'P06', phase: 'PATRON DE RESPUESTA', variable: 'pattern', text: 'Y que paso en realidad?' },
  { id: 'P07', phase: 'COSTO REAL', variable: 'cost', text: 'En que te esta afectando esto hoy, en lo concreto?' },
  { id: 'P08', phase: 'COSTO REAL', variable: 'cost', text: 'Que has tenido que dejar de lado por esto?' },
  { id: 'P09', phase: 'COSTO REAL', variable: 'cost', text: 'Si todo sigue igual, que se empieza a romper primero?' },
  { id: 'P10', phase: 'INTEGRIDAD DE SENAL', variable: 'nti', text: 'Hay algo que sabes que tendrias que hacer, pero no estas haciendo?' },
  { id: 'P11', phase: 'INTEGRIDAD DE SENAL', variable: 'nti', text: 'Que te esta frenando realmente? No lo correcto, lo real.' },
  { id: 'P12', phase: 'INTEGRIDAD DE SENAL', variable: 'nti', text: 'Que estas evitando admitir, incluso contigo?' },
  { id: 'P13', phase: 'INTEGRIDAD DE SENAL', variable: 'nti', text: 'Que dices que es importante para ti en esto? Viendo lo que haces hoy, eso se refleja o no tanto?' },
  { id: 'P14', phase: 'INVARIANTE TOPOLOGICO', variable: 'ego', text: 'Quien mas esta dentro de esto? Que has dicho claramente y que no has dicho?' },
  { id: 'P15', phase: 'INVARIANTE TOPOLOGICO', variable: 'ego', text: 'Que parte de esto sientes que no puedes cambiar aunque quieras? Depende de ti o de algo fuera?' },
  { id: 'P16', phase: 'INVARIANTE TOPOLOGICO', variable: 'ego', text: 'Si esto se resolviera por completo, que cambiaria en tu vida? Hay algo que perderias si eso pasa?' },
  { id: 'P17', phase: 'INVARIANTE TOPOLOGICO', variable: 'ego', text: 'Esto es realmente tuyo o lo vienes cargando de alguien mas?' }
]

export function buildMOPHNarrative(responses: Array<{ question_id: string; answer: string }>) {
  return responses
    .map((response) => {
      const question = MOPH_QUESTIONS.find((item) => item.id === response.question_id)
      return `${response.question_id} ${question?.text || ''}\n${response.answer}`
    })
    .join('\n\n')
}

export function deriveMOPHBaseline(responses: Array<{ question_id: string; answer: string }>) {
  const get = (id: string) => responses.find((response) => response.question_id === id)?.answer || ''
  return {
    objective: get('P03') || get('P16') || get('P01'),
    current_friction: get('P01'),
    initial_avoidance: get('P12') || get('P11'),
    declared_action_gap: get('P10'),
    expected_break: get('P09'),
    relational_load: get('P14') || get('P17')
  }
}
