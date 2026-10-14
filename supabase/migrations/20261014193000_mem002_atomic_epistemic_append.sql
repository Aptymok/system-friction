-- MEM-002. One serialized writer for every post-cutover epistemic event.
-- Keeps all historical rows and their hashes unchanged.
-- Install on the active write plane only after isolated tests and a deployment gate.
CREATE OR REPLACE FUNCTION public.sfi_append_epistemic_event_v2(
  p_event_id text,
  p_event_name text,
  p_logbook_id text,
  p_epistemic_class text,
  p_schema_version text,
  p_source jsonb,
  p_actor_id text,
  p_node_id uuid,
  p_confidence numeric,
  p_payload jsonb,
  p_checksum text,
  p_lineage text[],
  p_uncertainty text,
  p_occurred_at timestamptz,
  p_canonical_attributes jsonb,
  p_receipt_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_prev text;
  v_event_hash text;
  v_attributes jsonb;
  v_row public.epistemic_events%ROWTYPE;
BEGIN
  IF p_logbook_id IS NULL OR length(p_logbook_id) = 0 THEN
    RAISE EXCEPTION 'SFI_LOGBOOK_ID_REQUIRED';
  END IF;
  IF p_event_id IS NULL OR length(p_event_id) = 0 THEN
    RAISE EXCEPTION 'SFI_EVENT_ID_REQUIRED';
  END IF;
  IF p_payload IS NULL OR p_canonical_attributes IS NULL OR p_source IS NULL THEN
    RAISE EXCEPTION 'SFI_EVENT_MATERIAL_REQUIRED';
  END IF;
  IF p_confidence IS NULL OR p_confidence < 0 OR p_confidence > 1 THEN
    RAISE EXCEPTION 'SFI_CONFIDENCE_OUT_OF_RANGE';
  END IF;
  -- The existing TypeScript canonical hash serializes lexicographically sorted
  -- keys. PostgreSQL jsonb text is not guaranteed to serialize identically.
  -- The caller's hash algorithm is therefore NOT transparently portable.
  -- Migration intentionally fails closed until the exact serializer has been
  -- implemented and proven with golden vectors; no live writes are permitted.
  RAISE EXCEPTION 'SFI_MEM002_CANONICAL_HASH_SERIALIZER_NOT_VERIFIED';

  PERFORM pg_advisory_xact_lock(hashtextextended('SFI-EPISTEMIC-LEDGER:' || p_logbook_id, 0));

  SELECT hash_self INTO v_prev
  FROM public.epistemic_events
  WHERE logbook_id = p_logbook_id
  ORDER BY sequence DESC
  LIMIT 1;

  v_attributes := p_canonical_attributes || jsonb_build_object('hashPrev', v_prev);
  v_event_hash := encode(digest(convert_to(v_attributes::text, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.epistemic_events (
    event_id, event_name, logbook_id, epistemic_class, schema_version,
    source, actor_id, node_id, confidence, payload, checksum, lineage,
    uncertainty, occurred_at, hash_prev, hash_self
  ) VALUES (
    p_event_id, p_event_name, p_logbook_id, p_epistemic_class, p_schema_version,
    p_source, p_actor_id, p_node_id, p_confidence, p_payload, p_checksum, p_lineage,
    p_uncertainty, p_occurred_at, v_prev, v_event_hash
  ) RETURNING * INTO v_row;

  RETURN CASE WHEN p_receipt_only THEN
    jsonb_build_object('event_id', v_row.event_id, 'event_name', v_row.event_name,
      'logbook_id', v_row.logbook_id, 'epistemic_class', v_row.epistemic_class,
      'occurred_at', v_row.occurred_at, 'sequence', v_row.sequence, 'hash_self', v_row.hash_self)
  ELSE to_jsonb(v_row) END;
END;
$$;

-- No execute rights for PUBLIC, anonymous or user-session callers.
REVOKE ALL ON FUNCTION public.sfi_append_epistemic_event_v2(
  text,text,text,text,text,jsonb,text,uuid,numeric,jsonb,text,text[],text,timestamptz,jsonb,boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sfi_append_epistemic_event_v2(
  text,text,text,text,text,jsonb,text,uuid,numeric,jsonb,text,text[],text,timestamptz,jsonb,boolean
) TO service_role;
