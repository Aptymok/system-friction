import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SFI_CANONICAL_NAMESPACE_CONTRACT,
  SFI_CANONICAL_OBJECT_REGISTRY,
  canonicalNamespaceFor,
  canonicalUrlFor,
} from '../src/lib/discovery/canonicalObjectRegistry';
import { SFI_PUBLICATION_MESH } from '../src/lib/discovery/institutionalDiscoveryMesh';

async function main() {
  assert.equal(SFI_CANONICAL_NAMESPACE_CONTRACT, 'SFI-CANONICAL-NAMESPACE-1.0');

  assert.equal(canonicalNamespaceFor('PUBLICATION'), '/publications');
  assert.equal(canonicalNamespaceFor('REPORT'), '/research');
  assert.equal(canonicalNamespaceFor('PAPER'), '/research');

  assert.equal(
    canonicalUrlFor('PUBLICATION', 'namespace-fixture'),
    'https://systemfriction.org/publications/namespace-fixture',
  );
  assert.equal(
    canonicalUrlFor('REPORT', 'namespace-fixture'),
    'https://systemfriction.org/research/namespace-fixture',
  );
  assert.equal(
    canonicalUrlFor('PAPER', 'namespace-fixture'),
    'https://systemfriction.org/research/namespace-fixture',
  );

  const publicationUrls = SFI_CANONICAL_OBJECT_REGISTRY
    .filter((record) => record.objectType === 'PUBLICATION')
    .map((record) => record.canonicalUrl);

  assert.equal(
    publicationUrls.some((url) => url.includes('/research/')),
    false,
    'PUBLICATION objects may not retain the REPORT/PAPER research namespace',
  );
  assert.equal(
    publicationUrls.every((url) => url.includes('/publications/')),
    true,
    'Every registered PUBLICATION must resolve through the canonical publication namespace owner',
  );

  assert.equal(SFI_PUBLICATION_MESH.state, 'CANONICAL_NAMESPACE_ACTIVE');
  assert.equal(SFI_PUBLICATION_MESH.namespaceContract, SFI_CANONICAL_NAMESPACE_CONTRACT);
  assert.equal(SFI_PUBLICATION_MESH.canonicalObjectType, 'PUBLICATION');
  assert.equal(SFI_PUBLICATION_MESH.canonicalNamespace, canonicalNamespaceFor('PUBLICATION'));
  assert.equal(
    SFI_PUBLICATION_MESH.legacyRedirectPolicy,
    'NO_SYNTHETIC_REDIRECT_WITHOUT_OBSERVED_LEGACY_CANONICAL_OBJECT',
  );

  const contractLock = await readFile('docs/program/SFI-CONTRACT-LOCK.md', 'utf8');
  assert.ok(contractLock.includes('Canonical namespace contract: `SFI-CANONICAL-NAMESPACE-1.0`'));
  assert.ok(contractLock.includes('/research/[slug]        REPORT, PAPER'));
  assert.ok(contractLock.includes('/publications/[slug]    PUBLICATION'));
  assert.ok(contractLock.includes('No compatibility redirect is created unless an observed pre-existing canonical `PUBLICATION` URL requires one.'));

  const nextConfig = await readFile('next.config.js', 'utf8');
  assert.equal(/async\s+redirects\s*\(\)/.test(nextConfig), false, 'namespace activation must not fabricate a runtime redirect');

  console.log(JSON.stringify({
    ok: true,
    contract: SFI_CANONICAL_NAMESPACE_CONTRACT,
    publicationNamespace: canonicalNamespaceFor('PUBLICATION'),
    researchNamespace: canonicalNamespaceFor('REPORT'),
    publicationObjectsChecked: publicationUrls.length,
    legacyPublicationRedirectRequired: false,
    authorityExpanded: false,
    epistemicStateChanged: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
