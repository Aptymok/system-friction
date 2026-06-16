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
  home: ['root', 'scorefriction-operational', 'instruments', 'contact', 'login', 'surfaces'],
  root: ['api-signals-state', 'scorefriction', 'api-scorefriction-state', 'api-worldspect-vector', 'user'],
  'scorefriction-operational': ['scorefriction', 'api-signals-state', 'api-sfi-operational-state', 'api-sfi-execution-state'],
  scorefriction: ['scorefriction-operational', 'api-scorefriction-state', 'api-signals-state'],
  'api-signals-state': ['root', 'scorefriction', 'api-scorefriction-state'],
  instruments: ['root', 'scorefriction', 'api-signals-state', 'api-worldspect-vector'],
  surfaces: ['api-sfi-surfaces', 'root', 'scorefriction-operational', 'contact'],
  contact: ['home', 'instruments', 'surfaces'],
};

const NOTES: Record<string, string[]> = {
  home: ['Landing institucional, navegación y acceso principal.'],
  login: ['Login normal con server action y next interno seguro.'],
  root: ['Requiere rol root/system o SYSTEM_ROOT_EMAIL.', 'Panel Signals expone SFI-PSI cuando la migración está aplicada.'],
  'scorefriction-operational': ['Campaign Generator usa /api/sfi/media/render determinístico local para no depender de proveedor externo.'],
  'api-signals-state': ['Requiere tablas SFI-PSI y Supabase operativo para persistencia real.'],
  'api-sfi-surfaces': ['Estado estático, no toca base de datos.'],
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
