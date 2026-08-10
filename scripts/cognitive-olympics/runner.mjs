#!/usr/bin/env node
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { parseCli, profileFrom, START_YEAR, END_YEAR } from './lib/config.mjs';
import { loadDataset, indexDataset } from './lib/dataset.mjs';
import { forgeProblems, publicProblem, enrichWithEvidence } from './lib/problem-forge.mjs';
import { statsEngine, llmEngine, discoverOllamaModels } from './lib/engines.mjs';
import { DEFAULT_CONSTITUTIONS, CONSTITUTIONS, evolveState } from './lib/constitutions.mjs';
import { scoreAnswers } from './lib/scorer.mjs';
import { appendJsonl, ensureDir, runId as makeRunId, sha256, writeJson } from './lib/utils.mjs';
import { experimentManifest } from './lib/manifest.mjs';

const args = parseCli();
const profile = profileFrom(args.profile);
const dataDir = path.resolve(args.data || process.env.SFI_CL_DATA_DIR || '.sfi-cl/data/world-bank');
const runsDir = path.resolve(args.runs || process.env.SFI_CL_RUNS_DIR || '.sfi-cl/runs');
const runId = args['run-id'] || makeRunId();
const runDir = path.join(runsDir, runId);
const shadow = String(args.track || 'A').toUpperCase() === 'B';
const congressEnabled = args.congress === true || String(args.congress || profile.congress) === 'true';
const constitutionIds = String(args.constitutions || process.env.SFI_CL_CONSTITUTIONS || DEFAULT_CONSTITUTIONS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const problemsPerYear = Number(args.problems || process.env.SFI_CL_PROBLEMS_PER_YEAR || profile.problemsPerYear);
const batchSize = Number(args['batch-size'] || process.env.SFI_CL_BATCH_SIZE || profile.batchSize);
const startYear = Number(args.start || START_YEAR);
const endYear = Number(args.end || END_YEAR);

await ensureDir(runDir);
const ledger = path.join(runDir, 'ledger.jsonl');
await writeJson(path.join(runDir, 'manifest.json'), { ...experimentManifest(), runId, profile, track: shadow ? 'B' : 'A', problemsPerYear, batchSize, congressEnabled, dataDir, startedAt: new Date().toISOString() });
await appendJsonl(ledger, { event: 'RUN_STARTED', runId, at: new Date().toISOString(), profile: profile.name, problemsPerYear, batchSize });

const { records, manifest: datasetManifest } = await loadDataset(dataDir);
const index = indexDataset(records);

async function buildEngines() {
  const spec = String(args.engines || process.env.SFI_CL_ENGINES || 'stats,ollama:auto').split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const entry of spec) {
    if (entry === 'stats') { out.push(statsEngine()); continue; }
    const [provider, modelRaw] = entry.split(':', 2);
    if (provider === 'ollama' && (!modelRaw || modelRaw === 'auto')) {
      try {
        const models = await discoverOllamaModels();
        const max = Number(process.env.SFI_CL_OLLAMA_AUTO_COUNT || 3);
        for (const model of models.slice(0, max)) out.push(llmEngine({ provider: 'ollama', model }));
      } catch (error) { await appendJsonl(ledger, { event: 'ENGINE_SKIPPED', engine: entry, error: String(error?.message || error) }); }
      continue;
    }
    if (provider === 'groq' && modelRaw) { out.push(llmEngine({ provider: 'groq', model: modelRaw })); continue; }
    if (provider === 'ollama' && modelRaw) { out.push(llmEngine({ provider: 'ollama', model: modelRaw })); continue; }
  }
  if (!out.length) out.push(statsEngine());
  return out;
}

const engines = await buildEngines();
const athletes = [];
for (const engine of engines) {
  if (engine.kind === 'stats') athletes.push({ id: `A-${sha256(engine.id).slice(0, 8)}`, engine, constitutionId: 'generic-control', constitutionState: {}, memory: [] });
  else for (const constitutionId of constitutionIds) {
    if (!CONSTITUTIONS[constitutionId]) continue;
    athletes.push({ id: `A-${sha256(`${engine.id}|${constitutionId}`).slice(0, 8)}`, engine, constitutionId, constitutionState: {}, memory: [] });
  }
}
await writeJson(path.join(runDir, 'athletes.json'), athletes.map((a) => ({ id: a.id, engine: a.engine.id, constitutionId: a.constitutionId, constitution: CONSTITUTIONS[a.constitutionId] })));
await appendJsonl(ledger, { event: 'ATHLETES_REGISTERED', count: athletes.length, athletes: athletes.map((a) => ({ id: a.id, engine: a.engine.id, constitution: a.constitutionId })) });

