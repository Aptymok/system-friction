# SFI Web Analytics and Discovery Contract

Status: operational contract
Updated: 2026-07-12
Canonical origin: https://systemfriction.org

## Google Analytics 4

Property stream name: System Friction Institute
Stream URL: https://systemfriction.org
Stream ID: 15241815536
Measurement ID: G-7YKTPLX3QD

The site loads the GA4 tag from the root layout and sends explicit client-side page views for App Router navigation. Automatic page-view emission is disabled in the gtag configuration to prevent duplicate page views.

Advertising storage, ad user data and ad personalization are denied. Google signals and ad-personalization signals are disabled.

## Allowed analytics events

- page_view
- navigation_click
- hub_open
- field_flow_start
- field_step_complete
- field_return_open
- evidence_intake_start
- reference_case_open
- instrument_status_open
- contact_intent

## Forbidden analytics payloads

Never send:

- names;
- email addresses;
- telephone numbers;
- user IDs or actor IDs;
- participant objectives;
- participant narratives;
- evidence text;
- Studio content;
- audit payloads;
- search text or free-form queries;
- authentication or service-role information.

The shared analytics client discards a forbidden parameter-key list. Product code must still use categorical values only.

## Measurement Protocol

No Measurement Protocol secret is stored in the repository, client bundle or public environment variables. A future server-side Measurement Protocol integration must use a server-only secret, validate a strict event allowlist and reject free text or private identifiers.

## Google Search Console

The root metadata retains the Google verification token already associated with the canonical domain. The canonical origin, sitemap and robots files point exclusively to https://systemfriction.org.

Submit this sitemap in Search Console:

https://systemfriction.org/sitemap.xml

Expected public machine resources:

- /robots.txt
- /sitemap.xml
- /llms.txt
- /llms-full.txt
- /ai-index.json
- /field-schema.json
- /manifest.webmanifest

## Index boundaries

Indexable:

- institutional home;
- Observatory;
- World Vector;
- FIELD and public participant material;
- MOP-H;
- ScoreFriction public surfaces;
- Repository;
- Library;
- privacy and contact.

Not indexable:

- ROOT;
- Studio;
- operator surfaces;
- API routes;
- private settings;
- telemetry;
- private memory;
- authenticated evidence or case payloads.

AI crawlers receive the same private-path exclusions as general crawlers. Public LLM files describe contracts and interpretation limits; they do not grant access to private runtime state.

## Verification checklist after deployment

1. Open the deployed page source and confirm `G-7YKTPLX3QD` appears once.
2. Open GA4 Realtime and visit `/`, `/observatory`, `/field` and `/repository`.
3. Confirm one page_view per route transition.
4. Confirm navigation_click contains only destination, link_label and source_path.
5. Confirm DebugView does not contain participant text, email, actor ID or evidence.
6. Open `/robots.txt` and verify private prefixes are disallowed.
7. Open `/sitemap.xml` and verify only public routes appear.
8. Validate `/ai-index.json` and `/field-schema.json` as JSON.
9. In Search Console, inspect the canonical homepage and submit the sitemap.
10. Do not create a Measurement Protocol secret until a server-only ingestion contract exists.
