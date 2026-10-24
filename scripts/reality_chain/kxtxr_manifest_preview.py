"""Read-only KXTXR T0/T1 preview from the CURRENT 90-day master manifest.

This tool does not register a SOURCE, certify a publication, contact a
platform, mutate a case, grant authority, or produce an institutional Passport.
Use the canonical Case Platform only after source admission and authorization.
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta
import hashlib
import json
from pathlib import Path
import re
from uuid import UUID

SCHEMA = "SFI_KXTXR_90D_EXECUTION_MANIFEST_V1"
EXPECTED_VERSION = "1.1.0"
OUT_CONTRACT = "SFI_RC_KXTXR_T0_T1_READ_ONLY_PREVIEW_V1"
SOURCE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{10,}$")


def reconstruct(manifest: dict, *, source_id: str, source_sha256: str,
                case_id: str, as_of_date: str) -> dict:
    """Construct source-declared plan history, never a verified world history."""
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("SFI_RC_UNRECOGNIZED_MANIFEST_SCHEMA")
    if manifest.get("version") != EXPECTED_VERSION:
        raise ValueError("SFI_RC_MANIFEST_VERSION_NOT_AUTHORIZED")
    if not SOURCE_ID_PATTERN.fullmatch(source_id):
        raise ValueError("SFI_RC_DRIVE_SOURCE_ID_REQUIRED")
    if not re.fullmatch(r"[a-f0-9]{64}", source_sha256):
        raise ValueError("SFI_RC_MANIFEST_SHA256_REQUIRED")
    try:
        case_id = str(UUID(case_id))
        cutoff = date.fromisoformat(as_of_date)
        window = manifest["run_window"]
        start, end = date.fromisoformat(window["start"]), date.fromisoformat(window["end"])
    except (KeyError, ValueError, TypeError) as error:
        raise ValueError("SFI_RC_INVALID_TEMPORAL_INPUT") from error
    if window.get("timezone") != "America/Mexico_City" or window.get("days") != 90:
        raise ValueError("SFI_RC_MANIFEST_WINDOW_UNEXPECTED")
    if start != date(2026, 10, 20) or end != date(2027, 1, 17):
        raise ValueError("SFI_RC_REANCHORED_MASTER_REQUIRED")
    if (end - start).days != 89 or cutoff < start or cutoff > end:
        raise ValueError("SFI_RC_AS_OF_OUTSIDE_RECONSTRUCTION")
    days = manifest.get("days")
    if not isinstance(days, list) or len(days) != 90:
        raise ValueError("SFI_RC_MANIFEST_90_DAYS_REQUIRED")

    rows = []
    for i, day in enumerate(days, 1):
        expected = start + timedelta(days=i-1)
        if (not isinstance(day, dict) or day.get("day_index") != i
                or day.get("date_local") != expected.isoformat()):
            raise ValueError("SFI_RC_MANIFEST_DAY_SEQUENCE_INVALID")
        publication = day.get("publication")
        receipt = day.get("execution_receipt")
        if not isinstance(publication, dict) or not isinstance(receipt, dict):
            raise ValueError("SFI_RC_MANIFEST_RECEIPT_REQUIRED")
        mode = publication.get("mode")
        if mode not in ("NO_PUBLICATION", "DRAFT_UNTIL_ALL_GATES_PASS"):
            raise ValueError("SFI_RC_MANIFEST_PUBLICATION_MODE_UNKNOWN")
        if day.get("epistemic_status") not in (
            "PROPOSED_NOT_EXECUTED", "OBSERVED_DRAFT_ASSET_EXISTENCE_NOT_PUBLISHED"
        ):
            raise ValueError("SFI_RC_UNRECOGNIZED_EPISTEMIC_STATUS")
        elapsed = expected <= cutoff
        draft = (day.get("epistemic_status") ==
                 "OBSERVED_DRAFT_ASSET_EXISTENCE_NOT_PUBLISHED")
        if draft and (mode != "NO_PUBLICATION" or
                      publication.get("state") != "DRAFT_MEDIA_CREATED_NOT_PUBLISHED" or
                      receipt.get("state") != "CREATIVE_ASSET_CREATED_ONLY"):
            raise ValueError("SFI_RC_DRAFT_RECEIPT_CONTRADICTION")
        if not elapsed:
            contrast = "NOT_DUE"
        elif draft:
            contrast = "SOURCE_DECLARED_DRAFT_NO_PUBLICATION_RECEIPT"
        elif mode == "NO_PUBLICATION":
            contrast = "NO_PUBLICATION_PLANNED_ACTIVITY_UNVERIFIED"
        else:
            contrast = "UNKNOWN_NO_PLATFORM_COVERAGE"
        # A link asserted by a manifest is never an independently checked post.
        platform_claim = bool(publication.get("published_post_url") or
                              receipt.get("platform_verification_at"))
        rows.append({
            "day": i,
            "dateLocal": expected.isoformat(),
            "activity": day.get("activity"),
            "publicationMode": mode,
            "contrast": contrast,
            "sourceAssertion": day.get("epistemic_status"),
            "platformClaimInManifest": platform_claim,
            "independentlyVerifiedPublication": False,
            "sourcePointer": f"drive:{source_id}#/days/{i-1}",
        })

    elapsed_rows = [r for r in rows if r["dateLocal"] <= cutoff.isoformat()]
    return {
        "contract": OUT_CONTRACT,
        "caseId": case_id,
        "provenance": {
            "sourceType": "DRIVE_MANIFEST",
            "sourceId": source_id,
            "sourceVersion": EXPECTED_VERSION,
            "sourceSha256": source_sha256,
            "sourceURL": f"https://drive.google.com/file/d/{source_id}/view",
            "epistemicBoundary": "SOURCE_DECLARATIONS_ONLY_NOT_ADMITTED_EVIDENCE",
        },
        "t0": {"dateLocal": start.isoformat(),
               "kind": "PLANNED_BASELINE_NOT_OBSERVED_WORLD"},
        "t1": {"dateLocal": cutoff.isoformat(),
               "kind": "READ_ONLY_AS_OF_PREVIEW_NOT_PERSISTED_CASE_RECONSTRUCTION"},
        "counts": {
            "manifestDays": len(rows),
            "elapsedDays": len(elapsed_rows),
            "futureDays": len(rows)-len(elapsed_rows),
            "noPublicationPlanned": sum(r["publicationMode"] == "NO_PUBLICATION" for r in rows),
            "conditionalPublicationDays": sum(
                r["publicationMode"] == "DRAFT_UNTIL_ALL_GATES_PASS" for r in rows),
            "elapsedConditionalPublicationDays": sum(
                r["publicationMode"] == "DRAFT_UNTIL_ALL_GATES_PASS" for r in elapsed_rows),
            "sourceDeclaredDraftDays": sum(
                r["contrast"] == "SOURCE_DECLARED_DRAFT_NO_PUBLICATION_RECEIPT"
                for r in elapsed_rows),
            "independentlyVerifiedPublications": 0,
            "sourceClaimedPlatformPosts": sum(r["platformClaimInManifest"] for r in elapsed_rows),
        },
        "readiness": {
            "caseWritePerformed": False,
            "sourceAdmitted": False,
            "t0T1Certified": False,
            "returnVerified": False,
            "passportPersisted": False,
            "externalPlatformCoverage": "NOT_ESTABLISHED",
        },
        "timeline": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, help="Downloaded original JSON; never upload it to public CI")
    parser.add_argument("--source-id", required=True, help="Drive source file ID")
    parser.add_argument("--case-id", required=True, help="Existing case UUID")
    parser.add_argument("--as-of-date", required=True, help="Explicit case cutoff YYYY-MM-DD")
    parser.add_argument("--output", help="Optional offline preview JSON path")
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw)
    preview = reconstruct(
        manifest, source_id=args.source_id, source_sha256=hashlib.sha256(raw).hexdigest(),
        case_id=args.case_id, as_of_date=args.as_of_date)
    encoded = json.dumps(preview, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    if args.output:
        destination = Path(args.output)
        if destination.resolve() == manifest_path.resolve():
            raise ValueError("SFI_RC_SOURCE_OVERWRITE_FORBIDDEN")
        destination.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")


if __name__ == "__main__":
    main()
