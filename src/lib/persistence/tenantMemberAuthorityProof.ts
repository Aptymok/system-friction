/**
 * MEM-003 — Pure, fail-closed proof for an obsolete tenant-membership journal
 * image. Metadata drift is limited to created_at / updated_at. These records
 * control tenant authority; any identity, role or status change is material.
 * No writer or permission change is performed here.
 */
type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(['OWNER','ADMIN','OPERATOR','OBSERVER','VIEWER']);
const ALLOWED_STATUSES = new Set(['ACTIVE','INVITED','PENDING','SUSPENDED','REVOKED','INACTIVE']);

function isRecord(value: unknown): value is Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function stable(value: Row): string {
  return JSON.stringify(Object.keys(value)
    .filter(key => key !== 'created_at' && key !== 'updated_at')
    .sort()
    .reduce<Row>((acc,key) => { acc[key] = value[key]; return acc; }, {}));
}
/**
 * A historical UPSERT is supersedable ONLY if its before and after images
 * and both independently fetched current rows preserve all authority fields.
 * Equal row counts or matching role distributions alone are insufficient.
 */
export function tenantMemberHistoricalParity(
  primary: unknown, continuity: unknown, before: unknown, after: unknown,
): boolean {
  if (![primary,continuity,before,after].every(isRecord)) return false;
  const rows = [primary,continuity,before,after] as Row[];
  const id = rows[0].tenant_id;
  const user = rows[0].user_id;
  if (typeof id !== 'string' || !UUID.test(id) || typeof user !== 'string' || !UUID.test(user)) return false;
  if (typeof rows[0].role !== 'string' || !ALLOWED_ROLES.has(rows[0].role) ||
      typeof rows[0].status !== 'string' || !ALLOWED_STATUSES.has(rows[0].status)) return false;
  return rows.every(row => row.tenant_id === id && row.user_id === user &&
    row.role === rows[0].role && row.status === rows[0].status &&
    stable(row) === stable(rows[0]));
}
