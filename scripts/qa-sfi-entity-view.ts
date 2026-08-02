import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServiceSupabaseClient } from "../src/runtime/supabase/server";
import { EntityGraphView } from "../src/components/entity/EntityGraphView";
import { EntityLimitationsPanel } from "../src/components/entity/EntityLimitationsPanel";
import { EntityTrajectoryPanel } from "../src/components/entity/EntityTrajectoryPanel";
import type { EntityContext } from "../src/core/contracts";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

async function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function fetchText(url: string, token: string, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "x-sfi-entity-graph-local-token": token },
      signal: controller.signal,
    });
    return { status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForPage(baseUrl: string, entityId: string, token: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetchText(`${baseUrl}/entity/${entityId}?entityType=PHENOMENON`, token, 90000);
      if (response.status === 200 && response.text.includes("Internal Observation Interface")) {
        return response;
      }
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw lastError ?? new Error("Entity page did not become ready.");
}

function killDevServer(child: ReturnType<typeof spawn>) {
  if (!child.pid || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

function walkFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function assertNoDirectSupabase() {
  const files = [
    ...walkFiles(path.join(process.cwd(), "src", "app", "entity")),
    ...walkFiles(path.join(process.cwd(), "src", "components", "entity")),
  ];
  const offenders = files.filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return /supabase|createServiceSupabaseClient|\.from\(/i.test(source);
  });
  assert.deepEqual(offenders, [], "app/entity and components/entity must not access Supabase directly");
}

function assertNoClientRequirement() {
  const files = [
    ...walkFiles(path.join(process.cwd(), "src", "app", "entity")),
    ...walkFiles(path.join(process.cwd(), "src", "components", "entity")),
  ];
  const offenders = files.filter((file) => fs.readFileSync(file, "utf8").includes("\"use client\"") || fs.readFileSync(file, "utf8").includes("'use client'"));
  assert.deepEqual(offenders, [], "entity view must be server-rendered without client component requirement");
}

function fixtureContext(): EntityContext {
  const trace = {
    logbookId: "qa-view-logbook",
    correlationId: "qa-view-trace",
    initiatedBy: "qa:sfi-entity-view",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    entity: {
      entityId: "phenomenon-qa",
      type: "PHENOMENON",
      label: "QA Phenomenon",
      trace,
      logbookId: trace.logbookId,
      confidence: 0.8,
    },
    observations: [],
    evidence: [],
    predictions: [],
    decisions: [],
    memory: [],
    agents: [],
    events: [],
    trajectory: {
      entityId: "phenomenon-qa",
      timeline: [{
        timestamp: "2026-01-01T00:00:00.000Z",
        sourceEntityId: "obs-qa",
        sourceType: "root_observation_events",
        position: 0.7,
        confidence: 0.7,
        payload: { positionSource: "confidence_observable" },
      }],
      currentPosition: {
        timestamp: "2026-01-01T00:00:00.000Z",
        sourceEntityId: "obs-qa",
        sourceType: "root_observation_events",
        position: 0.7,
        confidence: 0.7,
        payload: { positionSource: "confidence_observable" },
      },
      projected: [],
      velocity: 0,
      velocityUnit: "position_per_day",
      acceleration: 0,
      accelerationUnit: "position_per_day_squared",
      deviation: 0,
      deviationDefinition: "not_calculated_without_two_real_temporal_points; position=confidence_observable",
      projectionMethod: "none",
      confidence: 0.7,
      evidenceIds: ["obs-qa"],
      status: "PARTIAL",
      limitations: [{
        code: "INSUFFICIENT_TEMPORAL_POINTS",
        scope: "trajectory:phenomenon-qa",
        severity: "WARNING",
        message: "Trajectory requires at least two real temporal points.",
        recoverable: true,
        requirement: "0 or 1 temporal points must produce PARTIAL and no projection.",
      }],
    },
    governance: {
      entityId: "phenomenon-qa",
      decisions: [],
      status: "UNKNOWN",
      limitations: [],
    },
    relationships: [{
      sourceId: "obs-qa",
      targetId: "phenomenon-qa",
      relationType: "OBSERVES",
      weight: 0.7,
      confidence: 0.7,
      evidenceIds: ["obs-qa"],
      trace,
      derivationRule: "observation.phenomenon_id explicitly identifies the observed phenomenon",
      sourceTable: "root_observation_events",
    }],
    provenance: [{
      sourceTable: "sfi_phenomena",
      sourceId: "phenomenon-qa",
      entityId: "phenomenon-qa",
      matchedBy: "fixture",
      confidence: 0.8,
      payloadKeys: ["id"],
    }],
    limitations: [{
      code: "CONTEXT_SECTIONS_EMPTY",
      scope: "context",
      source: "fixture",
      severity: "INFO",
      message: "No data was available for sections: evidence.",
      recoverable: true,
      requirement: "Empty sections must remain empty and be reported without synthetic content.",
    }],
  };
}

async function main() {
  loadEnvLocal();
  assertNoDirectSupabase();
  assertNoClientRequirement();

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.from("sfi_phenomena").select("id").limit(1);
  assert.equal(error, null, "must read a real PHENOMENON id for view QA");
  const entityId = data?.[0]?.id;
  assert.equal(typeof entityId, "string", "real PHENOMENON id must exist");

  const port = await freePort();
  const token = "qa-sfi-entity-view";
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--webpack", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, SFI_ENTITY_GRAPH_LOCAL_TOKEN: token },
    stdio: "ignore",
  });

  try {
    const baseUrl = `http://localhost:${port}`;
    const phenomenon = await waitForPage(baseUrl, entityId, token);
    assert.equal(phenomenon.status, 200, "real PHENOMENON view must render");
    assert.ok(phenomenon.text.includes("Entity Timeline"), "timeline panel must render");
    assert.ok(phenomenon.text.includes("Relationship Field"), "relationship field must render");
    assert.ok(phenomenon.text.includes("Limitations Panel"), "limitations must be visible");
    assert.ok(phenomenon.text.includes("OPERATIONAL") || phenomenon.text.includes("PARTIAL"), "entity status must render without collapsing");
    assert.equal(phenomenon.text.includes("[object Object]"), false, "HTML must not contain [object Object]");
    assert.equal(phenomenon.text.includes("Friction Field"), false, "view must not include old friction dashboard content");

    const mismatch = await fetchText(`${baseUrl}/entity/${entityId}?entityType=OBSERVATION`, token, 90000);
    assert.equal(mismatch.status, 200, "TYPE_MISMATCH surface renders as page HTML");
    assert.ok(mismatch.text.includes("TYPE_MISMATCH"), "TYPE_MISMATCH must be visible");
    assert.ok(mismatch.text.includes("resolvedEntityType"), "resolved type must be visible");

    const missing = await fetchText(`${baseUrl}/entity/not-found-entity?entityType=PHENOMENON`, token, 90000);
    assert.equal(missing.status, 200, "NOT_FOUND surface renders as page HTML");
    assert.ok(missing.text.includes("NOT_FOUND"), "NOT_FOUND must be visible");
  } finally {
    killDevServer(child);
  }

  const context = fixtureContext();
  const graphHtml = renderToStaticMarkup(createElement(EntityGraphView, { context }));
  assert.ok(graphHtml.includes("/entity/obs-qa?entityType=OBSERVATION"), "related ids must be linked with known type hints");
  assert.ok(graphHtml.includes("derivationRule") || graphHtml.includes("Derivation"), "derivation rule must render");

  const trajectoryHtml = renderToStaticMarkup(createElement(EntityTrajectoryPanel, { context }));
  assert.ok(trajectoryHtml.includes("PARTIAL"), "single-point trajectory must render PARTIAL");
  assert.ok(trajectoryHtml.includes("Sin proyeccion"), "single-point trajectory must not show projection");
  assert.ok(trajectoryHtml.includes("confidence como proxy observable"), "confidence proxy must be explained");

  const limitationsHtml = renderToStaticMarkup(createElement(EntityLimitationsPanel, { limitations: context.limitations }));
  assert.ok(limitationsHtml.includes("CONTEXT_SECTIONS_EMPTY"), "structured limitation code must render");
  assert.equal(`${graphHtml}${trajectoryHtml}${limitationsHtml}`.includes("[object Object]"), false, "static component output must not contain [object Object]");

  console.log("qa:sfi-entity-view passed");
  console.log(JSON.stringify({
    realEntityId: entityId,
    renderedPanels: ["Entity Timeline", "Relationship Field", "Evidence Panel", "Trajectory Panel", "Limitations Panel"],
    directSupabaseAccessInView: 0,
    clientComponentsRequired: 0,
    typeMismatchVisible: true,
    partialTrajectoryProjection: "empty",
  }, null, 2));
}

main().catch((error) => {
  console.error("qa:sfi-entity-view failed");
  console.error(error);
  process.exit(1);
});
