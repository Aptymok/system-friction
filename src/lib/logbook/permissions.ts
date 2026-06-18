export type LogbookScope =
  | 'world'
  | 'root'
  | 'scorefriction'
  | 'amv'
  | 'twin'
  | 'user'
  | 'system'
  | 'self_observability'
  | 'reconstruction';

export type LogbookVisibility = 'private' | 'operator' | 'root' | 'system';

export type LogbookEntry = {
  id: string;
  scope: LogbookScope;
  visibility: LogbookVisibility;
  owner_user_id?: string | null;
  case_id?: string | null;
  event_type: string;
  title: string;
  summary: string;
  evidence_ref?: string | null;
  payload: unknown;
  created_at: string;
};

export type LogbookViewer = {
  user_id?: string | null;
  role?: 'user' | 'operator' | 'root' | 'system';
  email?: string | null;
};

export function isSystemRoot(viewer: LogbookViewer) {
  const rootEmail = process.env.SYSTEM_ROOT_EMAIL?.toLowerCase();
  const email = viewer.email?.toLowerCase();
  return viewer.role === 'system' || (rootEmail && email === rootEmail) || email === 'aptymok';
}

export function canViewLogbookEntry(entry: LogbookEntry, viewer: LogbookViewer) {
  if (isSystemRoot(viewer)) return true;
  if (entry.visibility === 'system') return false;
  if (viewer.role === 'root') return entry.visibility === 'root' || entry.visibility === 'operator' || entry.owner_user_id === viewer.user_id;
  if (viewer.role === 'operator') return entry.visibility === 'operator' || entry.owner_user_id === viewer.user_id;
  return entry.visibility === 'private' && entry.owner_user_id === viewer.user_id;
}

