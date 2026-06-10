export const SFI_COLORS = {
  void: '#060605',
  dark: '#0a0a09',
  surface: '#0d0d0c',
  gold: '#c8a951',
  red: '#b85050',
  green: '#3a8a5a',
  blue: '#718ca6',
  cream: '#e8ddc3',
  text: '#c8c4b8',
  muted: '#8a8678',
  faint: '#4a4a45',
} as const;

export const SFI_FONTS = {
  mono: 'JetBrains Mono',
  serif: 'Cormorant Garamond',
  display: 'Syncopate',
} as const;

export const SFI_STATE_GRAMMAR = {
  HOMEOSTATICO: {
    color: SFI_COLORS.green,
    shape: 'stable-orbit',
    motion: 'slow-pulse',
    line: 'continuous',
  },
  CRITICO: {
    color: SFI_COLORS.gold,
    shape: 'oscillating-field',
    motion: 'viscous-drift',
    line: 'dashed',
  },
  ENTROPICO: {
    color: SFI_COLORS.red,
    shape: 'fractured-field',
    motion: 'erratic-pulse',
    line: 'broken',
  },
  DEGRADED: {
    color: SFI_COLORS.faint,
    shape: 'faded-node',
    motion: 'decay',
    line: 'thin',
  },
} as const;

export const SFI_CANONICAL_LABELS = {
  institution: 'SYSTEM FRICTION INSTITUTE',
  observation: 'OBSERVACION',
  friction: 'FRICCION',
  memory: 'MEMORIA',
  continuity: 'CONTINUIDAD',
  live: 'CAMPO VIVO',
  ledger: 'LEDGER',
  evidence: 'EVIDENCIA',
  attractor: 'ATRACTOR',
  ejector: 'EYECTOR',
  world: 'WORLDSPECTRUMVECTOR',
  mihm: 'MIHM',
  amv: 'AMV',
  moph: 'MOP-H',
} as const;
