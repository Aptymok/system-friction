import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicResearchLandingForSlug } from '../src/lib/research/publicResearchLanding';

async function text(path:string){return readFile(path,'utf8');}

async function main(){
  const resolver=await text('src/lib/research/publicResearchLanding.ts');
  const semanticOwner=await text('src/lib/discovery/publicSemanticProjection.ts');
  const researchRoute=await text('src/app/research/[slug]/page.tsx');
  const publicationRoute=await text('src/app/publications/[slug]/page.tsx');
  const repositoryPage=await text('src/app/repository/page.tsx');
  const repositoryUi=await text('src/app/repository/RepositoryConsole.tsx');
  const view=await text('src/components/research/PublicResearchLandingView.tsx');

  assert.match(resolver,/SFI-PUBLIC-RESEARCH-LANDING-1\.0/);
  assert.match(resolver,/researchGraphProjectionForCanonicalObjects/);
  assert.match(resolver,/researchCitationExportForNode/);
  assert.match(resolver,/publicSemanticJsonLdForCanonicalObject/);
  assert.match(resolver,/landingIsProjectionNotCanon: true/);
  assert.match(resolver,/landingDoesNotCreatePublicationState: true/);
  assert.match(resolver,/landingDoesNotCreateEvidence: true/);
  assert.doesNotMatch(resolver,/createServiceSupabaseClient|\.from\(|\.insert\(|\.upsert\(|\.update\(|fetch\(/,'landing resolver must remain a pure projection over canonical state');

  assert.match(semanticOwner,/export type SfiPublicSemanticJsonLdObjectType = SfiPublicSemanticObjectType \| 'PUBLICATION'/);
  assert.match(semanticOwner,/PUBLICATION: 'CreativeWork'/);
  assert.match(semanticOwner,/publicSemanticJsonLdForCanonicalObject/);

  assert.match(researchRoute,/publicResearchLandingForSlug\('RESEARCH', slug\)/);
  assert.match(researchRoute,/if \(!landing\) notFound\(\)/);
  assert.match(researchRoute,/alternates: \{ canonical: landing\.canonicalUrl \}/);
  assert.match(researchRoute,/openGraph:\s*\{/);
  assert.match(researchRoute,/type: 'article'/);
  assert.match(researchRoute,/url: landing\.canonicalUrl/);
  assert.match(researchRoute,/description: landing\.node\.summary/);

  // Publication presentation is absorbed by Repository; legacy canonical URLs remain compatibility aliases.
  assert.match(publicationRoute,/redirect\('\/repository\?object='\+encodeURIComponent\(slug\)\)/);
  assert.doesNotMatch(publicationRoute,/PublicResearchLandingView|TemporalIssueView|openGraph|<main/);
  assert.match(repositoryPage,/SFI_EDITORIAL_PUBLICATIONS/);
  assert.match(repositoryPage,/SFI_CANONICAL_OBJECT_REGISTRY/);
  assert.match(repositoryUi,/READ PUBLICATION/);
  assert.match(repositoryUi,/repoReader/);
  assert.match(repositoryUi,/SHA-256/);

  assert.match(view,/type="application\/ld\+json"/);
  assert.match(view,/dangerouslySetInnerHTML/);
  assert.match(view,/read-only projection of an explicitly public canonical object/);
  assert.match(view,/does not create publication status, evidence, external validation, Discovery, PULL or RETURN/);

  assert.equal(publicResearchLandingForSlug('RESEARCH','not-observed',[]),null);
  assert.equal(publicResearchLandingForSlug('PUBLICATION','not-observed',[]),null);

  console.log(JSON.stringify({
    ok:true,
    contract:'SFI-PUBLIC-RESEARCH-LANDING-QA-1.3',
    researchRoute:'/research/[slug]',
    publicationPresentation:'/repository?object=<slug>',
    legacyPublicationRoute:'REDIRECT_ONLY',
    semanticProjectionOwnerReused:true,
    authorityExpanded:false,
  },null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
