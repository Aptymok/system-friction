-- SFI MEM-002 Neon parity: 2026-10-16
-- Source: supabase/migrations/20261014193000_mem002_atomic_epistemic_append.sql
-- Adds the same canonical atomic writer only when absent; no event/history rewrite.
-- Neon role-specific API grant; no anon/public execution privilege.
-- Gate: current mode RECOVERY, pgcrypto available, service role has table select/insert.
-- MEM-002. One serialized writer for every post-cutover epistemic event.
-- Keeps all historical rows and their hashes unchanged.
-- Install on the active write plane only after isolated tests and a deployment gate.
CREATE FUNCTION public.sfi_append_epistemic_event_v2(
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
  p_canonical_utf8 text,
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
  -- Lock first: no competing writer can read and append the same head.
  PERFORM pg_advisory_xact_lock(hashtextextended('SFI-EPISTEMIC-LEDGER:' || p_logbook_id, 0));

  SELECT hash_self INTO v_prev
  FROM public.epistemic_events
  WHERE logbook_id = p_logbook_id
  ORDER BY sequence DESC
  LIMIT 1;

  -- No guessing how JSONB canonicalizes: input provides SHA-256 material
  -- computed by the canonical TypeScript serializer for a specific head.
  -- The predecessor is checked under the lock. A stale concurrent attempt
  -- is explicitly rejected and the caller must retry with a new head.
  IF p_canonical_attributes->>'hashPrev' IS DISTINCT FROM v_prev THEN
    RAISE EXCEPTION 'SFI_EPIS_HEAD_STALE_RETRY';
  END IF;
  IF p_canonical_attributes->>'checksum' IS DISTINCT FROM p_checksum THEN
    RAISE EXCEPTION 'SFI_EPIS_CHECKSUM_MISMATCH';
  END IF;
  -- Event identity and critical fields are compared before accepting material.
  IF p_canonical_attributes->>'eventId' IS DISTINCT FROM p_event_id
    OR p_canonical_attributes->>'eventName' IS DISTINCT FROM p_event_name
    OR p_canonical_attributes->>'logbookId' IS DISTINCT FROM p_logbook_id
    OR p_canonical_attributes->>'epistemicClass' IS DISTINCT FROM p_epistemic_class
    OR p_canonical_attributes->>'schemaVersion' IS DISTINCT FROM p_schema_version
    OR p_canonical_attributes->>'occurredAt' IS DISTINCT FROM to_char(p_occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    OR (p_canonical_attributes->'source') IS DISTINCT FROM p_source
    OR (p_canonical_attributes->'payload') IS DISTINCT FROM p_payload
    OR (p_canonical_attributes->'lineage') IS DISTINCT FROM to_jsonb(p_lineage)
    OR (p_canonical_attributes->>'confidence')::numeric IS DISTINCT FROM p_confidence
    OR p_canonical_attributes->>'uncertainty' IS DISTINCT FROM p_uncertainty
  THEN
    RAISE EXCEPTION 'SFI_EPIS_CANONICAL_MATERIAL_MISMATCH';
  END IF;

  -- SHA-256 must be supplied with its exact canonical UTF-8 serialization,
  -- preserving the JS ordering. This avoids hashing jsonb::text (different
  -- serializer) and delegates only digest computation to PostgreSQL.
  IF p_canonical_attributes ? '__canonical_utf8' OR p_canonical_utf8 IS NULL THEN
    RAISE EXCEPTION 'SFI_EPIS_CANONICAL_SERIALIZATION_REQUIRED';
  END IF;
  -- Exact canonical bytes are recomputed client-side from the immutable
  -- event attributes plus the head returned by the RPC read phase. A client
  -- cannot supply a new hash without explicitly attesting this material.
  IF p_canonical_utf8::jsonb IS DISTINCT FROM p_canonical_attributes THEN
    RAISE EXCEPTION 'SFI_EPIS_CANONICAL_SERIALIZATION_MISMATCH';
  END IF;
  v_event_hash := encode(digest(convert_to(p_canonical_utf8, 'UTF8'), 'sha256'), 'hex');

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
    jsonb_build_object('id', v_row.id, 'event_id', v_row.event_id, 'event_name', v_row.event_name,
      'logbook_id', v_row.logbook_id, 'epistemic_class', v_row.epistemic_class,
      'occurred_at', v_row.occurred_at, 'sequence', v_row.sequence, 'hash_self', v_row.hash_self)
  ELSE to_jsonb(v_row) END;
END;
$$;


-- Neon continuity Data API uses JWT role sfi_continuity_service, not Supabase service_role.
-- The function is invoker-security, retains the same canonical 17-argument body.
-- On fresh environment, this should be applied once only.
REVOKE ALL ON FUNCTION public.sfi_append_epistemic_event_v2(text,text,text,text,text,jsonb,text,uuid,numeric,jsonb,text,text[],text,timestamptz,jsonb,text,boolean) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.sfi_append_epistemic_event_v2(text,text,text,text,text,jsonb,text,uuid,numeric,jsonb,text,text[],text,timestamptz,jsonb,text,boolean) TO sfi_continuity_service;
NOTIFY pgrst, 'reload schema';
