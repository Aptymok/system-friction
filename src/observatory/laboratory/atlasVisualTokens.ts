export const atlasVisualTokens = {
  colors: {
    bg: '#050505',
    surface: '#0c0c0a',
    border: '#1a1a18',
    gold: '#C8A951',
    goldDim: '#7a6530',
    goldFaint: '#1e1808',
    text: '#d8d4c8',
    textDim: '#6a6660',
    red: '#c86e6e',
    green: '#6ec88a',
    amber: '#c8a05a',
    blue: '#6e9ac8',
    purple: '#a070cc',
    teal: '#48aa88',
  },
  fonts: {
    mono: 'JetBrains Mono, monospace',
    serif: 'Cormorant Garamond, Georgia, serif',
    display: 'Syncopate, sans-serif',
  },
  motion: {
    centralPulse: 'atlasPulse 5.8s ease-in-out infinite',
    clusterFade: 'atlasFade 320ms ease',
    edgeOpacity: 0.18,
  },
} as const;
