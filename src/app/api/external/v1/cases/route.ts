import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorizeExternalRequest, externalAuthError } from '@/lib/sfi/externalAuth';
import {
  normalizeCasePlatformActionInput,
  resolveCasePlatformCreationIntake,
  resolveCasePlatformCreationIntakeFromAction,
} from '@/lib/sfi/caseIntakeResolver';
import {
  createOperationalCase,
  generateOperationalReport,
  listOperationalCases,
  listOperationalReports,
  normalizeAndRegisterOperationalCaseSource,
  readOperationalCase,
  recordOperationalCaseObject,
  transitionOperationalCase,
} from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { readDataPlaneState } from '@/lib/persistence/dataPlaneContinuityStore';
import {
  SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS,
  SFI_EXTERNAL_CASE_TRANSITION_SET,
  SFI_EXTERNAL_CASE_TRANSITIONS,
} from '@/lib/sfi/case-platform/externalPolicy';
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
type Operation = 'list' | 'read' | 'intake_plan' | 'create' | 'add_source' | 'add_object' | 'transition' | 'reports' | 'generate_report' | 'passport';

type SourceInput = Parameters<typeof normalizeAndRegisterOperationalCaseSource>[0]['source'];

const READ_OPERATIONS = new Set<Operation>(['list', 'read', 'reports', 'intake_plan', 'passport']);
const WRITE_OPERATIONS = new Set<Operation>(['create', 'add_source', 'add_object', 'transition', 'generate_report']);
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

