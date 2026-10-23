import unittest
from governed_case_sync import synchronize, to_case_action, validate_endpoint

SAMPLE = {
    "kind": "RECORD",
    "canonicalRef": {"id": "github-commit:tenant-a:acme/repo:" + "a" * 40, "version": "1.0"},
    "sourceId": "tenant-a", "source": {"type": "github_commit", "repository": "acme/repo"},
    "observed": {"timestamp": "2026-10-23T00:00:00Z"},
    "epistemicStatus": "SOURCE_METADATA_ONLY",
}

class GovernedCaseSyncTests(unittest.TestCase):
    def test_routes_to_requested_case_without_implicit_sfi(self):
        captured = []
        def send(action):
            captured.append(action)
            return {"ok": True, "operation": "add_object"}
        count = synchronize([SAMPLE], case_id="other-company-case",
            endpoint="https://example.org/api/external/v1/cases", token="bound-token", transport=send)
        self.assertEqual(count, 1)
        self.assertEqual(captured[0]["caseId"], "other-company-case")
        self.assertEqual(captured[0]["kind"], "RECORD")
        self.assertEqual(captured[0]["payload"]["authority"], "UNVERIFIED")
        self.assertEqual(captured[0]["payload"]["returnStatus"], "NOT_ASSESSED")

    def test_rejects_authority_promotion(self):
        for invalid in (dict(SAMPLE, kind="EVIDENCE"), dict(SAMPLE, epistemicStatus="CANONICAL")):
            with self.assertRaises(ValueError):
                to_case_action(invalid, "case")

    def test_requires_https_and_oauth(self):
        with self.assertRaises(ValueError):
            validate_endpoint("http://example.org/api/external/v1/cases")
        with self.assertRaises(ValueError):
            synchronize([SAMPLE], case_id="case",
                endpoint="https://example.org/api/external/v1/cases", token="")

    def test_rejected_transport_stops(self):
        with self.assertRaises(RuntimeError):
            synchronize([SAMPLE], case_id="case",
                endpoint="https://example.org/api/external/v1/cases", token="token",
                transport=lambda _: {"ok": False})

if __name__ == "__main__":
    unittest.main()
