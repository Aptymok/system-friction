"""Governed multi-tenant Reality Chain intake.

SFI, other organizations and individual users all provide their own case ID,
source scope and user-bound OAuth authorization. The Case Platform, not this
client, decides tenant membership and object admission.
"""
import argparse
import json
import os
import urllib.error
import urllib.parse
import urllib.request


def validate_endpoint(endpoint):
    parsed = urllib.parse.urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("HTTPS Case Platform endpoint required")
    if parsed.path.rstrip("/") != "/api/external/v1/cases" or parsed.query or parsed.fragment:
        raise ValueError("Use /api/external/v1/cases without query parameters")
    return endpoint


def to_case_action(candidate, case_id):
    if candidate.get("kind") != "RECORD":
        raise ValueError("Only unpromoted RECORD metadata may be synchronized")
    if candidate.get("epistemicStatus") != "SOURCE_METADATA_ONLY":
        raise ValueError("Source metadata boundary required")
    ref = candidate.get("canonicalRef") or {}
    if not ref.get("id") or not candidate.get("sourceId"):
        raise ValueError("Source-scoped canonical reference required")
    return {
        "operation": "add_object", "caseId": case_id, "kind": "RECORD",
        "canonicalRef": ref, "observedAt": candidate.get("observed", {}).get("timestamp"),
        "payload": {
            "sourceId": candidate["sourceId"],
            "source": candidate.get("source", {}),
            "observed": candidate.get("observed", {}),
            "epistemicStatus": "SOURCE_METADATA_ONLY",
            "authority": "UNVERIFIED", "returnStatus": "NOT_ASSESSED"
        },
    }


def synchronize(records, *, case_id, endpoint, token, transport=None):
    validate_endpoint(endpoint)
    if not case_id or not token:
        raise ValueError("Case ID and user-bound OAuth token are required")

    def submit(action):
        request = urllib.request.Request(
            endpoint, data=json.dumps(action).encode("utf-8"), method="POST",
            headers={"Authorization": "Bearer " + token,
                     "Content-Type": "application/json",
                     "User-Agent": "SFI-Reality-Chain/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    send = transport or submit
    accepted = 0
    for record in records:
        response = send(to_case_action(record, case_id))
        if response.get("ok") is not True or response.get("operation") != "add_object":
            raise RuntimeError("Case Platform rejected or did not acknowledge the record")
        accepted += 1
    return accepted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="GitHub provenance JSONL file")
    parser.add_argument("--case-id", required=True, help="Existing case belonging to OAuth principal")
    parser.add_argument("--endpoint", required=True, help="Your SFI Case Platform HTTPS endpoint")
    args = parser.parse_args()
    token = os.environ.get("SFI_CASE_OAUTH_TOKEN", "")
    if not token:
        parser.error("SFI_CASE_OAUTH_TOKEN (user-bound, cases:write) required")
    with open(args.input, encoding="utf-8") as stream:
        records = [json.loads(line) for line in stream if line.strip()]
    count = synchronize(records, case_id=args.case_id, endpoint=args.endpoint, token=token)
    print(json.dumps({"ok": True, "recordCount": count, "evidencePromoted": False, "returnCertified": False}))


if __name__ == "__main__":
    main()
