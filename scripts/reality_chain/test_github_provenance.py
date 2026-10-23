import unittest
from scripts.reality_chain.github_provenance import normalize_commit, collect


class GitHubProvenanceTests(unittest.TestCase):
    def test_stable_case_scoped_source(self):
        commit = {"sha": "abc123", "html_url": "https://github.com/org/repo/commit/abc123",
                  "commit": {"message": "Fix deployment\nMore context",
                             "committer": {"date": "2026-03-01T00:00:00Z"},
                             "author": {"name": "Example"}}}
        first = normalize_commit("case-A", "org/repo", commit)
        second = normalize_commit("case-B", "org/repo", commit)
        self.assertNotEqual(first["canonicalRef"], second["canonicalRef"])
        self.assertEqual(first["canonicalRef"], normalize_commit("case-A", "org/repo", commit)["canonicalRef"])
        self.assertNotEqual(first["sourceId"], second["sourceId"])
        self.assertEqual(first["kind"], "RECORD")
        self.assertEqual(first["authority"], "UNVERIFIED")
        self.assertEqual(first["returnStatus"], "NOT_ASSESSED")
        self.assertEqual(first["observed"]["subject"], "Fix deployment")

    def test_rejects_invalid_repo(self):
        with self.assertRaises(ValueError):
            list(collect("invalid", "case-A"))


if __name__ == "__main__":
    unittest.main()
