import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'System Friction Institute',
    short_name: 'SFI',
    description: 'Live institutional observability environment for evidence, systems, falsification, governance, agents and governed AI interaction.',
    start_url: '/',
    scope: '/',
    lang: 'en',
    display: 'standalone',
    background_color: '#050504',
    theme_color: '#050504',
    categories: ['education','utilities'],
    shortcuts: [
      { name: 'Observatory', url: '/observatory' },
      { name: 'Publications', url: '/publications' },
      { name: 'Sign In', url: '/login' },
    ],
  };
}
