\set ON_ERROR_STOP on

DROP TABLE IF EXISTS public.epistemic_events;

CREATE TABLE public.epistemic_events (
  id bigserial PRIMARY KEY,
  event_name text NOT NULL,
  epistemic_class text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT epistemic_events_epistemic_class_check CHECK (
    epistemic_class IN (
      'observed',
      'declared',
      'derived',
      'inferred',
      'projected',
      'simulated',
      'weak_signal',
      'archived',
      'missing'
    )
  )
);

INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES ('SFI_QA_BASELINE_EVENT', 'observed', '{"fixture":true}'::jsonb);

\ir ../supabase/migrations/20260828111500_converge_epistemic_event_contract_and_concurrency.sql

-- Every canonical TypeScript event-store class must now persist.
INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES
  ('SFI_QA_CLASS_observed', 'observed', '{}'),
  ('SFI_QA_CLASS_declared', 'declared', '{}'),
  ('SFI_QA_CLASS_imported', 'imported', '{}'),
  ('SFI_QA_CLASS_extracted', 'extracted', '{}'),
  ('SFI_QA_CLASS_derived', 'derived', '{}'),
  ('SFI_QA_CLASS_inferred', 'inferred', '{}'),
  ('SFI_QA_CLASS_simulated', 'simulated', '{}'),
  ('SFI_QA_CLASS_proposed', 'proposed', '{}'),
  ('SFI_QA_CLASS_missing', 'missing', '{}'),
  ('SFI_QA_CLASS_degraded', 'degraded', '{}'),
  ('SFI_QA_CLASS_conflicted', 'conflicted', '{}'),
  ('SFI_QA_CLASS_rejected', 'rejected', '{}'),
  ('SFI_QA_CLASS_canonical', 'canonical', '{}');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_QA_LEGACY_projected', 'projected', '{}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_CHECK_VIOLATION: projected';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_QA_LEGACY_weak_signal', 'weak_signal', '{}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_CHECK_VIOLATION: weak_signal';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_QA_LEGACY_archived', 'archived', '{}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_CHECK_VIOLATION: archived';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

-- Learning: one candidate per cycle and one terminal state per candidate.
INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES ('SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED', 'derived', '{"cycleId":"cycle-qa-1"}');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED', 'derived', '{"cycleId":"cycle-qa-1"}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: learning candidate';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES ('SFI_UNIVERSAL_LEARNING_PROMOTED', 'derived', '{"candidateEventId":"candidate-qa-1"}');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_UNIVERSAL_LEARNING_REJECTED', 'derived', '{"candidateEventId":"candidate-qa-1"}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: learning terminal';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

-- Mutation ledger: one mutation record and one attachment key.
INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES ('SFI_SYSTEM_MUTATION_RECORDED', 'observed', '{"mutationId":"mutation:qa-1"}');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_SYSTEM_MUTATION_RECORDED', 'observed', '{"mutationId":"mutation:qa-1"}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: mutation record';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES ('SFI_SYSTEM_MUTATION_QA_RECORDED', 'observed', '{"attachmentKey":"attachment-qa-1"}');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES ('SFI_SYSTEM_MUTATION_EXERCISED', 'derived', '{"attachmentKey":"attachment-qa-1"}');
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: mutation attachment';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

-- PERSON_CT: one candidate and one terminal state per owner/pattern pair.
INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES (
  'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED',
  'inferred',
  '{"ownerId":"owner-qa-1","patternId":"person-ct-pattern:qa-1"}'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES (
      'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED',
      'inferred',
      '{"ownerId":"owner-qa-1","patternId":"person-ct-pattern:qa-1"}'
    );
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: PERSON_CT candidate';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
VALUES (
  'SFI_PERSON_CT_PATTERN_CONFIRMED',
  'derived',
  '{"ownerId":"owner-qa-1","patternId":"person-ct-pattern:qa-1"}'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.epistemic_events (event_name, epistemic_class, payload)
    VALUES (
      'SFI_PERSON_CT_PATTERN_REJECTED',
      'rejected',
      '{"ownerId":"owner-qa-1","patternId":"person-ct-pattern:qa-1"}'
    );
    RAISE EXCEPTION 'SFI_QA_EXPECTED_UNIQUE_VIOLATION: PERSON_CT terminal';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END
$$;

SELECT json_build_object(
  'ok', true,
  'contract', 'SFI-EPISTEMIC-DB-MIGRATION-SMOKE-1.0',
  'canonicalClassRows', count(*) FILTER (WHERE event_name LIKE 'SFI_QA_CLASS_%'),
  'migrationApplied', true,
  'concurrencyGuardsExercised', 6
) AS result
FROM public.epistemic_events;
