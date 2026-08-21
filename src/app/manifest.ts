import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'System Friction Institute',
    short_name: 'SFI',
    description: 'Live institutional observability environment for evidence, systems, falsification, governance, agents and governed AI interaction.',
    start_url: '/field',
    scope: '/',
    lang: 'es-MX',
    display: 'standalone',
    background_color: '#050504',
    theme_color: '#050504',
    categories: ['education','utilities'],
    shortcuts: [
      { name: 'Field', url: '/field' },
      { name: 'Falsification', url: '/falsification' },
      { name: 'Governance', url: '/governance' },
      { name: 'Archive', url: '/archive' },
      { name: 'Agents', url: '/agents' },
      { name: 'ROOT', url: '/root' },
    ],
  };
}
