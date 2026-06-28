export type SfiSurfaceStatus = 'active' | 'protected' | 'api' | 'internal' | 'missing';

export type SfiSurfaceArea = 'home' | 'auth' | 'product' | 'root' | 'studio' | 'repository' | 'contact' | 'api';

export type SfiNavItem = {
  id: string;
  title: string;
  href: string;
  description: string;
  area: SfiSurfaceArea;
  status: SfiSurfaceStatus;
  protected?: boolean;
  public?: boolean;
  priority: number;
};

export const SFI_NAVIGATION: SfiNavItem[] = [
  { id: 'home', title: 'System Friction Institute', href: '/', description: 'Public landing and invitation to enter.', area: 'home', status: 'active', public: true, priority: 1 },
  { id: 'login', title: 'Login', href: '/login', description: 'Sign in.', area: 'auth', status: 'active', public: true, priority: 2 },
  { id: 'signup', title: 'Signup', href: '/signup', description: 'Create account.', area: 'auth', status: 'active', public: true, priority: 3 },
  { id: 'field', title: 'Field', href: '/field', description: 'Authenticated user operational field.', area: 'product', status: 'protected', protected: true, priority: 10 },
  { id: 'root', title: 'ROOT', href: '/root', description: 'Private founder/root console.', area: 'root', status: 'protected', protected: true, priority: 11 },
  { id: 'studio', title: 'Studio', href: '/studio', description: 'Private Edwing / REM618 producer field.', area: 'studio', status: 'protected', protected: true, priority: 12 },
  { id: 'repository', title: 'Repository', href: '/repository', description: 'Public documentation and approved evidence repository.', area: 'repository', status: 'active', public: true, priority: 20 },
  { id: 'contact', title: 'Contact', href: '/contact', description: 'Contact form and external links.', area: 'contact', status: 'active', public: true, priority: 30 },
  { id: 'privacy', title: 'Privacy', href: '/privacy', description: 'Privacy policy.', area: 'contact', status: 'active', public: true, priority: 31 },
  { id: 'api-field-persist', title: 'Field persistence API', href: '/api/field/persist', description: 'Existing authenticated event persistence where owned-node context exists.', area: 'api', status: 'api', public: false, priority: 100 },
  { id: 'api-root-founder-state', title: 'ROOT SFI state API', href: '/api/root/founder-state', description: 'ROOT-gated SFI-01 read model and action capabilities.', area: 'api', status: 'api', public: false, priority: 101 },
];

export function navByArea(area: SfiSurfaceArea) {
  return SFI_NAVIGATION.filter((item) => item.area === area).sort((a, b) => a.priority - b.priority);
}

export function navByIds(ids: string[]) {
  const lookup = new Map(SFI_NAVIGATION.map((item) => [item.id, item]));
  return ids.map((id) => lookup.get(id)).filter((item): item is SfiNavItem => Boolean(item));
}
