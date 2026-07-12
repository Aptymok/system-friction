import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'System Friction Institute',
    short_name: 'SFI',
    description:
      'Structural field observation through MIHM, MOP-H, WorldSpect, World Vector, AMV and a longitudinal evidence Atlas.',
    start_url: '/',
    scope: '/',
    lang: 'es-MX',
    display: 'standalone',
    orientation: 'any',
    background_color: '#030302',
    theme_color: '#030302',
    categories: ['education', 'productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Observatory',
        short_name: 'Observatory',
        description: 'Open the public world-state reading.',
        url: '/observatory',
      },
      {
        name: 'World Vector',
        short_name: 'World Vector',
        description: 'Open the current world vector.',
        url: '/world-vector',
      },
      {
        name: 'FIELD',
        short_name: 'FIELD',
        description: 'Open the MOP-H participant flow.',
        url: '/field',
      },
      {
        name: 'Repository',
        short_name: 'Repository',
        description: 'Open the documentary repository.',
        url: '/repository',
      },
    ],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
