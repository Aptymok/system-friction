# ROOT World Case and Discovery Engine

## Institutional objective

ROOT must operate as the founder's initial attention surface and as an autonomous observation-to-action system. The same architecture supports two directions:

1. outbound observation: discover recent public crises compatible with an SFI intervention;
2. inbound discovery: publish selected evidence and make SFI, its founder, methods and cases legible to people who may propose work, research, collaboration or funding.

The system must not fabricate companies, people, emails, pain, evidence or outcomes.

## Daily world case contract

A candidate case may enter `QUALIFIED` only when all conditions are true:

- documented event is no more than 120 days old;
- named actor or organization is verifiable;
- at least one primary/official source or two independent credible sources exist;
- pain is expressed as an operational break, not as generic sentiment;
- a current SFI offer or bounded intervention can be mapped;
- total qualification confidence is at least 0.85.

Required output:

- what happened;
- what hurt and where continuity broke;
- actor and affected nodes;
- evidence and provenance;
- intervention already implemented, when present;
- projected intervention success;
- relapse probability and causes;
- what SFI can do now;
- next verification condition;
- uncertainty and refutation criteria.

## Required agents

### WorldSignalObserverAgent
Reads authorized public sources and stores candidate signals with time, actor and source lineage.

### CrisisQualificationAgent
Applies the 120-day window, evidence threshold and >=0.85 confidence gate.

### ActorResolverAgent
Resolves legal/commercial entity, sector, official domain and relevant decision role. Person names remain null unless publicly verified.

### PainResolverAgent
Converts evidence into an observed/inferred/unverified pain statement, affected nodes and severity.

### InterventionTrackingAgent
Determines whether the actor implemented a response and separates announcement, mitigation and material execution.

### RelapseProjectionAgent
Produces a falsifiable projection of whether the failure is likely to recur and why.

### SFIProposalAgent
Maps the case to a bounded SFI offer, minimum intervention, expected evidence and decision role.

### CaseMethodExecutionAgent
Executes the SFI methodology on selected cases and persists the complete trace.

### CaseCoverImageAgent
Produces an image-generation brief using the SFI visual contract. It must not invent generated image bytes when no image provider exists.

### PdfAssemblyAgent
Builds the private case brief from verified case data, generated/approved cover and proposal content.

### PrivateRepositoryAgent
Stores versions, lineage and access metadata. Assets are private and ROOT-only by default.

### AuthorityPublishingAgent
Transforms approved private cases into bounded public artifacts without leaking private evidence.

### SearchPresenceAgent
Maintains canonical URLs, author/organization structured data, internal links and indexability.

### DistributionAgent
Creates channel-specific drafts from one canonical SFI publication; it never publishes without approval.

### InboundOpportunityAgent
Classifies contact, form, citation, subscription and repeat-visit signals without deanonymizing visitors unlawfully.

### ProjectExecutionManagerAgent
Builds the initial attention queue and pressures closure: evidence overdue, case without decision, degraded surface, sleeping agent, unreviewed draft or missing outcome.

## Case states

`DISCOVERED -> QUALIFICATION -> QUALIFIED -> METHODOLOGY_READY -> PROPOSAL_READY -> CONTACT_READY -> CONTACTED -> FOLLOW_UP -> WON | LOST | MONITOR | CLOSED`

Every state transition requires an event entry and actor identity.

## ROOT interaction model

The initial ROOT window must show:

- new proposed cases;
- evidence pending and evidence older than 48 hours;
- full-site surface health;
- inactive, blocked or degraded agents;
- open governance decisions;
- publications/drafts awaiting approval;
- inbound signals requiring classification;
- next action selected by ProjectExecutionManagerAgent.

Clicking an attention item must move within the existing ROOT console, not open a parallel application.

## Attractor/evidence field

The attractor view must display related nodes by semantic role and urgency:

- evidence;
- missing evidence request;
- strategy;
- task;
- prediction;
- outcome;
- publication;
- contact;
- asset.

Visual contract:

- solid circle: verified evidence;
- hollow circle: requested/missing evidence;
- diamond: strategy or intervention;
- square: task;
- triangle: prediction;
- ring: outcome;
- red/orange: overdue or blocking;
- gold: ready for founder decision;
- grey: closed/archived;
- line thickness: relationship confidence.

## Site health contract

Each surface must return:

- route accessibility;
- primary data dependency status;
- last successful observation;
- last error;
- affected components/agents;
- suggested diagnostic action.

Minimum surfaces:

- ROOT;
- Studio;
- Field;
- Field / Map;
- Observatory;
- Library / private repository;
- commercial conversion;
- cognitive runtime;
- evidence graph;
- predictive engine;
- publishing/indexing.

`OK` requires both view and core data dependency. A rendered shell with failed data is `ATTENTION`.

## Private asset contract

Generated case assets must store:

- case id;
- version;
- asset type;
- private storage path;
- source evidence ids;
- generation prompt/brief;
- model/provider when applicable;
- generated at;
- approved by/at;
- publication state.

No private asset becomes public through the generation operation.

## SFI cover identity brief

Base image brief:

> Refined high-end editorial cover for a System Friction Institute case brief. Deep black field, restrained warm-gold illumination, precise institutional geometry and a central real-world operational metaphor. Show signal, structure, interruption and unresolved continuity without using dashboard UI, infographic blocks, logos from the observed company or unverified claims. Minimal, sovereign, contemporary, cinematic, evidence-oriented. No visible text unless typography is added later by the document renderer.

The case-specific prompt adds only verified domain and rupture details.

## Public discovery contract

The public site becomes a beacon through permanent, indexable objects:

- `/cases/[slug]`;
- `/phenomena/[slug]`;
- `/methods/[slug]`;
- `/research/[slug]`;
- `/people/juan-antonio-marin-liera`;
- `/work-with-sfi`;
- `/collaborate`.

Every public object requires canonical metadata, organization identity, author identity, evidence boundary, update date and one unambiguous next relationship action.

## Acceptance criteria

1. Daily execution cannot create a qualified case older than 120 days.
2. Confidence below 0.85 cannot produce `QUALIFIED`.
3. An article without a verified actor remains a signal, not a case.
4. ROOT shows all urgent evidence and degraded surfaces on entry.
5. Clicking a priority reaches the corresponding existing ROOT layer.
6. A rendered page with a failed core API appears as `ATTENTION`.
7. ProjectExecutionManagerAgent returns a ranked closure queue, not only counts.
8. Selected cases can run methodology and produce versioned private assets.
9. PDF and image generation preserve evidence lineage and human approval.
10. Public distribution cannot expose private evidence or publish automatically.
11. Inbound signals are attributable to their public interaction source without unlawful tracking.
12. Outcomes recalibrate future case, contact and intervention probabilities.
