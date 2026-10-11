# MIHM-T — Knight Capital (2012) official case

**Study class:** REAL_HISTORICAL_OFFICIAL_DOCUMENTATION
**Scientific role:** RETROSPECTIVE_RECONSTRUCTION_AND_CALIBRATION_ONLY
**Case:** SFI-MIHMT-KNIGHT-2012-SEC-001

The underlying incident is real and is reconstructed from official SEC and EDGAR materials. No synthetic measurements were added to this case. The source claims are the regulator's findings or the issuer's disclosures, not independent first-hand SFI telemetry.

## Primary sources

| ID | Document | First documented public date |
|---|---|---|
| SEC-RLP-67347 | SEC NYSE Retail Liquidity Program approval, Release 34-67347: https://www.sec.gov/rules-regulations/self-regulatory-organization-rulemaking/sr-nyse-2011-55 | July 10, 2012 (Federal Register) |
| KCG-8K-20120802 | Knight 8-K: https://www.sec.gov/Archives/edgar/data/1060749/000119312512332176/d391111d8k.htm | August 2, 2012 |
| KCG-EX-99.1-20120802 | Issuer Exhibit 99.1: https://www.sec.gov/Archives/edgar/data/1060749/000119312512332176/d391111dex991.htm | August 2, 2012 |
| KCG-8K-20120806 | Knight 8-K, financing: https://www.sec.gov/Archives/edgar/data/1060749/000119312512338098/d392396d8k.htm | August 6, 2012 |
| SEC-KNIGHT-70694 | SEC Administrative Order 34-70694: https://www.sec.gov/Archives/edgar/data/1569391/000119312513401173/d613486dex101.htm | October 16, 2013 |

## Findings and disclosure boundaries

The SEC order, dated October 16, 2013, records the dormant Power Peg software, uneven deployment on one of eight SMARS servers, 97 premarket internal reject emails, more than four million market executions in about 45 minutes, limited automated safeguards, and an incident response that made the problem worse. These are official retrospective findings about August 1, 2012, **not evidence publicly available to an external analyst on August 1, 2012**. The settlement order records acceptance without the respondent admitting or denying the findings, except jurisdiction.

Knight's August 2, 2012 issuer exhibit reports approximately $440 million pretax loss; the subsequent SEC order reports over $460 million. These are dated source claims and must not be silently merged. The August 6 filing describes $400 million in financing, not an additional loss.

## Executable source-vintage test

- Dossier: [SFI-MIHMT-KNIGHT-2012-OFFICIAL-DOSSIER.json](./SFI-MIHMT-KNIGHT-2012-OFFICIAL-DOSSIER.json)
- Read-only historical selector: `scripts/research/mihmt-knight-official.mjs`
- Tests: `scripts/research/mihmt-knight-official.test.mjs`

Run:

```bash
node scripts/research/mihmt-knight-official.mjs
node --test scripts/research/mihmt-knight-official.test.mjs
```

**August 1, 2012:** Public SEC program approval context only; not Knight-specific code details.
**August 3, 2012:** August 2 issuer disclosure available; no later regulator root-cause report.
**October 17, 2013:** Complete five-source retrospective documentary reading available.

All figures retain original units and comparison operators (e.g. MORE THAN versus APPROXIMATELY). The resulting historical dimensional readings are real documentary data, not canonical Phi values or artificial probabilities.

## Scientific and authority boundary

The retrospective record may be studied as real history. It is **not** a blind prospective prediction, causal counterfactual measurement, experimental proof of PEMS, validated MIHM-T outcome, new authority, canonical evidence admission or observed RETURN. Exact internal log receipts, original timestamps of incident rollback, human authorization and alternative unseen outcomes remain unknown.

Next: verify case-vintage QA and compare the real historical reconstruction to a competent conventional incident analysis. A genuinely confirmatory MIHM-T prediction requires newly reserved or prospective cases with independent outcomes.

Parent protocol: [MIHM-T EXP-001](../SFI-MIHM-T-EXP-001-PREREGISTRATION.md).