async function runSfiAgentBridge(year, problems) {
  const evidence = problems.slice(0, 250).map((p) => ({
    id: p.problemId,
    source: 'SFI_CL_WORLD_FRAME',
    confidence: 0.8,
    payload: {
      year, country: p.geography.iso3, indicator: p.indicator, history: p.history,
      currentValue: p.currentValue, epistemicClass: 'IMPORTED_HISTORICAL_REPLAY',
    },
  }));
  const context = {
    taskId: `cl:${runId}:${year}`,
    cycleId: `cl-cycle:${runId}:${year}`,
    logbookId: `cl:${runId}`,
    currentEvent: 'SFI_CL_WORLD_FRAME',
    evidence, hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [],
    metadata: { requestedAgents: 'ALL_REGISTERED', llmAugmentation: false, laboratory: true, cutoffYear: year },
  };
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', 'tsx', path.join(import.meta.dirname, 'sfi-agent-bridge.ts')], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', (code) => {
      if (code !== 0) return resolve({ ok: false, error: stderr.slice(-4000), executedAgents: [] });
      try { resolve(JSON.parse(stdout)); } catch { resolve({ ok: false, error: 'INVALID_BRIDGE_JSON', raw: stdout.slice(-4000), executedAgents: [] }); }
    });
    child.stdin.end(JSON.stringify({ context }));
  });
}

const totalStarted = performance.now();
const cumulative = new Map(athletes.map((a) => [a.id, []]));

