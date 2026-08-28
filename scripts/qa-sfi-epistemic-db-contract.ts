import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const MIGRATION = 'supabase/migrations/20260828111500_converge_epistemic_event_contract_and_concurrency.sql';

function quotedValues(value: string) {
  return [...value.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
}

function blockBetween(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(start >= 0 && end > start, `unable to isolate block: ${startMarker}`);
  return source.slice(start, end);
}

async function main() {
  const [schema, migration] = await Promise.all([
    readFile('packages/events/src/schema.ts', 'utf8'),
    readFile(MIGRATION, 'utf8'),
  ]);

  const tsClassBlock = blockBetween(schema, 'export const epistemicClasses:', 'function isRecord');
  const tsClasses = [...new Set(quotedValues(tsClassBlock))].sort();
  const constraintBlock = blockBetween(
    migration,
    'ADD CONSTRAINT epistemic_events_epistemic_class_check',
    'COMMENT ON CONSTRAINT epistemic_events_epistemic_class_check',
  );
  const sqlClasses = [...new Set(quotedValues(constraintBlock))].sort();

  assert.deepEqual(sqlClasses, tsClasses, 'Postgres epistemic class constraint must exactly match the canonical TypeScript event-store vocabulary');
  assert.deepEqual(tsClasses, [
    'canonical',
    'conflicted',
    'declared',
    'degraded',
    'derived',
    'extracted',
    'imported',
    'inferred',
    'missing',
    'observed',
    'proposed',
    'rejected',
    'simulated',
  ]);

  for (const legacy of ['projected', 'weak_signal', 'archived', 'verified_contrast', 'invalidated']) {
    assert(!constraintBlock.includes(`'${legacy}'`), `${legacy} must not be admitted as a persisted event-store class`);
  }

  assert(migration.includes('SFI_EPISTEMIC_CLASS_CONVERGENCE_BLOCKED'));
  assert(migration.includes('WHERE epistemic_class NOT IN'));
  assert(!/\bUPDATE\s+public\.epistemic_events\b/i.test(migration), 'migration must never rewrite historical event classes');
  assert(!/\bDELETE\s+FROM\s+public\.epistemic_events\b/i.test(migration), 'migration must never delete epistemic history');

  const requiredIndexes = [
    'epistemic_events_universal_learning_candidate_cycle_uidx',
    'epistemic_events_universal_learning_terminal_candidate_uidx',
    'epistemic_events_mutation_id_uidx',
    'epistemic_events_mutation_attachment_key_uidx',
    'epistemic_events_person_ct_pattern_candidate_uidx',
    'epistemic_events_person_ct_pattern_terminal_uidx',
  ];
  for (const index of requiredIndexes) {
    assert(migration.includes(`CREATE UNIQUE INDEX IF NOT EXISTS ${index}`), `missing concurrency guard ${index}`);
  }

  for (const key of ['cycleId', 'candidateEventId', 'mutationId', 'attachmentKey', 'ownerId', 'patternId']) {
    assert(migration.includes(`payload->>'${key}'`), `migration must guard lifecycle key ${key}`);
  }

  for (const eventName of [
    'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED',
    'SFI_UNIVERSAL_LEARNING_PROMOTED',
    'SFI_UNIVERSAL_LEARNING_REJECTED',
    'SFI_SYSTEM_MUTATION_RECORDED',
    'SFI_SYSTEM_MUTATION_QA_RECORDED',
    'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
    'SFI_SYSTEM_MUTATION_EXERCISED',
    'SFI_SYSTEM_MUTATION_LEARNING_LINKED',
    'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED',
    'SFI_PERSON_CT_PATTERN_CONFIRMED',
    'SFI_PERSON_CT_PATTERN_REJECTED',
  ]) {
    assert(migration.includes(`'${eventName}'`), `migration must explicitly scope ${eventName}`);
  }

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-EPISTEMIC-DB-CONTRACT-QA-1.0',
    migration: MIGRATION,
    canonicalEpistemicClasses: tsClasses,
    legacyClassesRetiredFromPersistence: ['projected', 'weak_signal', 'archived'],
    assessmentClassesNotPersistedAsEventClass: ['VERIFIED_CONTRAST', 'PROJECTED', 'INVALIDATED'],
    concurrencyGuards: requiredIndexes,
    historicalRewrite: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
