# System Friction Institute

## Live observability, evidence, falsification, governance and governed AI interaction

System Friction Institute (SFI) is an experimental institutional observability environment for complex sociotechnical systems. The current frontend is not organized as a conventional dashboard. It is a set of live scenes where the observed object remains central and evidence, provenance, trajectories, authority, temporal state and agent activity are rendered around it.

Canonical host: `https://systemfriction.org`

The operating principle is simple: observation, evidence, inference, authorization, execution, return and memory must remain distinguishable and traceable.

## Public live scenes

- `/field` — geospatial and multiscale observation field.
- `/systems` — system boundaries, relations, exchange, state and persistence.
- `/archive` — source, archive, indexing, provenance and context loss.
- `/falsification` — hypotheses, instruments, longitudinal series, thresholds and rival explanations.
- `/optionality` — reserve, memory, redundancy, reversibility and open futures.
- `/governance` — canonical governance cycle from observation to memory.
- `/authority` — authority, evidence and recovery as longitudinal variables.
- `/agents` — agentic authority envelope: identity, scope, tools, time, consequence and return.
- `/identity` — task, profession, identity, machine capability and context.
- `/models` — observable generative-model processes.
- `/genai` — operational anatomy of a governed GenAI application.
- `/root` — governed operator surface; authorization required.

The visual runtime is designed so that ambient motion, system motion and operator interaction remain distinct. Movement is not only decorative: live events, persistence, decay, execution and return can alter the scene.

## Cognitive Twin

The Cognitive Twin is a governed reconstruction and proposal system. It can use longitudinal evidence, state snapshots, decision traces and laboratory results to generate proposals in normal operator-readable language.

The Twin does not automatically become decision authority. ROOT can accept, reject or request additional evidence. Proposal, authorization, execution and canonical promotion remain separate states.

## Governed external AI API

SFI exposes a scoped machine interface so authorized AI clients can interact with the institute without bypassing governance.

Capability discovery:

`GET /api/external/v1/manifest`

Governed operations:

- `POST /api/external/v1/observe`
- `POST /api/external/v1/propose`
- `POST /api/external/v1/execute`
- `POST /api/external/v1/lab`

Credentials are user-managed Bearer tokens with explicit scopes. A client can only perform the capabilities granted to its credential. Laboratory execution can require delegated ROOT authority and confirmation. Experimental outputs do not self-promote into canonical truth.

## GitHub ↔ SFI Laboratory Bridge

GitHub repositories can operate as auditable laboratory clients of SFI through GitHub Actions. A repository stores only its own `SFI_LAB_BRIDGE_TOKEN` and the canonical `SFI_LAB_BRIDGE_BASE_URL`. SFI validates the token through its deployment-side `SFI_EXTERNAL_API_KEYS_JSON` registry.

The bridge supports reading laboratory state and reports, persisting governed records and executing supported Method Lab runtimes when the delegated credential permits it. Commands and responses are retained as GitHub Actions artifacts with provenance.

This creates an auditable control path:

`AI / operator → GitHub → GitHub Actions → SFI external gateway → Method Lab / runtime → provenance → artifact`

## Machine-readable discovery

SFI publishes dedicated machine-facing resources so search engines and AI systems can discover the current architecture without inferring it from obsolete pages:

- `/llms.txt` — compact AI orientation.
- `/llms-full.txt` — extended machine-readable architecture.
- `/ai-index.json` — structured public index of scenes, machine interfaces and governance.
- `/ai-policy` — epistemic, privacy and external-agent policy.
- `/field-schema.json` — public evidence schema.
- `/api/external/v1/manifest` — current external-agent capability manifest.
- `/robots.txt` — crawler policy.
- `/sitemap.xml` — canonical public discovery map.

## Epistemic boundary

SFI distinguishes at minimum between observed, derived, inferred, experimental and canonical states. These states are not interchangeable.

Runtime capability is not empirical validation. A model output is not canonical merely because it was computed. A laboratory result remains experimental until a separate governed process changes its epistemic state. Consequential claims should preserve provenance, observation time and evidence lineage.

Private ROOT state, credentials, account memory, protected evidence and non-public laboratory records are not public evidence.

## Repository architecture

The frontend and backend are deliberately separated. Live scenes consume existing APIs through the application runtime rather than redefining backend contracts around visual components.

Important areas include:

- `src/app/` — Next.js routes, public scenes and machine-readable surfaces.
- `src/components/sfi/` — live scene runtime and scene-specific cinematic instrumentation.
- `src/app/api/` — server-side API and operational contracts.
- `src/core/` — cognitive and institutional core.
- `src/agents/` — agent implementations and supporting logic.
- `src/runtime/` — runtime execution infrastructure.
- `lab-bridge/` — GitHub ↔ SFI laboratory bridge documentation and command surface.
- `.github/workflows/sfi-github-lab-bridge.yml` — auditable GitHub Actions bridge.

Legacy visual dashboards are not maintained as a second frontend. Historical route aliases may redirect into the current live-scene system, but the canonical public architecture is the scene set documented above.

## Citation and research release metadata

Repository-level citation metadata lives in `CITATION.cff`. Its software version is synchronized with `package.json`; cite the exact version or commit actually used rather than treating every commit as a scholarly release.

Canonical references:

- software repository: `https://github.com/Aptymok/system-friction`;
- institutional landing page: `https://systemfriction.org`.

No DOI, ORCID or ROR identifier is emitted from repository citation metadata unless it has been independently verified. A GitHub tag, commit or package version is not represented as a Zenodo deposit or DOI-backed release without an external registry receipt.

Zenodo may consume `CITATION.cff` directly. This repository intentionally does not add `.zenodo.json` until Zenodo-specific metadata—especially deposit licensing and any external identifiers—has a verified source, because `.zenodo.json` overrides `CITATION.cff` during GitHub release archiving.

## Local execution

```bash
npm install
npm run dev
```

Verification and build:

```bash
npm run typecheck
npm run build
```

Additional institutional QA scripts are defined in `package.json` and GitHub Actions.

## Fundamental statement

SFI does not attempt to automate reality into a single score or narrative. It builds observable structures around systems that change through time, preserving enough evidence and return paths to inspect how an interpretation or action was produced.
