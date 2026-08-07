import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { linkCaseEvidence, registerReferenceCase, type CaseEvidenceRelation } from '@/lib/amv/referenceBank';
import { normalizeAmvObjectClass } from '@/lib/amv/epistemicGate';
import { SFI_INSTITUTIONAL_ATTRACTOR_KEY } from './institutionalAttractor';

type Row = Record<string, unknown>;
type AttractorRelation = 'supports' | 'contradicts' | 'contextualizes' | 'unresolved';

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function caseToken(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'PHENOMENON';
}

function resolveAttractorRelation(phenomenon: Row): { attractorKey: string | null; relation: AttractorRelation; reason: string } {
  const vector = record(phenomenon.vector);
  const declaredKey = text(vector.attractorKey ?? vector.attractor_key);
  const rawRelation = text(vector.attractorRelation ?? vector.attractor_relation)?.toLowerCase();
  if (declaredKey && ['supports', 'contradicts', 'contextualizes'].includes(rawRelation ?? '')) {
    return { attractorKey: declaredKey, relation: rawRelation as AttractorRelation, reason: 'explicit_relation_in_phenomenon_vector' };
  }

  const module = String(phenomenon.module ?? '').toLowerCase();
  const institutionallyRelevant = /(institution|commercial|research|studio|field|governance|world|scorefriction|mihm|cognitive|continuity)/.test(module);
  if (institutionallyRelevant) {
    return {
      attractorKey: SFI_INSTITUTIONAL_ATTRACTOR_KEY,
      relation: 'contextualizes',
      reason: 'module_is_institutionally_relevant_but_causality_is_not_assumed',
    };
  }
  return { attractorKey: null, relation: 'unresolved', reason: 'no_explicit_attractor_relation' };
}

function caseRelation(value: string): CaseEvidenceRelation {
  if (value === 'supports') return 'SUPPORTS';
  if (value === 'contradicts') return 'CONTRADICTS';
  return 'CONTEXTUALIZES';
}

function sameSnapshot(previous: Row | null, current: Row) {
  if (!previous) return false;
  return ['regime', 'density', 'persistence', 'velocity', 'trust', 'degradation', 'evidence_count', 'attractor_relation', 'attractor_key']
    .every((key) => String(previous[key] ?? '') === String(current[key] ?? ''));
}

function phenomenonObjectClass(phenomenon: Row) {
  const vector = record(phenomenon.vector);
  return normalizeAmvObjectClass(vector.objectClass ?? vector.object_class ?? phenomenon.module ?? 'other');
}

function consentEvidence(phenomenon: Row) {
  const vector = record(phenomenon.vector);
  const consent = record(vector.consent ?? vector.amvConsent);
  return text(consent.evidenceId ?? consent.evidence_id);
}

