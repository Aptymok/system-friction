# WS-05 · RESEARCH GRAPH

**Mission:** establish a coherent scholarly/research identity graph for SFI outputs without fabricating institutional identifiers, DOI state, authorship or publication status.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing owners to inspect

Before implementation inspect:

- README publication/citation sections;
- existing paper/manuscript metadata;
- MIHM/MOP-H/SFS method pages/data/docs;
- any current `CITATION.cff`, `.zenodo.json`, BibTeX or citation exports;
- public Library/document catalog;
- conference/publication records;
- author metadata already present in repo/public pages.

Never infer a DOI/ORCID/ROR identifier that has not been observed.

## 2. Target graph

```text
PERSON
  │
ORCID
  │
WORK ─── DOI
  │       │
  └── SFI canonical landing page
          │
          ├─ GitHub/software
          ├─ dataset
          ├─ references
          ├─ conference
          └─ affiliation metadata
```

Institutional ROR is a later readiness outcome, not a bootstrap assumption.

## 3. Required functional slices

### Slice A — Repository citation metadata

Implement or complete:

```text
CITATION.cff
release citation guidance
method/software version citation
```

Metadata must use real authors, title, repository and version information.

### Slice B — Zenodo readiness

Prepare repository metadata needed for GitHub ↔ Zenodo integration.

Durable DOI candidate classes:

```text
MIHM methodological release
MOP-H release
stable public dataset
methodological report
major software release
white paper
```

Non-DOI defaults:

```text
minor commit
individual internal observation
LinkedIn/Medium post
ordinary operational report
```

Do not claim a DOI until Zenodo/another registry actually returns one.

### Slice C — Research Object Registry

Create a structured owner/projection for research outputs with:

```text
canonical object ref
title
authors
affiliation
publication type
version
public landing page
DOI nullable
ORCID refs nullable
conference/journal/venue
citation metadata
software/data relations
external URLs
verification state
```

Prefer absorbing WS-03 canonical objects rather than creating duplicate publication objects.

### Slice D — ORCID relationship preparation

For each real researcher/publication:

- record researcher name;
- ORCID only if verified;
- canonical work relation;
- DOI if real;
- SFI relationship/affiliation only where factually supportable.

External ORCID mutation/account actions remain human/authorized-external operations.

### Slice E — ROR Readiness

Expose readiness indicators, not a fake ID:

```text
number of durable research outputs
number of distinct researchers
doi-backed outputs
external affiliation occurrences
conference/publication evidence
persistent institutional identity evidence
```

State:

```text
NOT_READY
REVIEW
READY_FOR_REQUEST
REQUESTED
VERIFIED
```

Only a real external request/receipt advances the last states.

### Slice F — Scholar/OpenAlex/Semantic Scholar observation

These are discovery/indexing ecosystems, not normal publish APIs.

Build observation/check routines and metadata quality, not fake push integrations.

Record whether a work is found, attributed and linked correctly.

### Slice G — ResearchGate

Treat as external representation/network node.

No canonical content ownership.

### Slice H — Conference propagation record

Each formal conference output should be able to link:

```text
conference record
paper
DOI if applicable
slides
GitHub release
SFI landing page
LinkedIn representation
Medium interpretation
video
```

Do not create missing external artifacts merely to fill the graph.

## 4. Shared identity rules

Canonical institution:

```text
System Friction Institute
https://systemfriction.org
```

Authors are people. SFI is not assigned a fictional ORCID.

No ROR until eligibility/evidence is sufficient and a real record exists.

## 5. Dependencies

Consumes:

- WS-03 canonical object/public landing page schema;
- WS-07 verified external identity nodes;
- existing publications and GitHub releases.

Can begin immediately with citation inventory and `CITATION.cff` preparation.

## 6. Forbidden outcomes

- invented DOI;
- invented ORCID;
- invented ROR;
- SFI represented as a person/researcher;
- every commit minted as scholarly output;
- Crossref membership/integration implied when absent;
- duplicate publication canonical objects competing with WS-03;
- ResearchGate/Zenodo treated as canonical owner;
- academic-index absence represented as proof of nonexistence.

## 7. QA / integrity checks

Must verify:

1. `CITATION.cff` parses and references actual project metadata;
2. each DOI emitted publicly exists and resolves or is explicitly pending/not emitted;
3. ORCID values are syntactically valid and verified before canonical exposure;
4. no ROR is emitted before verification;
5. publication landing pages and citation metadata point to same canonical work;
6. author/institution roles are not conflated;
7. scholarly metadata remains synchronized with version/release state.

## 8. Definition of done

WS-05 is complete when SFI has valid repository citation metadata, Zenodo-ready release metadata, a non-duplicative research output graph, verified author identifier relations, ROR readiness rather than fictional ROR state, and observable scholarly-index propagation.

## 9. Handoff

```text
BASE SHA
BRANCH
CITATION STATE
ZENODO READINESS
DOI CANDIDATES
VERIFIED DOI/ORCID IDS
ROR READINESS
INDEX OBSERVATIONS
CONTRACT DELTAS
QA
PR
EXTERNAL HUMAN ACTIONS NEEDED
NEXT SAFE ACTION
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-05 · RESEARCH GRAPH**.

Work from fresh `Aptymok/system-friction` plus the canonical program documents and `docs/program/workstreams/WS-05-RESEARCH-GRAPH.md`. Inspect current publication/method/citation metadata first.

Implement the complete current research graph: valid `CITATION.cff`, Zenodo-ready release metadata, a canonical non-duplicative research-output projection, verified ORCID relationships, DOI candidate/receipt handling, ROR readiness, scholarly-index observations and conference propagation relations. Never invent a DOI, ORCID, ROR, publication or affiliation. External accounts/registrations remain observed external state.

Coordinate canonical public objects with WS-03 and external identity with WS-07 through SFI-00. You may branch/commit/open PRs but not merge. Execute metadata/QA/typecheck/build checks and leave durable handoff state.

Proceed from actual repository state now.
