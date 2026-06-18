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
  home: ['root', 'scorefriction', 'instruments', 'contact', 'login', 'surfaces'],
  root: ['api-signals-state', 'scorefriction', 'world-vector', 'api-scorefriction-state', 'api-worldspect-vector', 'user'],
  scorefriction: ['api-scorefriction-cycle', 'api-scorefriction-execution-state', 'api-scorefriction-state', 'api-signals-state'],
  'api-signals-state': ['root', 'scorefriction', 'api-scorefriction-state'],
  instruments: ['root', 'scorefriction', 'world-vector', 'api-signals-state', 'api-worldspect-vector'],
  surfaces: ['api-sfi-surfaces', 'root', 'scorefriction', 'world-vector', 'contact'],
  contact: ['home', 'instruments', 'surfaces'],
};

const NOTES: Record<string, string[]> = {
  home: ['Landing institucional, navegación y acceso principal.'],
  login: ['Login normal con server action y next interno seguro.'],
  root: ['Requiere rol root/system o SYSTEM_ROOT_EMAIL.', 'Panel Signals expone SFI-PSI cuando la migración está aplicada.'],
  scorefriction: ['SFI-LAB queda integrado en /scorefriction y usa rutas /api/scorefriction/... canonicas.'],
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

