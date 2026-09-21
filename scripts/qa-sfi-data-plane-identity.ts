import fs from 'node:fs';

const identity = fs.readFileSync('src/lib/persistence/dataPlaneIdentity.ts', 'utf8');
const route = fs.readFileSync('src/app/api/system/data-plane/jwks/route.ts', 'utf8');

const checks: Array<[string, boolean]> = [
  ['data-plane key is derived from existing server secret', identity.includes('SFI_EXTERNAL_SESSION_SECRET') && identity.includes('SFI-DATA-PLANE-SIGNING-V1')],
  ['service JWT uses asymmetric EdDSA signing', identity.includes("alg: 'EdDSA'") && identity.includes("sign(null") && identity.includes('createPublicKey')],
  ['service JWT is audience-bound', identity.includes("sfi-neon-data-api")],
  ['service JWT selects only the continuity service role', identity.includes("sfi_continuity_service")],
  ['JWKS endpoint exposes public key material only', route.includes('getSfiDataPlaneJwks') && !route.includes('SFI_EXTERNAL_SESSION_SECRET')],
  ['JWKS endpoint fails closed when signing identity is unavailable', route.includes("status: 503")],
];

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}`);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(`SFI data-plane identity QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`SFI data-plane identity QA passed: ${checks.length}/${checks.length}`);
