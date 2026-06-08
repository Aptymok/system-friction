export const AMV_OUTPUT_MODES = [
  'briefing',
  'field_reading',
  'audit_report',
  'simulation_report',
  'intervention_plan',
  'risk_register',
  'evidence_packet',
  'json_export',
  'dashboard_state',
  'executive_summary',
  'policy_memo',
  'creative_brief',
  'scenario_matrix',
  'early_warning',
  'decision_record',
  'reality_debt_report',
  'attractor_map',
  'ejector_map',
  'phenomenon_card',
] as const

export type AmvOutputMode = (typeof AMV_OUTPUT_MODES)[number]

export type AmvOutputModeDefinition = {
  id: AmvOutputMode
  label: string
  format: string
  purpose: string
  boundary: string
  createsDashboard: false
}

export const AMV_OUTPUT_MODE_DEFINITIONS: Record<AmvOutputMode, AmvOutputModeDefinition> = {
  briefing: {
    id: 'briefing',
    label: 'Briefing',
    format: 'compact_text',
    purpose: 'Preparar lectura corta para decision inmediata.',
    boundary: 'Formato de salida; no superficie nueva.',
    createsDashboard: false,
  },
  field_reading: {
    id: 'field_reading',
    label: 'Field reading',
    format: 'structured_text',
    purpose: 'Leer estado de campo con evidencia, riesgo y ruta.',
    boundary: 'No crea panel de campo.',
    createsDashboard: false,
  },
  audit_report: {
    id: 'audit_report',
    label: 'Audit report',
    format: 'report',
    purpose: 'Documentar linaje, trazabilidad y fallos observados.',
    boundary: 'Auditoria no gobierna experiencia principal.',
    createsDashboard: false,
  },
  simulation_report: {
    id: 'simulation_report',
    label: 'Simulation report',
    format: 'sandbox_report',
    purpose: 'Registrar resultado simulado o proyectado.',
    boundary: 'Permanece sandbox hasta aprobacion.',
    createsDashboard: false,
  },
  intervention_plan: {
    id: 'intervention_plan',
    label: 'Intervention plan',
    format: 'plan',
    purpose: 'Proponer pasos de intervencion revisables.',
    boundary: 'Planifica; no ejecuta.',
    createsDashboard: false,
  },
  risk_register: {
    id: 'risk_register',
    label: 'Risk register',
    format: 'register',
    purpose: 'Listar riesgos, evidencia y controles.',
    boundary: 'No altera controles reales.',
    createsDashboard: false,
  },
  evidence_packet: {
    id: 'evidence_packet',
    label: 'Evidence packet',
    format: 'packet',
    purpose: 'Agrupar evidencia visible y linaje.',
    boundary: 'No fabrica evidencia ausente.',
    createsDashboard: false,
  },
  json_export: {
    id: 'json_export',
    label: 'JSON export',
    format: 'json',
    purpose: 'Emitir contrato serializable.',
    boundary: 'No escribe archivos ni bases por si mismo.',
    createsDashboard: false,
  },
  dashboard_state: {
    id: 'dashboard_state',
    label: 'Dashboard state',
    format: 'state_payload',
    purpose: 'Describir estado renderizable existente.',
    boundary: 'Es formato de estado, no dashboard nuevo.',
    createsDashboard: false,
  },
  executive_summary: {
    id: 'executive_summary',
    label: 'Executive summary',
    format: 'summary',
    purpose: 'Resumir decision, riesgo y siguiente ruta para direccion.',
    boundary: 'No sustituye evidencia.',
    createsDashboard: false,
  },
  policy_memo: {
    id: 'policy_memo',
    label: 'Policy memo',
    format: 'memo',
    purpose: 'Traducir lectura AMV a implicaciones de politica.',
    boundary: 'No declara politica activa.',
    createsDashboard: false,
  },
  creative_brief: {
    id: 'creative_brief',
    label: 'Creative brief',
    format: 'brief',
    purpose: 'Traducir fenomeno a direccion creativa.',
    boundary: 'No convierte creatividad en decision operacional.',
    createsDashboard: false,
  },
  scenario_matrix: {
    id: 'scenario_matrix',
    label: 'Scenario matrix',
    format: 'matrix',
    purpose: 'Comparar escenarios y condiciones.',
    boundary: 'No promueve escenarios sandbox a regimen.',
    createsDashboard: false,
  },
  early_warning: {
    id: 'early_warning',
    label: 'Early warning',
    format: 'warning',
    purpose: 'Emitir alerta temprana con soporte visible.',
    boundary: 'No ejecuta mitigacion.',
    createsDashboard: false,
  },
  decision_record: {
    id: 'decision_record',
    label: 'Decision record',
    format: 'record',
    purpose: 'Registrar decision, razon, evidencia y consecuencia.',
    boundary: 'Registro no equivale a accion ejecutada.',
    createsDashboard: false,
  },
  reality_debt_report: {
    id: 'reality_debt_report',
    label: 'Reality debt report',
    format: 'report',
    purpose: 'Nombrar deuda de realidad visible y condiciones de cierre.',
    boundary: 'No cierra deuda sin evidencia.',
    createsDashboard: false,
  },
  attractor_map: {
    id: 'attractor_map',
    label: 'Attractor map',
    format: 'map',
    purpose: 'Mapear rutas y pesos direccionales.',
    boundary: 'Mapa orienta; no ejecuta.',
    createsDashboard: false,
  },
  ejector_map: {
    id: 'ejector_map',
    label: 'Ejector map',
    format: 'map',
    purpose: 'Mapear bloqueos, contaminacion y hard stops.',
    boundary: 'Puede bloquear cierre; no limpia ni ejecuta.',
    createsDashboard: false,
  },
  phenomenon_card: {
    id: 'phenomenon_card',
    label: 'Phenomenon card',
    format: 'card',
    purpose: 'Describir un fenomeno observado con soporte minimo.',
    boundary: 'No transforma etiqueta en evidencia.',
    createsDashboard: false,
  },
}

export function isAmvOutputMode(value: unknown): value is AmvOutputMode {
  return typeof value === 'string' && AMV_OUTPUT_MODES.includes(value as AmvOutputMode)
}
