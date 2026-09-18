import { SFI_NAVIGATION, type SfiSurfaceStatus } from './sfiNavigation';

export type SfiSurfaceHealth = {
  id: string;
  title: string;
  href: string;
  status: SfiSurfaceStatus;
  protected?: boolean;
  connectedTo: string[];
  notes: string[];
};

const CONNECTIONS: Record<string, string[]> = {
  home: ['root', 'contact', 'login'],
  root: ['home'],
  interface: ['field', 'personal-lab'],
  field: ['interface', 'personal-lab'],
  'personal-lab': ['field', 'root'],
  studio: ['root'],
  repository: ['home'],
  contact: ['home'],
};

const NOTES: Record<string, string[]> = {
  home: ['Landing institucional, navegación y acceso principal.'],
  login: ['Login normal con server action y next interno seguro.'],
  root: ['Requiere rol root/system o SYSTEM_ROOT_EMAIL.'],
  field: ['Campo autenticado para trabajo aplicado y retorno.'],
  'personal-lab': ['Laboratorio autenticado; no es una superficie pública paralela.'],
};

export function buildSfiSurfaceState(): SfiSurfaceHealth[] {
  const titles = new Map(SFI_NAVIGATION.map((item) => [item.id, item.title]));

  return SFI_NAVIGATION
    .sort((a, b) => a.priority - b.priority)
    .map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      status: item.status,
      protected: item.protected,
      connectedTo: (CONNECTIONS[item.id] ?? []).map((id) => titles.get(id) ?? id),
      notes: NOTES[item.id] ?? [],
    }));
}

