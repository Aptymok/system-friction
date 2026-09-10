import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicResearchLandingForSlug } from '../src/lib/research/publicResearchLanding';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const resolver = await text('src/lib/research/publicResearchLanding.ts');
  const semanticOwner = await text('src/lib/discovery/publicSemanticProjection.ts');
  const researchRoute = await text('src/app/research/[slug]/page.tsx');
  const publicationRoute = await text('src/app/publications/[slug]/page.tsx');
  const view = await text('src/components/research/PublicResearchLandingView.tsx');

  assert.match(resolver, /SFI-PUBLIC-RESEARCH-LANDING-1\.0/);
  assert.match(resolver, /researchGraphProjectionForCanonicalObjects/);
  assert.match(resolver, /researchCitationExportForNode/);
  assert.match(resolver, /publicSemanticJsonLdForCanonicalObject/);
  assert.match(resolver, /jsonLd\['@id'\] !== node\.canonicalUrl/);
  assert.match(resolver, /semanticIdentityReusesDiscoveryOwner: true/);
  assert.match(resolver, /canonicalNamespaceFor/);
  assert.match(resolver, /canonicalUrlFor/);
  assert.match(resolver, /landingIsProjectionNotCanon: true/);
  assert.match(resolver, /landingDoesNotCreatePublicationState: true/);
  assert.match(resolver, /landingDoesNotCreateEvidence: true/);
  assert.doesNotMatch(resolver, /createServiceSupabaseClient|\.from\(|\.insert\(|\.upsert\(|\.update\(|fetch\(/, 'landing resolver must remain a pure projection over canonical state');

  assert.match(semanticOwner, /export type SfiPublicSemanticJsonLdObjectType = SfiPublicSemanticObjectType \| 'PUBLICATION'/);
  assert.match(semanticOwner, /PUBLICATION: 'CreativeWork'/);
  assert.match(semanticOwner, /isPublicSemanticJsonLdObjectType/);
  assert.match(semanticOwner, /publicSemanticJsonLdForCanonicalObject/);

  assert.match(researchRoute, /publicResearchLandingForSlug\('RESEARCH', slug\)/);
  assert.match(publicationRoute, /publicResearchLandingForSlug\('PUBLICATION', slug\)/);
  assert.match(researchRoute, /if \(!landing\) notFound\(\)/);
  assert.match(publicationRoute, /if \(!landing\) notFound\(\)/);
  assert.match(researchRoute, /alternates: \{ canonical: landing\.canonicalUrl \}/);
  assert.match(publicationRoute, /alternates: \{ canonical: landing\.canonicalUrl \}/);
  assert.doesNotMatch(`${researchRoute}\n${publicationRoute}`, /redirect\(|createServiceSupabaseClient|fetch\(/, 'public landing routes may not invent compatibility redirects or bypass the canonical projection');

  assert.match(view, /type="application\/ld\+json"/);
  assert.match(view, /JSON\.stringify\(landing\.jsonLd\)\.replace\(\/<\/g, '\\\\u003c'\)/);
  assert.match(view, /dangerouslySetInnerHTML=\{\{ __html: safeJsonLd\(landing\) \}\}/);
  assert.match(view, /read-only projection of an explicitly public canonical object/);
  assert.match(view, /does not create publication status, evidence, external validation, Discovery, PULL or RETURN/);

  assert.equal(publicResearchLandingForSlug('RESEARCH', 'not-observed', []), null);
  assert.equal(publicResearchLandingForSlug('PUBLICATION', 'not-observed', []), null);

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-PUBLIC-RESEARCH-LANDING-QA-1.1',
    singleResearchProjectionOwnerReused: true,
    semanticJsonLdOwnerReused: true,
    publicationJsonLdSchemaType: 'CreativeWork',
    researchRoute: '/research/[slug]',
    publicationRoute: '/publications/[slug]',
    missingCanonicalObjectReturns404: true,
    safeJsonLdSerialization: true,
    directDatabaseReads: 0,
    externalActions: 0,
    syntheticRedirects: 0,
    authorityExpanded: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
