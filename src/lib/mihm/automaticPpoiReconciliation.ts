import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { readCommercialWorkspace } from '@/lib/commercial/commercialService';
import { registerReferenceCase } from '@/lib/amv/referenceBank';
import { normalizeAmvObjectClass } from '@/lib/amv/epistemicGate';
import { resolveRootCaseMethodology, type RootCaseMethodology } from './rootCaseMethodology';
import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';

type Row = RootRow;

type AutomaticPpoiDisposition =
  | 'LINKED_EXISTING'
  | 'REGISTERED_AUTOMATICALLY'
  | 'PENDING_AUTOMATIC'
  | 'BLOCKED'
  | 'NOT_REQUIRED';

export type AutomaticPpoiCaseState = {
  caseId: string;
  title: string;
  methodology: RootCaseMethodology;
  disposition: AutomaticPpoiDisposition;
  referenceCaseId: string | null;
  referenceCaseCode: string | null;
  blocker: string | null;
};

function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function uniqueRows(input: Row[]) {
  const seen = new Set<string>();
  return input.filter((row, index) => {
    const id = String(row.id ?? row.case_id ?? row.opportunity_id ?? row.proposal_id ?? `row-${index}`);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
function token(value: string) { return value.toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'CASE'; }
function objectClassFor(methodology: RootCaseMethodology) {
  switch (methodology.input.subject) {
    case 'PERSON': return 'person';
    case 'ORGANIZATION': return 'organization';
    case 'WORLD_CONTEXT': return 'world_context';
    case 'ARTIFACT':
    case 'OBJECT':
    case 'SIGNAL': return 'artifact';
    case 'PHENOMENON': return 'phenomenon';
    case 'SFI_SYSTEM': return 'institution';
    default: return 'other';
  }
}
function consentEvidenceId(row: Row) {
  const direct = text(row.consent_evidence_id ?? row.consentEvidenceId);
  if (direct) return direct;
  const consent = row.consent && typeof row.consent === 'object' && !Array.isArray(row.consent) ? row.consent as Record<string, unknown> : {};
  return text(consent.evidence_id ?? consent.evidenceId);
}
function openedAt(row: Row) { return text(row.created_at ?? row.observed_at ?? row.updated_at) ?? new Date().toISOString(); }

async function sourceCases() {
  const commercial = await readCommercialWorkspace();
  const sourceRows = uniqueRows([...rows(commercial.sourceProposals), ...rows(commercial.opportunities), ...rows(commercial.proposals)]);
  return { rows: sourceRows, warnings: commercial.warnings };
}

export async function readAutomaticPpoiStates(): Promise<{ cases: AutomaticPpoiCaseState[]; warnings: string[] }> {
  const db = createServiceSupabaseClient();
  const source = await sourceCases();
  const methodologies = source.rows.map((row, index) => ({ row, methodology: resolveRootCaseMethodology(row, index) }));
  const caseCodes = methodologies.map(({ methodology }) => `PPOI-${token(methodology.caseId)}`);
  const existing = caseCodes.length ? await db.from('sfi_reference_cases').select('id,case_code,object_id,status,metadata').in('case_code', caseCodes) : { data: [], error: null };
  const existingRows = rows(existing.data);
  const byCode = new Map(existingRows.map((row) => [String(row.case_code), row]));

  const cases = methodologies.map(({ row, methodology }): AutomaticPpoiCaseState => {
    const primary = methodology.resolution.primary?.methodId ?? null;
    const code = `PPOI-${token(methodology.caseId)}`;
    const linked = byCode.get(code) ?? null;
    if (primary !== 'PPOI') return { caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'NOT_REQUIRED', referenceCaseId: null, referenceCaseCode: null, blocker: null };
    if (methodology.resolution.status !== 'READY') {
      return { caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'BLOCKED', referenceCaseId: linked ? String(linked.id ?? '') || null : null, referenceCaseCode: linked ? code : null, blocker: methodology.resolution.blockers.map((item) => item.message).join(' · ') || 'La selección metodológica no está lista.' };
    }
    const objectClass = normalizeAmvObjectClass(objectClassFor(methodology));
    const consentRequired = ['person', 'organization', 'movement'].includes(objectClass);
    if (consentRequired && !consentEvidenceId(row)) {
      return { caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'BLOCKED', referenceCaseId: linked ? String(linked.id ?? '') || null : null, referenceCaseCode: linked ? code : null, blocker: 'PPOI requiere evidencia de consentimiento para esta clase de objeto.' };
    }
    if (linked) return { caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'LINKED_EXISTING', referenceCaseId: String(linked.id ?? '') || null, referenceCaseCode: code, blocker: null };
    return { caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'PENDING_AUTOMATIC', referenceCaseId: null, referenceCaseCode: code, blocker: null };
  });

  return { cases, warnings: [...source.warnings, ...(existing.error ? [`sfi_reference_cases:${existing.error.message}`] : [])] };
}

export async function reconcileAutomaticPpoi(): Promise<{ ok: boolean; cases: AutomaticPpoiCaseState[]; created: number; linked: number; blocked: number; warnings: string[] }> {
  const source = await sourceCases();
  const db = createServiceSupabaseClient();
  const results: AutomaticPpoiCaseState[] = [];
  const warnings = [...source.warnings];
  let created = 0;
  let linked = 0;
  let blocked = 0;

  for (let index = 0; index < source.rows.length; index += 1) {
    const row = source.rows[index];
    const methodology = resolveRootCaseMethodology(row, index);
    const primary = methodology.resolution.primary?.methodId ?? null;
    if (primary !== 'PPOI') {
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'NOT_REQUIRED', referenceCaseId: null, referenceCaseCode: null, blocker: null });
      continue;
    }

    const code = `PPOI-${token(methodology.caseId)}`;
    const existing = await db.from('sfi_reference_cases').select('id,case_code').eq('case_code', code).maybeSingle();
    if (existing.error) warnings.push(`${methodology.caseId}:reference_lookup:${existing.error.message}`);

    if (methodology.resolution.status !== 'READY') {
      blocked += 1;
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'BLOCKED', referenceCaseId: existing.data ? String(existing.data.id ?? '') || null : null, referenceCaseCode: existing.data ? code : null, blocker: methodology.resolution.blockers.map((item) => item.message).join(' · ') || 'La selección metodológica no está lista.' });
      continue;
    }

    const objectClass = normalizeAmvObjectClass(objectClassFor(methodology));
    const consentRequired = ['person', 'organization', 'movement'].includes(objectClass);
    const consentId = consentEvidenceId(row);
    if (consentRequired && !consentId) {
      blocked += 1;
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'BLOCKED', referenceCaseId: existing.data ? String(existing.data.id ?? '') || null : null, referenceCaseCode: existing.data ? code : null, blocker: 'PPOI requiere evidencia de consentimiento para esta clase de objeto.' });
      continue;
    }

    if (existing.data) {
      linked += 1;
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'LINKED_EXISTING', referenceCaseId: String(existing.data.id ?? '') || null, referenceCaseCode: code, blocker: null });
      continue;
    }

    try {
      const at = openedAt(row);
      const reference = await registerReferenceCase({
        caseCode: code,
        objectId: methodology.input.subjectId ?? methodology.caseId,
        objectClass,
        title: methodology.title,
        manifestation: 'automatic_mihm_method_selection',
        cohort: 'ppoi_methodology',
        prospective: true,
        status: 'OBSERVING',
        openedAt: at,
        t0Cutoff: at,
        phaseStatus: {
          phase0: 'READY',
          phase1: methodology.input.evidenceCount && methodology.input.evidenceCount > 0 ? 'EVIDENCE_DECLARED' : 'MISSING_EVIDENCE',
          phase2: 'METHOD_SELECTED',
          phase3: 'PPOI_CONTAINER_REGISTERED',
          phase4: 'NOT_EXECUTED',
          phase5: 'WAITING_RETURN_OR_OUTCOME',
          phase6: 'NOT_CALIBRATED',
        },
        fieldsDocumented: ['mihm.subject', 'mihm.temporalScope', 'mihm.primaryMethod'],
        missingFields: methodology.input.evidenceCount && methodology.input.evidenceCount > 0 ? [] : ['evidence'],
        operatorId: null,
        consentRequired,
        consentEvidenceId: consentId,
        metadata: {
          automatic: true,
          source: 'automatic_ppoi_reconciliation',
          caseId: methodology.caseId,
          primaryMethod: primary,
          reasonCodes: methodology.resolution.primary?.reasonCodes ?? [],
          supportingMethods: methodology.resolution.supporting.map((item) => item.methodId),
          responsibleAgent: 'project_execution_manager',
          epistemicClass: 'DERIVED',
          rule: 'PPOI container registration is an automatic workflow consequence of a READY canonical MIHM method selection. It is not evidence, approval, intervention or outcome.',
        },
      });
      created += 1;
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'REGISTERED_AUTOMATICALLY', referenceCaseId: String(reference.id ?? '') || null, referenceCaseCode: code, blocker: null });
    } catch (error) {
      blocked += 1;
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`${methodology.caseId}:automatic_ppoi:${message}`);
      results.push({ caseId: methodology.caseId, title: methodology.title, methodology, disposition: 'BLOCKED', referenceCaseId: null, referenceCaseCode: null, blocker: message });
    }
  }

  return { ok: warnings.length === 0, cases: results, created, linked, blocked, warnings: [...new Set(warnings)] };
}