for (let year = startYear; year < endYear; year += 1) {
  const yearStart = performance.now();
  const problems = forgeProblems({ records, index, year, count: problemsPerYear, seed: `${runId}:${profile.name}` });
  await appendJsonl(ledger, { event: 'YEAR_STARTED', year, problems: problems.length, at: new Date().toISOString() });
  if (!problems.length) { await appendJsonl(ledger, { event: 'YEAR_SKIPPED', year, reason: 'NO_SCORABLE_PROBLEMS' }); continue; }

  const annualScores = [];
  const sfiAgentPacket = await runSfiAgentBridge(year, problems);
  await appendJsonl(ledger, { event: 'SFI_AGENT_BRIDGE_COMPLETED', year, ok: Boolean(sfiAgentPacket?.ok), executedAgents: sfiAgentPacket?.executedAgents || [], error: sfiAgentPacket?.error || null });
  const needsSfiBridge = athletes.some((a) => (CONSTITUTIONS[a.constitutionId]?.sfiMode || 'NONE') !== 'NONE');
  if (needsSfiBridge && !sfiAgentPacket?.ok) throw new Error(`SFI_AGENT_BRIDGE_REQUIRED:${sfiAgentPacket?.error || 'unknown bridge failure'}`);
  for (const athlete of athletes) {
    const athleteStart = performance.now();
    const answers = [];
    let errors = 0;
    const sfiMode = CONSTITUTIONS[athlete.constitutionId]?.sfiMode || 'NONE';
    if (sfiMode !== 'NONE') athlete.sfiAgentPacket = sfiAgentPacket;
    else athlete.sfiAgentPacket = null;
    for (let offset = 0; offset < problems.length; offset += batchSize) {
      const rawBatch = problems.slice(offset, offset + batchSize);
      const publicBatch = rawBatch.map((p) => publicProblem(p, { shadow, revealCatalogValues: athlete.engine.kind === 'stats' }));
      try {
        let plans = {};
        if (athlete.engine.kind === 'llm') plans = await athlete.engine.planEvidence(publicBatch, athlete);
        const enriched = publicBatch.map((p, i) => ({ ...p, acquiredEvidence: enrichWithEvidence(rawBatch[i], plans[p.problemId] || []) }));
        const batchAnswers = await athlete.engine.solve(enriched, athlete);
        answers.push(...batchAnswers);
        await appendJsonl(ledger, { event: 'HEAT_COMPLETED', year, athleteId: athlete.id, offset, size: rawBatch.length, at: new Date().toISOString() });
      } catch (error) {
        errors += 1;
        await appendJsonl(ledger, { event: 'HEAT_FAILED', year, athleteId: athlete.id, offset, error: String(error?.message || error), at: new Date().toISOString() });
        answers.push(...rawBatch.map((p) => ({ problemId: p.problemId, decision: 'ABSTAIN', confidence: 0, hypothesis: '', rivals: [], evidenceUsed: [], evidenceRequests: [], sfiMethods: [], agentsUsed: [], abstainReason: 'engine failure' })));
      }
    }
    athlete.sfiAgentPacket = null;
    const sealed = { runId, year, athleteId: athlete.id, engine: athlete.engine.id, constitutionId: athlete.constitutionId, cutoffYear: year, answers, sealedAt: new Date().toISOString() };
    const sealHash = sha256(sealed);
    await writeJson(path.join(runDir, `year-${year}`, `${athlete.id}.sealed.json`), { ...sealed, sealHash });
    await appendJsonl(ledger, { event: 'PREDICTIONS_SEALED', year, athleteId: athlete.id, sealHash, answers: answers.length });

    const { score, rows } = scoreAnswers(problems, answers, { constitutionId: athlete.constitutionId, engineId: athlete.engine.id, year });
    score.durationMs = Math.round(performance.now() - athleteStart); score.engineErrors = errors; score.sealHash = sealHash;
    annualScores.push({ athleteId: athlete.id, ...score });
    cumulative.get(athlete.id).push(score);
    const misses = rows.filter((r) => r.answered && !r.hit).slice(0, 20).map((r) => ({ problemId: r.problemId, type: r.type, decision: r.decision, outcome: r.outcome, confidence: r.confidence }));
    athlete.memory.push({ year, score: { accuracy: score.accuracy, brier: score.brier, composite: score.composite, coverage: score.coverage, temporalIntegrity: score.temporalIntegrity, evidenceDiscipline: score.evidenceDiscipline }, misses, lesson: 'These outcomes are revealed only after sealing and become legitimate past experience for the next simulated year.' });
    athlete.memory = athlete.memory.slice(-6);
    athlete.constitutionState = evolveState(athlete.constitutionId, athlete.constitutionState, score);
    await writeJson(path.join(runDir, `year-${year}`, `${athlete.id}.score.json`), { score, rows });
    await writeJson(path.join(runDir, `checkpoints`, `${athlete.id}.json`), { athleteId: athlete.id, lastCompletedYear: year, memory: athlete.memory, constitutionState: athlete.constitutionState });
    await appendJsonl(ledger, { event: 'YEAR_SCORED', year, athleteId: athlete.id, score });
  }

  annualScores.sort((a, b) => b.composite - a.composite);
  await writeJson(path.join(runDir, `year-${year}`, 'leaderboard.json'), annualScores);

  if (congressEnabled) {
    const peers = annualScores.map((x) => ({ athleteId: x.athleteId, composite: x.composite, accuracy: x.accuracy, temporalIntegrity: x.temporalIntegrity }));
    for (const athlete of athletes.filter((a) => a.engine.kind === 'llm')) {
      try {
        const messages = await athlete.engine.congress({ self: athlete.id, peers: peers.filter((p) => p.athleteId !== athlete.id), year, memory: athlete.memory });
        await appendJsonl(path.join(runDir, `year-${year}`, 'congress.jsonl'), { from: athlete.id, year, messages, at: new Date().toISOString() });
      } catch (error) { await appendJsonl(ledger, { event: 'CONGRESS_FAILED', year, athleteId: athlete.id, error: String(error?.message || error) }); }
    }
  }
  await appendJsonl(ledger, { event: 'YEAR_COMPLETED', year, durationMs: Math.round(performance.now() - yearStart), leader: annualScores[0]?.athleteId || null });
}

const final = athletes.map((a) => {
  const xs = cumulative.get(a.id) || [];
  return {
    athleteId: a.id, engine: a.engine.id, constitutionId: a.constitutionId,
    yearsScored: xs.length,
    meanComposite: xs.length ? xs.reduce((s, x) => s + x.composite, 0) / xs.length : 0,
    meanAccuracy: xs.length ? xs.reduce((s, x) => s + x.accuracy, 0) / xs.length : 0,
    meanTemporalIntegrity: xs.length ? xs.reduce((s, x) => s + x.temporalIntegrity, 0) / xs.length : 0,
    totalDurationMs: xs.reduce((s, x) => s + (x.durationMs || 0), 0),
  };
}).sort((a, b) => b.meanComposite - a.meanComposite);

await writeJson(path.join(runDir, 'leaderboard.final.json'), final);
await writeJson(path.join(runDir, 'terminal-2026.json'), { year: endYear, note: 'Terminal current frame. Outcomes beyond the currently available 2026 data are not fabricated or scored.', datasetManifest });
await appendJsonl(ledger, { event: 'RUN_FINISHED', runId, at: new Date().toISOString(), durationMs: Math.round(performance.now() - totalStarted), winner: final[0]?.athleteId || null });
console.log(JSON.stringify({ ok: true, runId, runDir, athletes: athletes.length, final }, null, 2));
