import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EntityLink } from "../src/components/entity/EntityLink";
import { buildEntityHref, isNavigableEntityId, resolveKnownEntityType } from "../src/lib/entity/entityNavigation";

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function walkFiles(directory: string): string[] {
  const absolute = path.join(process.cwd(), directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(absolute, entry.name);
    const relative = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) return walkFiles(relative);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [relative] : [];
  });
}

function renderLink(entityId: string | null, entityType: string | null) {
  return renderToStaticMarkup(createElement(EntityLink, { entityId, entityType, label: entityId ?? undefined }));
}

function assertHref(entityId: string, entityType: string) {
  const href = buildEntityHref(entityId, entityType);
  assert.equal(href, `/entity/${encodeURIComponent(entityId)}?entityType=${entityType}`);
  const html = renderLink(entityId, entityType);
  assert.ok(html.includes(`href="/entity/${entityId}?entityType=${entityType}"`), `${entityType} href should render`);
  assert.equal(html.includes("[object Object]"), false);
}

function assertNoDirectSupabase() {
  const offenders = [
    "src/components/entity/EntityLink.tsx",
    "src/lib/entity/entityNavigation.ts",
  ].filter((file) => /supabase|createServiceSupabaseClient|\.from\(/i.test(read(file)));
  assert.deepEqual(offenders, [], "EntityLink and entityNavigation must not access Supabase");
}

function assertNoPublicSurfaceEntityLinks() {
  const publicSurfaceFiles = [
    ...walkFiles("src/app/observatory"),
    ...walkFiles("src/app/world-vector"),
    ...walkFiles("src/app/mihm"),
    ...walkFiles("src/app/atlas"),
    ...walkFiles("src/app/friction"),
    ...walkFiles("src/components/observatory"),
    ...walkFiles("src/components/worldspect"),
  ];
  const offenders = publicSurfaceFiles.filter((file) => {
    const source = read(file);
    return source.includes("@/components/entity/EntityLink") || source.includes("/entity/");
  });
  assert.deepEqual(offenders, [], "public surfaces must not receive Entity Graph navigation in this phase");
}

function assertNoClientRequirement() {
  const source = read("src/components/entity/EntityLink.tsx");
  assert.equal(source.includes("\"use client\"") || source.includes("'use client'"), false, "EntityLink must not require client rendering");
}

function assertSurfaceIntegration() {
  const expected = {
    "src/components/root/PhenomenonConsole.tsx": ["entityType=\"PHENOMENON\"", "entityType=\"EVIDENCE\""],
    "src/components/root/predictions/PredictionRegistryPanel.tsx": ["entityType=\"PREDICTION\""],
    "src/components/root/predictions/PredictionDetailPanel.tsx": ["entityType=\"PREDICTION\""],
    "src/components/root/sovereign/views/RootCognitiveRuntimeView.tsx": ["entityType=\"AGENT\"", "entityType=\"EVENT\""],
    "src/components/studio/production/StudioProductionShell.tsx": ["entityType=\"EVIDENCE\"", "state.evidence"],
  };
  for (const [file, patterns] of Object.entries(expected)) {
    const source = read(file);
    assert.ok(source.includes("@/components/entity/EntityLink"), `${file} must import EntityLink`);
    for (const pattern of patterns) assert.ok(source.includes(pattern), `${file} must include ${pattern}`);
  }
}

function main() {
  assertHref("phenomenon-1", "PHENOMENON");
  assertHref("evidence-1", "EVIDENCE");
  assertHref("prediction-1", "PREDICTION");
  assertHref("agent-1", "AGENT");
  assertHref("event-1", "EVENT");

  assert.equal(buildEntityHref("", "PHENOMENON"), null);
  assert.equal(buildEntityHref("MISSING", "EVIDENCE"), null);
  assert.equal(buildEntityHref("abc", "NOT_A_TYPE"), null);
  assert.equal(renderLink("", "PHENOMENON").includes("href="), false);
  assert.equal(renderLink("abc", "NOT_A_TYPE").includes("href="), false);

  assert.equal(resolveKnownEntityType({ field: "correlationId" }), null);
  assert.equal(resolveKnownEntityType({ field: "hypothesisId" }), null);
  assert.equal(resolveKnownEntityType({ field: "hypothesisId", predictionRegistered: true }), "PREDICTION");
  assert.equal(isNavigableEntityId("storage/path/file.wav"), false);
  assert.equal(isNavigableEntityId("d41d8cd98f00b204e9800998ecf8427e"), false);

  assertNoDirectSupabase();
  assertNoPublicSurfaceEntityLinks();
  assertNoClientRequirement();
  assertSurfaceIntegration();

  const rendered = renderLink("event-1", "EVENT");
  assert.equal(rendered.includes("[object Object]"), false);

  console.log("qa:sfi-entity-navigation passed");
  console.log(JSON.stringify({
    hrefExamples: [
      buildEntityHref("phenomenon-1", "PHENOMENON"),
      buildEntityHref("evidence-1", "EVIDENCE"),
      buildEntityHref("prediction-1", "PREDICTION"),
      buildEntityHref("agent-1", "AGENT"),
      buildEntityHref("event-1", "EVENT"),
    ],
    ambiguousHypothesisIdLinked: false,
    correlationIdLinked: false,
    directSupabaseAccess: 0,
    publicSurfacesModifiedForEntityNavigation: 0,
    requiresClientJavascript: false,
  }, null, 2));
}

main();
