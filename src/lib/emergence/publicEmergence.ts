export type PublicEmergenceMetricState = 'UNMEASURED' | 'BASELINE_CAPTURED' | 'OBSERVED' | 'DEGRADED';

export type PublicEmergenceMetric = {
  key: string;
  label: string;
  state: PublicEmergenceMetricState;
  value: number | null;
  unit: 'count' | 'ratio' | 'seconds';
  source: string;
  interpretation: string;
};

export const SFI_PUBLIC_EMERGENCE = {
  id: 'SFI-EMG-0001',
  title: 'SFI / PUBLIC EMERGENCE',
  state: 'BASELINE_OPEN',
  object: {
    id: 'SFI-OBJ-0001',
    type: 'institution',
    label: 'System Friction Institute',
  },
  question:
    'Can a research institution generate measurable external emergence through governed public perturbations while preserving the distinction between publication, observation and evidence?',
  window: {
    openedOn: '2026-08-16',
    closesOn: '2026-09-16',
    timezone: 'America/Mexico_City',
  },
  epistemicBoundary: [
    'PUBLICATION ≠ EVIDENCE',
    'ATTENTION ≠ VALIDATION',
    'ENGAGEMENT ≠ CAUSALITY',
    'MODEL OUTPUT ≠ OBSERVATION',
    'ROOT APPROVAL ≠ TRUTH',
  ],
  protocol: [
    {
      key: 'BASELINE',
      purpose: 'Capture the pre-perturbation state before interpreting external movement.',
    },
    {
      key: 'PERTURBATION',
      purpose: 'Publish one governed external signal with a stable trace identifier and campaign lineage.',
    },
    {
      key: 'SIGNAL',
      purpose: 'Collect attributable, non-PII public response and site interaction signals.',
    },
    {
      key: 'ASSESSMENT',
      purpose: 'Separate observed response from inferred meaning and alternative explanations.',
    },
    {
      key: 'RETURN',
      purpose: 'Wait for the declared window and compare the later state with the pre-registered expectation.',
    },
    {
      key: 'AUDIT',
      purpose: 'Publish what moved, what did not, what was misread and what remains indeterminate.',
    },
  ],
  initialTrace: {
    id: 'SFI-PUB-SIG-0001',
    epistemicClass: 'declared',
    status: 'READY_FOR_EXTERNAL_PUBLICATION',
    title: 'Public observation layer active',
    statement:
      'System Friction Institute has opened a governed public-emergence observation window. External response will be measured before interpretation.',
  },
  metrics: [
    {
      key: 'qualified_visits',
      label: 'Qualified visits',
      state: 'UNMEASURED',
      value: null,
      unit: 'count',
      source: 'GA4 + allowlisted campaign attribution',
      interpretation: 'Visits reaching an SFI operational or research surface after campaign acquisition.',
    },
    {
      key: 'return_visit_rate',
      label: 'Return visit rate',
      state: 'UNMEASURED',
      value: null,
      unit: 'ratio',
      source: 'GA4 aggregate analytics',
      interpretation: 'Whether the external observer returns after the initial signal.',
    },
    {
      key: 'deep_interactions',
      label: 'Deep interactions',
      state: 'UNMEASURED',
      value: null,
      unit: 'count',
      source: 'SFI navigation and instrument events',
      interpretation: 'Observed transitions into Observatory, FIELD, Library, MIHM or other substantive surfaces.',
    },
    {
      key: 'field_intake_starts',
      label: 'FIELD intake starts',
      state: 'UNMEASURED',
      value: null,
      unit: 'count',
      source: 'field_flow_start / FIELD runtime',
      interpretation: 'External systems entering the governed FIELD intake rather than stopping at passive attention.',
    },
    {
      key: 'institutional_contact_intents',
      label: 'Institutional contact intents',
      state: 'UNMEASURED',
      value: null,
      unit: 'count',
      source: 'contact_intent aggregate event',
      interpretation: 'Non-PII count of explicit collaboration, research or commercial contact intent.',
    },
  ] satisfies PublicEmergenceMetric[],
  campaign: {
    key: 'sfi_public_emergence_001',
    allowedUtmSources: ['linkedin', 'instagram', 'youtube', 'medium', 'x', 'direct'],
    allowedUtmMediums: ['organic_social', 'article', 'video', 'owned'],
    contentPrefix: 'sfi_pub_',
  },
} as const;
