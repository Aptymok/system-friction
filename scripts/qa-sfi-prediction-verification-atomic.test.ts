import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file: string) => readFileSync(file, 'utf8');

test('closed prediction verification mutation uses atomic RPC instead of two calls', () => {
  const source = read('src/lib/sfi/predictions/verificationService.ts');
  const block = source.slice(source.indexOf('export async function supersedeVerification('));
  assert.match(block, /\.rpc\('sfi_supersede_prediction_verification'/);
  assert.doesNotMatch(block, /createVerificationRule\(input\)/);
  assert.doesNotMatch(block, /\.update\(/);
  assert.match(source, /\.in\('verification_state', \['OPEN', 'DUE', 'OVERDUE', 'DISPUTED'\]\)/);
});

test('migration enforces immutability and restricts supersession RPC to service_role', () => {
  const sql = read('supabase/migrations/20261115013822_sfi_prediction_verification_atomic_integrity.sql');
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.sfi_prediction_verifications/);
  assert.match(sql, /WHERE id=p_previous_id FOR UPDATE/);
  assert.match(sql, /UPDATE public\.sfi_prediction_verifications SET verification_state='SUPERSEDED'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.sfi_supersede_prediction_verification\(uuid,jsonb\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.sfi_supersede_prediction_verification\(uuid,jsonb\)\s+TO service_role/);
});
