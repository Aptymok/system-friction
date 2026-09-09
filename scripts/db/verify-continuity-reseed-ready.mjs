import { verifyContinuityReseedReady } from './continuity-reseed-gate.mjs';

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.CONNECTION_STRING;
const mode = String(process.argv[2] || '').toLowerCase();
if (!databaseUrl) throw new Error('SFI_CONTINUITY_RESEED_DATABASE_REQUIRED');
if (!['pre', 'post'].includes(mode)) throw new Error('Usage: verify-continuity-reseed-ready.mjs <pre|post>');

const result = verifyContinuityReseedReady(databaseUrl, mode);
console.log(JSON.stringify(result));
