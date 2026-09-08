console.error(JSON.stringify({
  ok: false,
  blocked: true,
  contract: 'SFI-LEGACY-CANONICAL-HISTORY-SEED-RETIRED-1.0',
  reason: 'This legacy seed imported QA reports, operational patches and runtime events into institutional persistence as canonical history. That behavior is retired by issue #430 and must not be used after the canonical reset.',
  replacement: 'Use the evidence-first canonical reset. It creates only the minimal post-reset genesis state and one hash-linked genesis audit event; discarded legacy rows are not re-imported.',
}, null, 2));
process.exit(1);
