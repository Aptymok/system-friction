import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  createOperationalCase,
  listOperationalCases,
  listOperationalReports,
  normalizeAndRegisterOperationalCaseSource,
  readOperationalCase,
  recordOperationalCaseObject,
  transitionOperationalCase,
} from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type {
  SfiCanonicalRef,
  SfiCaseStatus,
  SfiEpistemicClass,
  SfiServiceProfileId,
  SfiTemporalWindowV1,
} from '@/core/contracts/sfi';
import type { SfiCaseObjectKind } from '@/core/case-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;
type Operation = 'list' | 'read' | 'create' | 'add_source' | 'add_object' | 'transition' | 'reports';

type SourceInput = Parameters<typeof normalizeAndRegisterOperationalCaseSource>[0]['source'];

const READ_OPERATIONS = new Set<Operation>(['list', 'read', 'reports']);
const WRITE_OPERATIONS = new Set<Operation>(['create', 'add_source', 'add_object', 'transition']);
const SAFE_OBJECT_KINDS = new Set<SfiCaseObjectKind>([
  'RECORD',
  'OBSERVATION',
  'SYSTEM_MODEL',
  'HYPOTHESIS',
  'ANALYSIS',
  'RECOMMENDATION',
  'REPORT',
  'UNRESOLVED_QUESTION',
  'CONTRADICTION',
]);
const SAFE_TRANSITIONS = new Set<SfiCaseStatus>([
  'DRAFT',
  'OPEN',
  'OBSERVING',
  'ANALYZING',
  'AWAITING_GOVERNANCE',
  'CLOSED',
  'REJECTED',
]);

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function canonicalRef(value: unknown): SfiCanonicalRef {
  const ref = row(value);
  const id = text(ref.id);
  if (!id) throw new Error('SFI_CASE_REF_REQUIRED');
  return {
    id,
    version: nullableText(ref.version),
    hash: nullableText(ref.hash),
  };
}

function canonicalRefs(value: unknown): SfiCanonicalRef[] {
  return Array.isArray(value) ? value.map(canonicalRef) : [];
}

function epistemicRoleFor(kind: SfiCaseObjectKind): SfiEpistemicClass {
  if (kind === 'RECORD' || kind === 'OBSERVATION' || kind === 'REPORT') return 'RECORD';
  if (kind === 'UNRESOLVED_QUESTION' || kind === 'CONTRADICTION') return 'EPISTEMIC_ASSESSMENT';
  return 'INFERENCE';
}

function operationScope(operation: Operation) {
  return READ_OPERATIONS.has(operation) ? 'cases:read' : 'cases:write';
}

