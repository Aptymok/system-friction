-- Applied to the existing Supabase primary database as
-- sfi_prediction_verification_atomic_integrity on 2026-11-15 (UTC).
-- A CLOSED verification can only transition to SUPERSEDED, preserving
-- its evaluation, source and provenance. Supersession is one transaction.
-- This does not create a second prediction/evidence repository.

CREATE OR REPLACE FUNCTION public.sfi_guard_prediction_verification_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $guard$
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.verification_state IN ('CLOSED','SUPERSEDED') THEN
      RAISE EXCEPTION 'closed or superseded verification cannot be deleted' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.verification_state='CLOSED' THEN
    IF NEW.verification_state='SUPERSEDED'
       AND (to_jsonb(NEW)-'verification_state'-'superseded_by'-'updated_at')
         = (to_jsonb(OLD)-'verification_state'-'superseded_by'-'updated_at') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'closed verification is immutable except supersession' USING ERRCODE='23514';
  END IF;
  IF OLD.verification_state='SUPERSEDED' THEN
    IF NEW.verification_state='SUPERSEDED'
       AND OLD.superseded_by IS NULL
       AND NEW.superseded_by IS NOT NULL
       AND (to_jsonb(NEW)-'superseded_by'-'updated_at')
         = (to_jsonb(OLD)-'superseded_by'-'updated_at') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'superseded verification is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS sfi_guard_prediction_verification_closure
  ON public.sfi_prediction_verifications;
CREATE TRIGGER sfi_guard_prediction_verification_closure
  BEFORE UPDATE OR DELETE ON public.sfi_prediction_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sfi_guard_prediction_verification_closure();

CREATE OR REPLACE FUNCTION public.sfi_supersede_prediction_verification(
  p_previous_id uuid, p_replacement jsonb
) RETURNS public.sfi_prediction_verifications
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $replace$
DECLARE
  original public.sfi_prediction_verifications%ROWTYPE;
  replacement public.sfi_prediction_verifications%ROWTYPE;
BEGIN
  IF p_replacement IS NULL OR jsonb_typeof(p_replacement)<>'object' THEN
    RAISE EXCEPTION 'replacement must be a JSON object' USING ERRCODE='22023';
  END IF;
  SELECT * INTO original FROM public.sfi_prediction_verifications
    WHERE id=p_previous_id FOR UPDATE;
  IF NOT FOUND OR original.verification_state<>'CLOSED' THEN
    RAISE EXCEPTION 'previous verification missing or not CLOSED' USING ERRCODE='23514';
  END IF;
  IF (p_replacement->>'prediction_entry_id') IS DISTINCT FROM original.prediction_entry_id::text
     OR (p_replacement->>'hypothesis_id') IS DISTINCT FROM original.hypothesis_id
     OR (p_replacement->>'return_window') IS DISTINCT FROM original.return_window THEN
    RAISE EXCEPTION 'replacement must preserve prediction identity and window' USING ERRCODE='23514';
  END IF;
  IF jsonb_typeof(p_replacement->'verification_rule') <> 'object' THEN
    RAISE EXCEPTION 'verification rule is required' USING ERRCODE='23514';
  END IF;

  UPDATE public.sfi_prediction_verifications SET verification_state='SUPERSEDED'
    WHERE id=p_previous_id;

  INSERT INTO public.sfi_prediction_verifications
    (prediction_entry_id,hypothesis_id,return_window,verification_rule,
     ground_truth_source_type,ground_truth_source_url,ground_truth_source_query,
     source_quality_tier,verification_state,evaluation_result)
  VALUES
    (original.prediction_entry_id,original.hypothesis_id,original.return_window,
     p_replacement->'verification_rule',
     p_replacement->>'ground_truth_source_type',
     p_replacement->>'ground_truth_source_url',
     p_replacement->>'ground_truth_source_query',
     (p_replacement->>'source_quality_tier')::integer,
     'OPEN','NOT_EVALUATED')
  RETURNING * INTO replacement;

  UPDATE public.sfi_prediction_verifications SET superseded_by=replacement.id
    WHERE id=p_previous_id;
  RETURN replacement;
END;
$replace$;
REVOKE ALL ON FUNCTION public.sfi_supersede_prediction_verification(uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sfi_supersede_prediction_verification(uuid,jsonb)
  TO service_role;
