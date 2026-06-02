export type ScoreFrictionRole =
  | 'root'
  | 'founder'
  | 'producer'
  | 'observer'
  | 'guest';

export function canAccessScoreFriction(role: ScoreFrictionRole, action: string) {
  const permissions: Record<ScoreFrictionRole, string[]> = {
    root: ['*'],
    founder: ['read', 'observe', 'evaluate', 'propose', 'verify', 'admin'],
    producer: ['read', 'observe', 'propose', 'upload'],
    observer: ['read', 'observe'],
    guest: ['read_public'],
  };

  return permissions[role]?.includes('*') || permissions[role]?.includes(action);
}

// TODO: Wire this helper to the existing Supabase profile role once ScoreFriction
// access policy is activated. Current phase keeps public read/evaluate open.