export async function refreshPhenomenonTrajectoriesAndPpoi() {
  const db = createServiceSupabaseClient();
  const phenomenaResult = await db.from('sfi_phenomena').select('*').order('last_seen', { ascending: false }).limit(500);
  if (phenomenaResult.error) return { ok: false as const, error: 'phenomena_read_failed', details: phenomenaResult.error.message };

  const phenomena = rows(phenomenaResult.data);
  if (!phenomena.length) return { ok: true as const, phenomena: 0, snapshots: 0, ppoiCaseUpserts: 0, ppoiBlockedByConsent: 0, warnings: ['no_persisted_phenomena'] };

  const keys = phenomena.map((item) => text(item.phenomenon_key)).filter((item): item is string => Boolean(item));
  const evidenceResult = await db.from('sfi_phenomenon_evidence').select('*').in('phenomenon_key', keys).order('created_at', { ascending: true });
  const evidenceLinks = rows(evidenceResult.data);

  let snapshots = 0;
  let ppoiCaseUpserts = 0;
  let ppoiBlockedByConsent = 0;
  const warnings: string[] = evidenceResult.error ? [evidenceResult.error.message] : [];

  for (const phenomenon of phenomena) {
    const phenomenonKey = text(phenomenon.phenomenon_key);
    if (!phenomenonKey) continue;
    const relation = resolveAttractorRelation(phenomenon);
    const phenomenonEvidence = evidenceLinks.filter((item) => item.phenomenon_key === phenomenonKey);
    const evidenceRefs = [...new Set(phenomenonEvidence.map((item) => text(item.evidence_id)).filter((item): item is string => Boolean(item)))];
    const observedAt = text(phenomenon.last_seen) ?? new Date().toISOString();
    const snapshotRow: Row = {
      phenomenon_key: phenomenonKey,
      attractor_key: relation.attractorKey,
      attractor_relation: relation.relation,
      observed_at: observedAt,
      regime: text(phenomenon.regime) ?? 'latent',
      density: number(phenomenon.density),
      persistence: number(phenomenon.persistence),
      velocity: number(phenomenon.velocity),
      trust: number(phenomenon.trust),
      degradation: number(phenomenon.degradation),
      evidence_count: Math.max(number(phenomenon.evidence_count), evidenceRefs.length),
      evidence_refs: evidenceRefs,
      vector: { ...record(phenomenon.vector), attractorRelationReason: relation.reason },
    };

    const latest = await db.from('sfi_phenomenon_trajectory_snapshots')
      .select('*').eq('phenomenon_key', phenomenonKey).order('observed_at', { ascending: false }).limit(1).maybeSingle();
    if (latest.error) warnings.push(`${phenomenonKey}:trajectory_read:${latest.error.message}`);
    if (!sameSnapshot(latest.data as Row | null, snapshotRow)) {
      const inserted = await db.from('sfi_phenomenon_trajectory_snapshots').insert(snapshotRow);
      if (inserted.error) warnings.push(`${phenomenonKey}:trajectory_write:${inserted.error.message}`);
      else snapshots += 1;
    }

    const evidenceCount = Number(snapshotRow.evidence_count ?? 0);
    if (evidenceCount <= 0) continue;

    const objectClass = phenomenonObjectClass(phenomenon);
    const consentRequired = ['person', 'organization', 'movement'].includes(objectClass);
    const consentEvidenceId = consentEvidence(phenomenon);
    if (consentRequired && !consentEvidenceId) {
      ppoiBlockedByConsent += 1;
      warnings.push(`${phenomenonKey}:ppoi:CONSENT_EVIDENCE_REQUIRED`);
      continue;
    }

    try {
      const reference = await registerReferenceCase({
        caseCode: `PPOI-${caseToken(phenomenonKey)}`,
        objectId: phenomenonKey,
        objectClass,
        title: text(phenomenon.label) ?? phenomenonKey,
        manifestation: 'sfi_persisted_phenomenon',
        cohort: 'ppoi_phenomenon',
        prospective: true,
        status: 'OBSERVING',
        openedAt: text(phenomenon.first_seen) ?? observedAt,
        t0Cutoff: text(phenomenon.first_seen) ?? observedAt,
        phaseStatus: {
          phase0: 'READY',
          phase1: 'OBSERVED_EVIDENCE_PRESENT',
          phase2: relation.relation === 'unresolved' ? 'ATTRACTOR_RELATION_UNRESOLVED' : 'ATTRACTOR_RELATION_DERIVED',
          phase3: 'PPOI_TRAJECTORY',
          phase4: 'NOT_EXECUTED',
          phase5: 'WAITING_RETURN_OR_OUTCOME',
          phase6: 'NOT_CALIBRATED',
        },
        fieldsDocumented: ['phenomenon.regime', 'phenomenon.density', 'phenomenon.persistence', 'phenomenon.velocity', 'phenomenon.trust', 'phenomenon.evidence_count'],
        missingFields: relation.relation === 'unresolved' ? ['attractor_relation'] : [],
        operatorId: null,
        consentRequired,
        consentEvidenceId,
        metadata: {
          automatic: true,
          source: 'sfi_phenomena',
          phenomenonKey,
          objectClass,
          attractorKey: relation.attractorKey,
          attractorRelation: relation.relation,
          attractorRelationReason: relation.reason,
          epistemicClass: 'DERIVED',
          ppoiRule: 'An evidence-bearing persisted phenomenon may be registered as a longitudinal PPOI reference case. Registration is DERIVED workflow state, not outcome, validation or causal attribution.',
        },
      });
      ppoiCaseUpserts += 1;
      const caseId = String(reference.id ?? '');
      if (caseId) {
        for (const link of phenomenonEvidence) {
          const evidenceId = text(link.evidence_id);
          if (!evidenceId) continue;
          await linkCaseEvidence({
            caseId,
            evidenceSource: 'sfi_evidence_ledger',
            evidenceId,
            relationType: caseRelation(String(link.relation_type ?? 'contextualizes')),
            note: 'Automatic provenance link from canonical sfi_phenomenon_evidence.',
            createdBy: null,
          }).catch((error) => warnings.push(`${phenomenonKey}:case_evidence:${error instanceof Error ? error.message : String(error)}`));
        }
      }
    } catch (error) {
      warnings.push(`${phenomenonKey}:ppoi:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    ok: warnings.every((warning) => warning.endsWith('CONSENT_EVIDENCE_REQUIRED') || warning === 'no_persisted_phenomena'),
    phenomena: phenomena.length,
    snapshots,
    ppoiCaseUpserts,
    ppoiBlockedByConsent,
    warnings,
  };
}