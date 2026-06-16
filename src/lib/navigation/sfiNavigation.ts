export type SfiSurfaceStatus =
  | 'active'
  | 'protected'
  | 'experimental'
  | 'api'
  | 'legacy'
  | 'missing';

export type SfiSurfaceArea =
  | 'home'
  | 'auth'
  | 'observatory'
  | 'instrument'
  | 'dashboard'
  | 'api'
  | 'contact'
  | 'user'
  | 'legacy';

export type SfiNavItem = {
  id: string;
  title: string;
  href: string;
  description: string;
  area: SfiSurfaceArea;
  status: SfiSurfaceStatus;
  protected?: boolean;
  public?: boolean;
  instrument?: 'ROOT' | 'MIHM' | 'SCOREFRICTION' | 'SFI-PSI' | 'WSV' | 'AMV';
  priority: number;
};

export const SFI_NAVIGATION: SfiNavItem[] = [
  {
    id: 'home',
    title: 'System Friction Institute',
    href: '/',
    description: 'Landing institucional y navegación principal del ecosistema SFI.',
    area: 'home',
    status: 'active',
    public: true,
    priority: 1,
  },
  {
    id: 'login',
    title: 'Log in',
    href: '/login',
    description: 'Acceso normal a superficies protegidas.',
    area: 'auth',
    status: 'active',
    public: true,
    priority: 2,
  },
  {
    id: 'root',
    title: 'ROOT Observatory',
    href: '/root',
    description: 'Integración operativa de campo, señales, ScoreFriction, MIHM y WorldSpectrumVector.',
    area: 'observatory',
    status: 'protected',
    protected: true,
    instrument: 'ROOT',
    priority: 10,
  },
  {
    id: 'scorefriction-operational',
    title: 'ScoreFriction Operational',
    href: '/scorefriction-operational',
    description: 'Superficie operacional para campañas, evidencia, proto-atractores y cierre institucional.',
    area: 'dashboard',
    status: 'active',
    instrument: 'SCOREFRICTION',
    priority: 11,
  },
  {
    id: 'scorefriction',
    title: 'ScoreFriction',
    href: '/scorefriction',
    description: 'Observatorio longitudinal de fricción cultural y vectores de evidencia.',
    area: 'instrument',
    status: 'active',
    instrument: 'SCOREFRICTION',
    priority: 12,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    href: '/terminal',
    description: 'Terminal cognitiva protegida para operación del campo.',
    area: 'dashboard',
    status: 'protected',
    protected: true,
    priority: 20,
  },
  {
    id: 'user',
    title: 'User Space',
    href: '/user',
    description: 'Espacio de usuario autenticado cuando no hay rol ROOT.',
    area: 'user',
    status: 'protected',
    protected: true,
    priority: 21,
  },
  {
    id: 'cluster-atlas',
    title: 'Cluster Atlas',
    href: '/cluster-atlas',
    description: 'Superficie pública de lectura atlas y memoria de campo.',
    area: 'observatory',
    status: 'active',
    public: true,
    priority: 30,
  },
  {
    id: 'observatories',
    title: 'Observatories',
    href: '/observatories',
    description: 'Índice público de observatorios del ecosistema.',
    area: 'observatory',
    status: 'active',
    public: true,
    priority: 31,
  },
  {
    id: 'repository',
    title: 'Repository',
    href: '/repository',
    description: 'Repositorio institucional de evidencia, materiales y referencias públicas.',
    area: 'observatory',
    status: 'active',
    public: true,
    priority: 32,
  },
  {
    id: 'moph',
    title: 'MOP-H',
    href: '/moph',
    description: 'Instrumento fenomenológico humano de registro local.',
    area: 'instrument',
    status: 'active',
    public: true,
    priority: 33,
  },
  {
    id: 'instruments',
    title: 'Instruments',
    href: '/instruments',
    description: 'Mapa conceptual de instrumentos SFI: MIHM, ScoreFriction, PSI, WSV y ROOT.',
    area: 'instrument',
    status: 'active',
    public: true,
    priority: 40,
  },
  {
    id: 'surfaces',
    title: 'Surfaces',
    href: '/surfaces',
    description: 'Mapa transversal de superficies, conexiones y estados institucionales.',
    area: 'dashboard',
    status: 'active',
    public: true,
    priority: 41,
  },
  {
    id: 'contact',
    title: 'Contact',
    href: '/contact',
    description: 'Contacto institucional para colaboración, análisis e integración.',
    area: 'contact',
    status: 'active',
    public: true,
    priority: 50,
  },
  {
    id: 'api-signals-state',
    title: 'SFI-PSI State API',
    href: '/api/signals/state',
    description: 'Estado longitudinal de señales persistentes transmodales.',
    area: 'api',
    status: 'api',
    public: false,
    instrument: 'SFI-PSI',
    priority: 100,
  },
  {
    id: 'api-scorefriction-state',
    title: 'ScoreFriction State API',
    href: '/api/scorefriction/state',
    description: 'Estado operacional de ScoreFriction.',
    area: 'api',
    status: 'api',
    public: false,
    instrument: 'SCOREFRICTION',
    priority: 101,
  },
  {
    id: 'api-sfi-operational-state',
    title: 'SFI Operational State API',
    href: '/api/sfi/operational-state',
    description: 'Estado operacional transversal de SFI.',
    area: 'api',
    status: 'api',
    public: false,
    priority: 102,
  },
  {
    id: 'api-sfi-execution-state',
    title: 'SFI Execution State API',
    href: '/api/sfi/execution-state',
    description: 'Estado de ejecución, ledger y aprendizaje operacional.',
    area: 'api',
    status: 'api',
    public: false,
    priority: 103,
  },
  {
    id: 'api-root-me',
    title: 'ROOT Identity API',
    href: '/api/root/me',
    description: 'Lectura de identidad y autorización ROOT.',
    area: 'api',
    status: 'api',
    public: false,
    instrument: 'ROOT',
    priority: 104,
  },
  {
    id: 'api-sfi-surfaces',
    title: 'SFI Surfaces API',
    href: '/api/sfi/surfaces',
    description: 'Mapa estático de conexiones entre superficies institucionales.',
    area: 'api',
    status: 'api',
    public: false,
    priority: 105,
  },
  {
    id: 'api-worldspect-vector',
    title: 'WorldSpectrumVector API',
    href: '/api/worldspect/vector',
    description: 'Vector externo de presión y contexto.',
    area: 'api',
    status: 'api',
    public: false,
    instrument: 'WSV',
    priority: 106,
  },
];

export function navByArea(area: SfiSurfaceArea) {
  return SFI_NAVIGATION.filter((item) => item.area === area).sort((a, b) => a.priority - b.priority);
}

export function navByIds(ids: string[]) {
  const lookup = new Map(SFI_NAVIGATION.map((item) => [item.id, item]));
  return ids.map((id) => lookup.get(id)).filter((item): item is SfiNavItem => Boolean(item));
}