function requireCaseId(body: Row) {
  const caseId = text(body.caseId);
  if (!caseId) throw new Error('SFI_CASE_ID_REQUIRED');
  return caseId;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Row;
  const operation = text(body.operation) as Operation;
  if (!READ_OPERATIONS.has(operation) && !WRITE_OPERATIONS.has(operation)) {
    return NextResponse.json({
      ok: false,
      error: 'unsupported_case_operation',
      allowed: [...READ_OPERATIONS, ...WRITE_OPERATIONS],
    }, { status: 400 });
  }

  const scope = operationScope(operation);
  const auth = authorizeExternalRequest(request, scope);
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, scope), { status: 401 });

  const credential = auth.credential;
  if (credential.authMethod !== 'oauth' || !credential.subjectId) {
    return NextResponse.json({
      ok: false,
      error: 'user_bound_oauth_required',
      boundary: 'Case Platform operations resolve access from OAuth subject_id. Shared/static credentials cannot impersonate a case owner.',
    }, { status: 403 });
  }

  const userId = credential.subjectId;

  try {
    if (operation === 'list') {
      return NextResponse.json({
        ok: true,
        operation,
        cases: await listOperationalCases(userId),
        boundary: 'Only cases in tenants where the OAuth subject has active membership are returned.',
      });
    }

    if (operation === 'read') {
      const caseId = requireCaseId(body);
      return NextResponse.json({ ok: true, operation, ...(await readOperationalCase(caseId, userId)) });
    }

    if (operation === 'reports') {
      const caseId = requireCaseId(body);
      return NextResponse.json({ ok: true, operation, reports: await listOperationalReports(caseId, userId) });
    }

    if (operation === 'create') {
      const serviceProfileId = text(body.serviceProfileId) as SfiServiceProfileId;
      const subject = text(body.subject);
      const scopeText = text(body.scope);
      if (!serviceProfileId || !subject || !scopeText) throw new Error('SFI_CASE_CREATE_REQUIRED_FIELDS');
      const temporal = row(body.temporalWindow);
      const cutoff = text(temporal.cutoff);
      if (!cutoff) throw new Error('SFI_CASE_TEMPORAL_CUTOFF_REQUIRED');
      const caseRecord = await createOperationalCase({
        userId,
        tenantId: nullableText(body.tenantId),
        clientId: nullableText(body.clientId),
        serviceProfileId,
        subject,
        scope: scopeText,
        systemBoundaryRef: canonicalRef(body.systemBoundaryRef),
        temporalWindow: {
          mode: text(temporal.mode),
          basis: text(temporal.basis),
          start: nullableText(temporal.start),
          end: nullableText(temporal.end),
          cutoff,
          timezone: text(temporal.timezone) || 'UTC',
          reconstructionAsOf: nullableText(temporal.reconstructionAsOf),
          horizon: nullableText(temporal.horizon),
        } as SfiTemporalWindowV1,
      });
      return NextResponse.json({
        ok: true,
        operation,
        case: caseRecord,
        epistemicBoundary: 'Case creation does not create evidence, institutional memory, ROOT authority or canonical truth.',
      }, { status: 201 });
    }

    if (operation === 'add_source') {
      const caseId = requireCaseId(body);
      const sourceBody = row(body.source);
      const sourceType = text(sourceBody.sourceType);
      const label = text(sourceBody.label);
      if (!sourceType || !label) throw new Error('SFI_CASE_SOURCE_REQUIRED');
      const source = await normalizeAndRegisterOperationalCaseSource({
        caseId,
        userId,
        source: {
          id: text(sourceBody.sourceId) || randomUUID(),
          sourceType,
          label,
          externalRef: nullableText(sourceBody.externalRef),
          observedAt: nullableText(sourceBody.observedAt),
          contentHash: nullableText(sourceBody.contentHash),
          metadata: row(sourceBody.metadata),
        } as SourceInput,
      });
      return NextResponse.json({
        ok: true,
        operation,
        source,
        epistemicBoundary: 'SOURCE ≠ RECORD ≠ EVIDENCE. Registering a public source does not upgrade its claims to evidence or truth.',
      }, { status: 201 });
    }

    if (operation === 'add_object') {
      const caseId = requireCaseId(body);
      const kind = text(body.kind) as SfiCaseObjectKind;
      if (!SAFE_OBJECT_KINDS.has(kind)) {
        return NextResponse.json({
          ok: false,
          error: 'case_object_kind_not_allowed_for_external_agent',
          allowed: [...SAFE_OBJECT_KINDS],
          forbiddenAuthority: ['EVIDENCE', 'GOVERNANCE_DECISION', 'INTERVENTION', 'RETURN', 'TRUTH_CLAIM'],
        }, { status: 400 });
      }
      const object = await recordOperationalCaseObject({
        caseId,
        userId,
        kind,
        epistemicRole: epistemicRoleFor(kind),
        canonicalRef: canonicalRef(body.canonicalRef),
        sourceRefs: canonicalRefs(body.sourceRefs),
        recordRefs: canonicalRefs(body.recordRefs),
        evidenceRefs: [],
        payload: row(body.payload),
        observedAt: nullableText(body.observedAt),
      });
      return NextResponse.json({
        ok: true,
        operation,
        object,
        epistemicBoundary: 'External case objects preserve assigned epistemic role and cannot create accepted evidence, governance authority, intervention authority, observed return or truth claims.',
      }, { status: 201 });
    }

    if (operation === 'transition') {
      const caseId = requireCaseId(body);
      const status = text(body.status) as SfiCaseStatus;
      if (!SAFE_TRANSITIONS.has(status)) {
        return NextResponse.json({
          ok: false,
          error: 'case_transition_not_allowed_for_external_agent',
          allowed: [...SAFE_TRANSITIONS],
          excluded: ['INTERVENING', 'AWAITING_RETURN'],
        }, { status: 400 });
      }
      const envelope = await transitionOperationalCase({ caseId, userId, status });
      return NextResponse.json({
        ok: true,
        operation,
        ...envelope,
        authorityBoundary: 'This adapter cannot place a case into INTERVENING or AWAITING_RETURN; governed action/return flows remain separate.',
      });
    }

    return NextResponse.json({ ok: false, error: 'unreachable_case_operation' }, { status: 500 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
