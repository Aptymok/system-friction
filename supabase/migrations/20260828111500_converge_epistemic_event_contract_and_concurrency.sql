-- SFI epistemic event contract convergence + concurrency guards.
--
-- This migration is intentionally fail-closed:
--   1. It never rewrites historical epistemic classes.
--   2. It aborts if any persisted class is outside the canonical event-store vocabulary.
--   3. It aborts if duplicate lifecycle keys already exist before uniqueness is enforced.
--
-- VERIFIED_CONTRAST / PROJECTED / INVALIDATED are assessment/projection classes,
-- not persisted epistemic_events.epistemic_class values.

DO $$
DECLARE
  invalid_classes text;
BEGIN
  SELECT string_agg(epistemic_class, ', ' ORDER BY epistemic_class)
  INTO invalid_classes
  FROM (
    SELECT DISTINCT epistemic_class
    FROM public.epistemic_events
    WHERE epistemic_class NOT IN (
      'observed',
      'declared',
      'imported',
      'extracted',
      'derived',
      'inferred',
      'simulated',
      'proposed',
      'missing',
      'degraded',
      'conflicted',
      'rejected',
      'canonical'
    )
  ) AS invalid;

  IF invalid_classes IS NOT NULL THEN
    RAISE EXCEPTION
      'SFI_EPISTEMIC_CLASS_CONVERGENCE_BLOCKED: persisted non-canonical classes detected: %',
      invalid_classes;
  END IF;
END
$$;

ALTER TABLE public.epistemic_events
  DROP CONSTRAINT IF EXISTS epistemic_events_epistemic_class_check;

ALTER TABLE public.epistemic_events
  ADD CONSTRAINT epistemic_events_epistemic_class_check
  CHECK (
    epistemic_class IN (
      'observed',
      'declared',
      'imported',
      'extracted',
      'derived',
      'inferred',
      'simulated',
      'proposed',
      'missing',
      'degraded',
      'conflicted',
      'rejected',
      'canonical'
    )
  );

COMMENT ON CONSTRAINT epistemic_events_epistemic_class_check ON public.epistemic_events IS
  'SFI canonical persisted event-store classes. Assessment/projection classes such as VERIFIED_CONTRAST are represented separately in payload/projection state.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name = 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED'
      AND nullif(payload->>'cycleId', '') IS NOT NULL
    GROUP BY payload->>'cycleId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate universal learning candidates by cycleId';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name IN ('SFI_UNIVERSAL_LEARNING_PROMOTED', 'SFI_UNIVERSAL_LEARNING_REJECTED')
      AND nullif(payload->>'candidateEventId', '') IS NOT NULL
    GROUP BY payload->>'candidateEventId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate universal learning terminal states by candidateEventId';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name = 'SFI_SYSTEM_MUTATION_RECORDED'
      AND nullif(payload->>'mutationId', '') IS NOT NULL
    GROUP BY payload->>'mutationId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate system mutation records by mutationId';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name IN (
      'SFI_SYSTEM_MUTATION_QA_RECORDED',
      'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
      'SFI_SYSTEM_MUTATION_EXERCISED',
      'SFI_SYSTEM_MUTATION_LEARNING_LINKED'
    )
      AND nullif(payload->>'attachmentKey', '') IS NOT NULL
    GROUP BY payload->>'attachmentKey'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate system mutation attachments by attachmentKey';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name = 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED'
      AND nullif(payload->>'ownerId', '') IS NOT NULL
      AND nullif(payload->>'patternId', '') IS NOT NULL
    GROUP BY payload->>'ownerId', payload->>'patternId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate PERSON_CT pattern candidates by ownerId/patternId';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.epistemic_events
    WHERE event_name IN ('SFI_PERSON_CT_PATTERN_CONFIRMED', 'SFI_PERSON_CT_PATTERN_REJECTED')
      AND nullif(payload->>'ownerId', '') IS NOT NULL
      AND nullif(payload->>'patternId', '') IS NOT NULL
    GROUP BY payload->>'ownerId', payload->>'patternId'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SFI_CONCURRENCY_GUARD_BLOCKED: duplicate PERSON_CT terminal states by ownerId/patternId';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_universal_learning_candidate_cycle_uidx
  ON public.epistemic_events ((payload->>'cycleId'))
  WHERE event_name = 'SFI_UNIVERSAL_LEARNING_CANDIDATE_RECORDED'
    AND nullif(payload->>'cycleId', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_universal_learning_terminal_candidate_uidx
  ON public.epistemic_events ((payload->>'candidateEventId'))
  WHERE event_name IN ('SFI_UNIVERSAL_LEARNING_PROMOTED', 'SFI_UNIVERSAL_LEARNING_REJECTED')
    AND nullif(payload->>'candidateEventId', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_mutation_id_uidx
  ON public.epistemic_events ((payload->>'mutationId'))
  WHERE event_name = 'SFI_SYSTEM_MUTATION_RECORDED'
    AND nullif(payload->>'mutationId', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_mutation_attachment_key_uidx
  ON public.epistemic_events ((payload->>'attachmentKey'))
  WHERE event_name IN (
    'SFI_SYSTEM_MUTATION_QA_RECORDED',
    'SFI_SYSTEM_MUTATION_DEPLOYMENT_RECORDED',
    'SFI_SYSTEM_MUTATION_EXERCISED',
    'SFI_SYSTEM_MUTATION_LEARNING_LINKED'
  )
    AND nullif(payload->>'attachmentKey', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_person_ct_pattern_candidate_uidx
  ON public.epistemic_events ((payload->>'ownerId'), (payload->>'patternId'))
  WHERE event_name = 'SFI_PERSON_CT_PATTERN_CANDIDATE_RECORDED'
    AND nullif(payload->>'ownerId', '') IS NOT NULL
    AND nullif(payload->>'patternId', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS epistemic_events_person_ct_pattern_terminal_uidx
  ON public.epistemic_events ((payload->>'ownerId'), (payload->>'patternId'))
  WHERE event_name IN ('SFI_PERSON_CT_PATTERN_CONFIRMED', 'SFI_PERSON_CT_PATTERN_REJECTED')
    AND nullif(payload->>'ownerId', '') IS NOT NULL
    AND nullif(payload->>'patternId', '') IS NOT NULL;

COMMENT ON INDEX public.epistemic_events_universal_learning_candidate_cycle_uidx IS
  'At most one learning-quarantine candidate per universal cycle.';
COMMENT ON INDEX public.epistemic_events_universal_learning_terminal_candidate_uidx IS
  'At most one terminal promotion/rejection decision per learning candidate.';
COMMENT ON INDEX public.epistemic_events_mutation_id_uidx IS
  'At most one governed mutation record per verified repository mutation id.';
COMMENT ON INDEX public.epistemic_events_mutation_attachment_key_uidx IS
  'Idempotency guard for mutation evidence attachments.';
COMMENT ON INDEX public.epistemic_events_person_ct_pattern_candidate_uidx IS
  'At most one owner-scoped PERSON_CT candidate for the same normalized pattern id.';
COMMENT ON INDEX public.epistemic_events_person_ct_pattern_terminal_uidx IS
  'At most one terminal confirmation/rejection state per owner-scoped PERSON_CT pattern.';
