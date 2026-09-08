import fs from 'node:fs';
import path from 'node:path';
import { executeWorldSignalObserverAgent } from '../src/lib/world-observatory/worldSignalObserverAgent';

const outputDir = process.env.SFI_WORLD_SIGNAL_OBSERVER_EVIDENCE_DIR
  || path.join(process.cwd(), 'artifacts', 'world-signal-observer');
const outputPath = path.join(outputDir, 'receipt.json');

async function main() {
  const startedAt = new Date().toISOString();
  const result = await executeWorldSignalObserverAgent();
  const observation = result.observation;
  const pass = result.state === 'OBSERVED_WORLD'
    && observation.ok
    && observation.observed > 0
    && observation.persisted > 0
    && observation.activeSourceCount > 0;

  const receipt = {
    contract: 'SFI-WORLD-SIGNAL-OBSERVER-EXECUTION-1.0',
    startedAt,
    completedAt: new Date().toISOString(),
    pass,
    agent: {
      contract: result.contract,
      id: result.agentId,
      name: result.agentName,
      authority: result.authority,
      state: result.state,
    },
    execution: {
      observed: observation.observed,
      persisted: observation.persisted,
      activeSourceCount: observation.activeSourceCount,
      sourceCounts: observation.sourceCounts,
      collectorFailures: observation.failures,
    },
    lineage: result.lineage,
    epistemicBoundary: result.epistemicBoundary,
    returnCondition: 'At least one authorized World source is observed and persisted through the canonical World writer with source lineage; no hypothesis/case/canon/publication promotion is performed by this agent.',
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const receipt = {
    contract: 'SFI-WORLD-SIGNAL-OBSERVER-EXECUTION-1.0',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    pass: false,
    error: error instanceof Error ? error.message : String(error),
  };
  fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2));
  console.error(JSON.stringify(receipt));
  process.exitCode = 1;
});
