import 'server-only';

import { runNoKeyProspectRadar } from '@/lib/agents/noKeyProspectRadar';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT = 'SFI-DISCOVERY-OPPORTUNITY-CYCLE-1.0' as const;
const DAYS_BETWEEN_SCANS = 7;
const MAX_REPORT_SOURCES = 40;

export type DiscoveryOpportunityCycleState =
  | 'DISABLED'
  | 'SKIPPED_RECENT'
  | 'PUBLIC_SIGNALS_TO_VALIDATE'
  | 'NO_PUBLIC_SIGNALS'
  | 'PERSISTENCE_UNVERIFIED'
  | 'FAILED';

/**
 * A bounded coordination step over the EXISTING Prospect Radar owner.
 *
 * This is not a second opportunity database, search adapter, LLM agent or
 * governance pipeline. It performs research ONLY in the unrestricted,
 * explicitly enabled continuity-report lane. The radar persists a
 * projected_not_validated report; it does not contact anyone or create an
 * actionable, verified commercial opportunity by itself.
 */
export async function runDiscoveryOpportunityResearchCycle(now = new Date()) {
  if (process.env.SFI_DISCOVERY_OPPORTUNITY_RESEARCH !== 'enabled') {
    return {
      contract: SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT,
      state: 'DISABLED' as DiscoveryOpportunityCycleState,
      reason: 'SFI_DISCOVERY_OPPORTUNITY_RESEARCH_NOT_ENABLED',
      modelRequired: false,
      writesPerformed: false,
    };
  }

  const service = createServiceSupabaseClient();
  const previous = await service
    .from('prospect_research_runs')
    .select('id,created_at,status')
    .eq('mode', 'discover')
    .is('company_seed', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previous.error) {
    return {
      contract: SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT,
      state: 'FAILED' as DiscoveryOpportunityCycleState,
      reason: 'PROSPECT_RUN_CADENCE_READ_FAILED',
      modelRequired: false,
      writesPerformed: false,
    };
  }
  const lastAt = Date.parse(previous.data?.created_at ?? '');
  const ageMs = now.getTime() - lastAt;
  if (Number.isFinite(lastAt) && ageMs >= 0 && ageMs < DAYS_BETWEEN_SCANS * 86_400_000) {
    return {
      contract: SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT,
      state: 'SKIPPED_RECENT' as DiscoveryOpportunityCycleState,
      lastRunId: previous.data?.id ?? null,
      modelRequired: false,
      writesPerformed: false,
    };
  }

  // Research focus rotates over REAL public-problem search; it is not a
  // fabricated prospect and the search result is not a company attribution.
  const week = Math.floor(now.getTime() / (7 * 86_400_000));
  const focus = [
    { region: 'Aguascalientes, México', sector: 'industria y manufactura', painFocus: 'continuidad de operaciones, trazabilidad y cuellos de botella' },
    { region: 'México', sector: 'servicios y plataformas digitales', painFocus: 'fallas de decisiones automatizadas, evidencia y control' },
    { region: 'México', sector: 'logística y cadenas de suministro', painFocus: 'retrasos, coordinación entre actores y recuperación' },
  ][Math.abs(week) % 3];

  try {
    const report = await runNoKeyProspectRadar({
      mode: 'discover',
      ...focus,
      lookbackDays: 45,
      maxCandidates: 3,
      allowProvisionalOffers: false,
      allowModelSynthesis: false,
    }, null);

    // The existing writer may legitimately be unavailable. A generated
    // runId is not proof of persisted evidence: verify the actual join.
    const receipt = await service
      .from('prospect_opportunity_reports')
      .select('id,epistemic_status,run_id')
      .eq('run_id', report.runId)
      .maybeSingle();
    const persisted = !receipt.error && receipt.data?.run_id === report.runId;
    const sourceCount = report.sources.length;
    const state: DiscoveryOpportunityCycleState = !persisted
      ? 'PERSISTENCE_UNVERIFIED'
      : sourceCount === 0 ? 'NO_PUBLIC_SIGNALS' : 'PUBLIC_SIGNALS_TO_VALIDATE';
    return {
      contract: SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT,
      state,
      runId: persisted ? report.runId : null,
      sourceCount: Math.min(sourceCount, MAX_REPORT_SOURCES),
      projectedCandidateCount: report.candidates.length,
      researchProvider: report.researchProvider,
      epistemicStatus: 'projected_not_validated',
      modelRequired: false,
      modelInvoked: false,
      contactsMade: 0,
      publicationPerformed: false,
      institutionalActionExecuted: false,
      writesPerformed: persisted,
      boundary: 'Public RSS source signals and an internal draft report, not verified prospects, grant eligibility, institutional decisions, external outreach, sales or scientific RETURN.',
    };
  } catch {
    return {
      contract: SFI_DISCOVERY_OPPORTUNITY_CYCLE_CONTRACT,
      state: 'FAILED' as DiscoveryOpportunityCycleState,
      reason: 'BOUNDED_RESEARCH_EXECUTION_FAILED',
      modelRequired: false,
      writesPerformed: false,
    };
  }
}
