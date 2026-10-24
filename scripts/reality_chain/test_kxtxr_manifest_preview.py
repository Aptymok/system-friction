"""Synthetic contract tests: no real KXTXR assets or secrets committed."""
import copy
from datetime import date, timedelta
import unittest

from kxtxr_manifest_preview import reconstruct

SOURCE_ID = "SFI_TEST_MANIFEST_SOURCE_12345"
CASE_ID = "00000000-0000-4000-8000-000000000003"
SHA = "a" * 64


def fixture():
    start = date(2026, 10, 20)
    days = []
    for i in range(90):
        local = (start + timedelta(days=i)).isoformat()
        is_draft = i == 1
        should_publish = (i % 7 in (0, 2)) and i >= 7
        days.append({
            "day_index": i+1,
            "date_local": local,
            "activity": "IMAGE_A" if should_publish else "BASELINE_PREP",
            "epistemic_status": ("OBSERVED_DRAFT_ASSET_EXISTENCE_NOT_PUBLISHED"
                                 if is_draft else "PROPOSED_NOT_EXECUTED"),
            "publication": {
                "mode": "DRAFT_UNTIL_ALL_GATES_PASS" if should_publish else "NO_PUBLICATION",
                "state": ("DRAFT_MEDIA_CREATED_NOT_PUBLISHED" if is_draft else
                          "PLANNED_ONLY" if should_publish else "NOT_APPLICABLE"),
                "published_post_url": None,
            },
            "execution_receipt": {
                "state": "CREATIVE_ASSET_CREATED_ONLY" if is_draft else "NOT_RUN",
                "platform_verification_at": None,
            },
        })
    return {
        "schema": "SFI_KXTXR_90D_EXECUTION_MANIFEST_V1",
        "version": "1.1.0",
        "run_window": {"start": start.isoformat(), "end": "2027-01-17",
                       "days": 90, "timezone": "America/Mexico_City"},
        "days": days,
    }


def inspect(document=None, as_of="2026-10-23"):
    return reconstruct(document if document is not None else fixture(),
                       source_id=SOURCE_ID, source_sha256=SHA,
                       case_id=CASE_ID, as_of_date=as_of)


class KxtxrPreviewTests(unittest.TestCase):
    def test_exact_case_cutoff_and_source_provenance(self):
        result = inspect()
        self.assertEqual(result["t0"]["dateLocal"], "2026-10-20")
        self.assertEqual(result["t1"]["dateLocal"], "2026-10-23")
        self.assertEqual(result["counts"]["manifestDays"], 90)
        self.assertEqual(result["counts"]["elapsedDays"], 4)
        self.assertEqual(result["counts"]["futureDays"], 86)
        self.assertEqual(result["timeline"][0]["contrast"],
                         "NO_PUBLICATION_PLANNED_ACTIVITY_UNVERIFIED")
        self.assertEqual(result["timeline"][1]["contrast"],
                         "SOURCE_DECLARED_DRAFT_NO_PUBLICATION_RECEIPT")
        self.assertEqual(result["timeline"][4]["contrast"], "NOT_DUE")
        self.assertFalse(result["readiness"]["caseWritePerformed"])
        self.assertFalse(result["readiness"]["passportPersisted"])
        self.assertEqual(result["provenance"]["sourceSha256"], SHA)

    def test_unobserved_future_publication_is_not_missed(self):
        result = inspect(as_of="2026-10-30")
        row = result["timeline"][8]
        self.assertEqual(row["contrast"], "NO_PUBLICATION_PLANNED_ACTIVITY_UNVERIFIED")
        row = result["timeline"][9]
        self.assertEqual(row["contrast"], "UNKNOWN_NO_PLATFORM_COVERAGE")
        self.assertEqual(result["counts"]["independentlyVerifiedPublications"], 0)

    def test_asserted_published_link_is_not_platform_receipt(self):
        doc = fixture()
        day = doc["days"][9]
        day["publication"]["published_post_url"] = "https://example.invalid/post"
        day["execution_receipt"]["platform_verification_at"] = "2026-10-29T19:00:00-06:00"
        result = inspect(doc, as_of="2026-10-30")
        self.assertEqual(result["timeline"][9]["contrast"],
                         "UNKNOWN_NO_PLATFORM_COVERAGE")
        self.assertTrue(result["timeline"][9]["platformClaimInManifest"])
        self.assertFalse(result["timeline"][9]["independentlyVerifiedPublication"])

    def test_preserve_secondary_legacy_counter_conflict_as_source_anomaly(self):
        doc = fixture()
        doc["memory_control"] = {
            "counter_rule": "day_index = (today_local - 2026-10-14).days + 1"
        }
        result = inspect(doc)
        self.assertEqual(result["t0"]["dateLocal"], "2026-10-20")
        self.assertIn(
            "LEGACY_COUNTER_2026_10_14_CONFLICTS_WITH_REANCHORED_RUN_WINDOW",
            result["provenance"]["sourceAnomalies"],
        )
        self.assertEqual(result["counts"]["elapsedDays"], 4)

    def test_reject_wrong_reanchoring_and_duplicate_dates(self):
        doc = fixture()
        doc["run_window"]["start"] = "2026-10-14"
        with self.assertRaisesRegex(ValueError, "REANCHORED"):
            inspect(doc)
        doc = fixture()
        doc["days"][1]["date_local"] = doc["days"][0]["date_local"]
        with self.assertRaisesRegex(ValueError, "SEQUENCE_INVALID"):
            inspect(doc)

    def test_reject_unrecognized_claims_and_draft_contradictions(self):
        doc = fixture()
        doc["days"][1]["publication"]["mode"] = "PUBLISHED"
        with self.assertRaisesRegex(ValueError, "PUBLICATION_MODE_UNKNOWN"):
            inspect(doc)
        doc = fixture()
        doc["days"][1]["execution_receipt"]["state"] = "PUBLISHED_VERIFIED"
        with self.assertRaisesRegex(ValueError, "DRAFT_RECEIPT_CONTRADICTION"):
            inspect(doc)

    def test_reject_bad_provenance_and_cutoff(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_ID"):
            reconstruct(fixture(), source_id="wrong", source_sha256=SHA,
                        case_id=CASE_ID, as_of_date="2026-10-23")
        with self.assertRaisesRegex(ValueError, "OUTSIDE_RECONSTRUCTION"):
            inspect(as_of="2026-10-19")
        with self.assertRaisesRegex(ValueError, "MANIFEST_VERSION"):
            doc = fixture()
            doc["version"] = "1.0.0"
            inspect(doc)

    def test_no_publication_quota_inferred_from_nonpublication_days(self):
        result = inspect(as_of="2026-10-26")
        first = result["timeline"][:7]
        self.assertTrue(all(row["publicationMode"] == "NO_PUBLICATION" for row in first))
        self.assertFalse(any(row["contrast"] == "MISSED" for row in result["timeline"]))


if __name__ == "__main__":
    unittest.main()
