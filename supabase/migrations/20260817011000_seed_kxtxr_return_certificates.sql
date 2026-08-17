-- Pre-register the six platform-specific KXTXR return certificates.
-- External permalinks remain NULL until the publication actually exists.

insert into public.public_return_certificates (
  certificate_id, program_id, object_id, trace_id, parent_trace_id,
  platform, state, epistemic_class, scheduled_at, canonical_url,
  asset_sha256, payload_sha256, watermark_scheme, watermark_token,
  watermark_verification, publication_snapshot, record_digest, notes
) values
(
  'SFI-KXTXR-RET-000-IG','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-000','KXTXR-REM618',
  'instagram','prepared','RECORD','2026-08-17T01:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-000-IG',
  '3d5f072ab9bd2231752267f85155b7edf447fefc87393e299004fda672bf08fa',null,'SFI_DUAL_LAYER_V1:FSK64+GRID32','0CF39C3D',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":2,"hamming_distance":2,"mean_margin_db":20.507,"min_margin_db":1.117},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"0CF39C3D","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'31e1f3043d70c18ba5e84dbb6516be4f461e0c9fbec4a0b315add31926c45380','REM618 nocturnal return control; URL intentionally absent until Instagram creates the permalink.'
),
(
  'SFI-KXTXR-RET-000-TT','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-000','KXTXR-REM618',
  'tiktok','prepared','RECORD','2026-08-17T15:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-000-TT',
  '3d5f072ab9bd2231752267f85155b7edf447fefc87393e299004fda672bf08fa',null,'SFI_DUAL_LAYER_V1:FSK64+GRID32','0CF39C3D',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":2,"hamming_distance":2,"mean_margin_db":20.507,"min_margin_db":1.117},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"0CF39C3D","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'b9437926a0012c0a1e56fbb3d6526a332240b3c295636dbeb15fe764f5bb9066','REM618 TikTok return trace; URL intentionally absent until TikTok creates the permalink.'
),
(
  'SFI-KXTXR-RET-001-IG','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-001','SFI-KXTXR-RET-000',
  'instagram','prepared','RECORD','2026-08-18T14:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-001-IG',
  '30f6b3dbe609eb06eaa01e81734e969138a73d16096018857c27367da0fa5c4e','07880af81b1588ed43bcbf335feef72c7b530f3e2209d641722b3f7f18dc38c2','SFI_DUAL_LAYER_V1:FSK64+GRID32','96CD35A4',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":2,"hamming_distance":2,"mean_margin_db":20.533,"min_margin_db":1.224},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"96CD35A4","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'e1642b5413b85fc58b6f147cdc2f12f329a3dad55f202d1a95754dfa0fd7098d','111 emergence trace; uses the existing SFI 111 payload hash as provenance context.'
),
(
  'SFI-KXTXR-RET-001-TT','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-001','SFI-KXTXR-RET-000',
  'tiktok','prepared','RECORD','2026-08-18T16:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-001-TT',
  '30f6b3dbe609eb06eaa01e81734e969138a73d16096018857c27367da0fa5c4e','07880af81b1588ed43bcbf335feef72c7b530f3e2209d641722b3f7f18dc38c2','SFI_DUAL_LAYER_V1:FSK64+GRID32','96CD35A4',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":2,"hamming_distance":2,"mean_margin_db":20.533,"min_margin_db":1.224},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"96CD35A4","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'6975b47d53a2e90ab36d4c502c82011ea158430d53f52b37daf271d800e42cc2','111 TikTok emergence trace; platform URL remains unresolved before publication.'
),
(
  'SFI-KXTXR-RET-002-IG','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-002','SFI-KXTXR-RET-001',
  'instagram','prepared','RECORD','2026-08-19T20:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-002-IG',
  'fbb84bfe3797aa15a7b0ac8c4172d3d1992d886a9cee165f92e48b91b95d270a','07880af81b1588ed43bcbf335feef72c7b530f3e2209d641722b3f7f18dc38c2','SFI_DUAL_LAYER_V1:FSK64+GRID32','EC74C78A',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":1,"hamming_distance":1,"mean_margin_db":19.051,"min_margin_db":1.435},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"EC74C78A","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'afb83858bdc079167898ad395c9557f72394e7d252e41b53fddd7b4767ee81b9','Longitudinal return synthesis for REM618 to 111.'
),
(
  'SFI-KXTXR-RET-002-TT','SFI-KXTXR-RETURN-001','KXTXR','SFI-KXTXR-RET-002','SFI-KXTXR-RET-001',
  'tiktok','prepared','RECORD','2026-08-20T17:11:00-06:00','https://systemfriction.org/return/SFI-KXTXR-RET-002-TT',
  'fbb84bfe3797aa15a7b0ac8c4172d3d1992d886a9cee165f92e48b91b95d270a','07880af81b1588ed43bcbf335feef72c7b530f3e2209d641722b3f7f18dc38c2','SFI_DUAL_LAYER_V1:FSK64+GRID32','EC74C78A',
  '{"status":"REPRESENTATIVE_TRANSCODE_QA","transcode":"H264 720x1280 CRF28 + AAC 64kbps","audio_fsk":{"bits_checked":64,"bit_errors":1,"hamming_distance":1,"mean_margin_db":19.051,"min_margin_db":1.435},"visual_carrier":{"scheme":"SFI_GRID32_REPEAT2_V1","token":"EC74C78A","status":"PRESENT_FOR_VISUAL_QA"}}'::jsonb,
  '{}'::jsonb,'14d4d4359727a281cf17397e1f29f88f75c66ce22990da98532268f6c3aca35f','TikTok longitudinal return synthesis for REM618 to 111.'
)
on conflict (certificate_id) do nothing;
