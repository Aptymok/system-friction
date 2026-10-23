#!/usr/bin/env python3
"""Read-only, tenant-scoped GitHub provenance collector for Reality Chain.

This produces candidate RECORD objects, not admitted EVIDENCE or certified RETURN.
No network writes, case mutations, or automatic authority promotion.
"""
import argparse
import hashlib
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone


def normalize_commit(source_id, repository, commit):
    sha = commit["sha"]
    raw = commit["commit"]
    subject = raw.get("message", "").splitlines()[0]
    return {
        "kind": "RECORD",
        "canonicalRef": {"id": "github-commit:" + repository + ":" + sha, "version": "1.0"},
        "sourceId": source_id,
        "source": {"type": "github_commit", "repository": repository, "sha": sha,
                   "url": commit.get("html_url")},
        "observed": {"timestamp": raw["committer"]["date"], "subject": subject,
                     "declaredAuthor": raw["author"].get("name")},
        "epistemicStatus": "SOURCE_METADATA_ONLY",
        "authority": "UNVERIFIED",
        "returnStatus": "NOT_ASSESSED",
    }


def collect(repository, source_id, token=None, max_pages=10):
    if not repository or len(repository.split("/")) != 2:
        raise ValueError("repository must be owner/name")
    owner, name = repository.split("/")
    for part in (owner, name):
        if not part.replace("-", "").replace("_", "").replace(".", "").isalnum():
            raise ValueError("invalid GitHub repository")
    for page in range(1, max_pages + 1):
        url = ("https://api.github.com/repos/" + repository +
               "/commits?per_page=100&page=" + str(page))
        headers = {"Accept": "application/vnd.github+json",
                   "User-Agent": "sfi-reality-chain-provenance/0.1"}
        if token:
            headers["Authorization"] = "Bearer " + token
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
            commits = json.load(response)
        if not isinstance(commits, list):
            raise ValueError("unexpected GitHub response")
        for commit in commits:
            yield normalize_commit(source_id, repository, commit)
        if len(commits) < 100:
            break


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", required=True)
    parser.add_argument("--source-id", required=True, help="Case-local source identifier")
    parser.add_argument("--output", required=True, help="Local JSONL output path")
    parser.add_argument("--max-pages", type=int, default=10)
    args = parser.parse_args()
    if args.max_pages < 1 or args.max_pages > 100:
        parser.error("--max-pages must be 1..100")
    records = list(collect(args.repository, args.source_id,
                           os.environ.get("GITHUB_TOKEN"), args.max_pages))
    # Stable SHA-derived IDs permit idempotent upserts by a separately governed adapter.
    with open(args.output, "w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
    print(json.dumps({"repository": args.repository, "records": len(records),
                      "output": args.output, "mode": "READ_ONLY",
                      "truncatedPossible": len(records) == args.max_pages * 100}))


if __name__ == "__main__":
    main()
