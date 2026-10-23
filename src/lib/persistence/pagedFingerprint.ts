/**
 * Fail-closed, bounded transport for the *existing* semantic table fingerprints.
 * Does not replace row-level verification, omit tables, or authorize data writes.
 * The SQL RPC must preserve sfi_data_plane_fingerprint_v2's exact per-table rules.
 */
export type FingerprintRow = {
  table_name: string;
  row_count: number | string;
  hash_a: number | string;
  hash_b: number | string;
};

export type FingerprintPageReader = (
  afterTable: string,
  limit: number,
) => Promise<FingerprintRow[]>;

export type FingerprintParityOptions = {
  pageSize?: number;
  maxPages?: number;
  verifyProtectedTable?: (name: 'profiles' | 'sfi_account_access_grants' | 'sfi_tenant_members') => Promise<boolean>;
};

const PROTECTED = new Set(['profiles', 'sfi_account_access_grants', 'sfi_tenant_members']);

function fingerprintKey(row: FingerprintRow) {
  return `${row.table_name}|${row.row_count}|${row.hash_a}|${row.hash_b}`;
}

/**
 * Compare the same ordered table set from both independent data planes.
 * Never certify merely because a page is empty on one plane.
 * An RPC error always propagates; the caller must not certify on failure.
 */
export async function comparePagedFingerprints(
  primary: FingerprintPageReader,
  continuity: FingerprintPageReader,
  options: FingerprintParityOptions = {},
) {
  const pageSize = options.pageSize ?? 8;
  const maxPages = options.maxPages ?? 256;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 8
    || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 256) {
    throw new Error('SFI_FINGERPRINT_INVALID_PAGE_BOUNDS');
  }

  let after = '';
  let seen = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const [primaryRows, continuityRows] = await Promise.all([
      primary(after, pageSize),
      continuity(after, pageSize),
    ]);
    if (!Array.isArray(primaryRows) || !Array.isArray(continuityRows)
      || primaryRows.length !== continuityRows.length
      || primaryRows.length > pageSize) return false;
    if (primaryRows.length === 0) return seen > 0;

    let lastName = after;
    for (let i = 0; i < primaryRows.length; i += 1) {
      const row = primaryRows[i];
      const counterpart = continuityRows[i];
      if (!row || !counterpart
        || typeof row.table_name !== 'string'
        || typeof counterpart.table_name !== 'string'
        || !row.table_name
        || row.table_name <= lastName
        || counterpart.table_name !== row.table_name) return false;

      if (fingerprintKey(row) !== fingerprintKey(counterpart)) {
        if (!PROTECTED.has(row.table_name)
          || String(row.row_count) !== String(counterpart.row_count)
          || !options.verifyProtectedTable
          || !await options.verifyProtectedTable(
            row.table_name as 'profiles' | 'sfi_account_access_grants' | 'sfi_tenant_members',
          )) return false;
      }
      lastName = row.table_name;
      seen += 1;
    }
    after = lastName;
  }
  throw new Error('SFI_FINGERPRINT_PAGINATION_CAP_EXCEEDED');
}