function canonicalRefFromAction(body: Row): SfiCanonicalRef {
  const nested = row(body.canonicalRef);
  const flatId = text(body.canonicalRefId);
  const nestedId = text(nested.id);
  const flatVersion = nullableText(body.canonicalRefVersion);
  const nestedVersion = nullableText(nested.version);
  const flatHash = nullableText(body.canonicalRefHash);
  const nestedHash = nullableText(nested.hash);

  if (flatId && nestedId && flatId !== nestedId) throw new Error('SFI_CASE_REF_CONFLICT');
  if (flatVersion && nestedVersion && flatVersion !== nestedVersion) throw new Error('SFI_CASE_REF_VERSION_CONFLICT');
  if (flatHash && nestedHash && flatHash !== nestedHash) throw new Error('SFI_CASE_REF_HASH_CONFLICT');

  const id = flatId || nestedId;
  if (!id) throw new Error('SFI_CASE_REF_REQUIRED');
  return {
    id,
    version: flatVersion ?? nestedVersion,
    hash: flatHash ?? nestedHash,
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

/**
 * A read during CONTINUITY/RECOVERY is a real continuity snapshot, not
 * a certified current inventory of PRIMARY writes. Expose that boundary
 * to clients without bypassing routing or consulting the other provider.
 */
async function caseReadConsistency() {
  try {
    const state = await readDataPlaneState();
    if (state.mode !== 'PRIMARY') {
      return {
        readPlane: 'NEON_CONTINUITY',
        dataPlaneMode: state.mode,
        crossProviderParity: 'NOT_VERIFIED',
        sourceInventoryComplete: false,
        warning: 'CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES',
      };
    }
    return {
      readPlane: 'SUPABASE_PRIMARY',
      dataPlaneMode: 'PRIMARY',
      crossProviderParity: 'NOT_ASSERTED',
      sourceInventoryComplete: null,
      warning: null,
    };
  } catch {
    return {
      readPlane: 'UNVERIFIED',
      dataPlaneMode: 'UNKNOWN',
      crossProviderParity: 'NOT_VERIFIED',
      sourceInventoryComplete: false,
      warning: 'DATA_PLANE_STATE_UNAVAILABLE',
    };
  }
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

    if (operation === 'intake_plan') {
      const intakePlan = resolveCasePlatformCreationIntakeFromAction(body);
      return NextResponse.json({
        ok: true,
        operation,
        intakePlan,
        readyForCreate: intakePlan.readyForCreate,
        next: intakePlan.readyForCreate
          ? 'Submit the same resolved fields using operation=create.'
          : 'Ask only intakePlan.questions that remain unresolved, merge the answers into the Action request, then call intake_plan again.',
        epistemicBoundary: 'Pre-case intake resolves missing context only. It creates no case, evidence, memory, proposal, intervention or truth claim.',
      });
    }

    if (operation === 'read') {
      const caseId = requireCaseId(body);
      const envelope = await readOperationalCase(caseId, userId);
      return NextResponse.json(
        { ok: true, operation, ...envelope, readConsistency: await caseReadConsistency() },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    if (operation === 'passport') {
      const caseId = requireCaseId(body);
      const envelope = await readOperationalCase(caseId, userId);
      return NextResponse.json({ok:true, operation, passport:envelope.realityChain,
        objects:envelope.objects,temporalProvenance:envelope.temporalProvenance,
        authorityEvidence:envelope.authorityEvidence,
        trajectoryContrast:envelope.trajectoryContrast,
        reports:await listOperationalReports(caseId,userId),
        readConsistency: await caseReadConsistency()}, {headers:{'Cache-Control':'private, no-store'}});
    }
    if (operation === 'generate_report') {
      // This is the same institutional report writer, not a personal evidence or
      // execution plane. Ordinary account tokens retain their previous boundary.
      const reportAuth=authorizeExternalRequest(request,'root:operate');
      if (auth.credential.tenantId !== 'sfi' || auth.credential.role !== 'root_delegate' || !reportAuth.credential) return NextResponse.json({ok:false,error:'institutional_user_bound_oauth_required'},{status:403});
      const caseId = requireCaseId(body);
      const report = await generateOperationalReport({caseId,userId,claims:[],deliveryFormats:['JSON','WEB']});
      return NextResponse.json({ok:true,operation,report,executionAuthority:false},{status:201});
    }

    if (operation === 'reports') {
      const caseId = requireCaseId(body);
      return NextResponse.json({ ok: true, operation, reports: await listOperationalReports(caseId, userId) });
    }

    if (operation === 'create') {
      const actionInput = normalizeCasePlatformActionInput(body);
      const intakePlan = resolveCasePlatformCreationIntake(actionInput);
      if (!intakePlan.readyForCreate) {
        return NextResponse.json({
          ok: false,
          error: 'case_intake_incomplete',
          intakePlan,
          instruction: 'Resolve only the missing fields returned by intakePlan before creating the case.',
        }, { status: 409 });
      }
      const serviceProfileId = text(actionInput.serviceProfileId) as SfiServiceProfileId;
      const subject = text(actionInput.subject);
      const scopeText = text(actionInput.scope);
      const temporal = row(actionInput.temporalWindow);
      const cutoff = text(temporal.cutoff);
      const caseRecord = await createOperationalCase({
        userId,
        tenantId: nullableText(actionInput.tenantId),
        clientId: nullableText(actionInput.clientId),
        serviceProfileId,
        subject,
        scope: scopeText,
        systemBoundaryRef: canonicalRef(actionInput.systemBoundaryRef),
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
        intakePlan,
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
        canonicalRef: canonicalRefFromAction(body),
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
        transportDiagnostics: {
          canonicalRefTransport: text(body.canonicalRefId) ? 'FLAT' : 'NESTED',
          canonicalRefId: object.canonicalRef.id,
        },
        epistemicBoundary: 'External case objects preserve assigned epistemic role and cannot create accepted evidence, governance authority, intervention authority, observed return or truth claims.',
      }, { status: 201 });
    }

    if (operation === 'transition') {
      const caseId = requireCaseId(body);
      const status = text(body.status) as SfiCaseStatus;
      if (!SFI_EXTERNAL_CASE_TRANSITION_SET.has(status)) {
        return NextResponse.json({
          ok: false,
          error: 'case_transition_not_allowed_for_external_agent',
          allowed: [...SFI_EXTERNAL_CASE_TRANSITIONS],
          excluded: [...SFI_EXTERNAL_CASE_RESERVED_TRANSITIONS],
        }, { status: 400 });
      }
      const envelope = await transitionOperationalCase({ caseId, userId, status, closureMode: body.closureMode as import('@/core/case-platform').SfiCaseClosureMode | undefined, closureReason: text(body.closureReason) });
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
