import { createObservationSourceDescriptor } from '@/observatory/source/sourceStateTypes';
import { analyzeDraftWithMihm } from './mihmDraftAnalyzer';
import type { MihmDraftReview, SocialDraft, SocialNetwork } from './socialDraftTypes';
import { reviewDraftWithWorldSpect } from './worldSpectDraftReview';

type DraftContext = Parameters<typeof reviewDraftWithWorldSpect>[1] & {
  objective?: string | null;
  evidencePresent?: boolean;
  assetState?: {
    IHG?: number | null;
    NTI_obs?: number | null;
    LDI_hours?: number | null;
    PHI_SF?: number | null;
    regime?: string | null;
  } | null;
};

type CreateSocialDraftInput = {
  network?: SocialNetwork;
  text: string;
  objective?: string;
  createdAt?: string;
};

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function inferSocialNetwork(text: string): SocialNetwork {
  const normalized = normalize(text);
  if (/linkedin/.test(normalized)) return 'linkedin';
  if (/(twitter|x\.com|\bx\b)/.test(normalized)) return 'x';
  if (/instagram|reel/.test(normalized)) return 'instagram';
  if (/tiktok/.test(normalized)) return 'tiktok';
  if (/youtube|short/.test(normalized)) return 'youtube';
  if (/reddit/.test(normalized)) return 'reddit';
  return 'unknown';
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function hashSocialDraftContent(draft: Pick<SocialDraft, 'network' | 'text' | 'objective' | 'createdAt'>) {
  const input = `${draft.network}\n${draft.text}\n${draft.objective}\n${draft.createdAt}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createSocialDraft(input: CreateSocialDraftInput): Promise<SocialDraft> {
  const createdAt = input.createdAt || new Date().toISOString();
  const draft: SocialDraft = {
    id: randomId(),
    network: input.network || inferSocialNetwork(`${input.text} ${input.objective || ''}`),
    text: input.text,
    objective: input.objective || 'Preparar salida publica con validacion humana.',
    status: 'DRAFT',
    createdAt,
    updatedAt: createdAt,
    contentApproved: false,
    sourceDescriptor: createObservationSourceDescriptor({
      sourceState: 'LOCAL_CONTEXT',
      confidence: 'limited',
      isExternal: false,
      isSimulated: false,
      timestamp: createdAt,
    }),
  };
  return {
    ...draft,
    contentHash: await hashSocialDraftContent(draft),
  };
}

export async function reviewSocialDraft(draft: SocialDraft, context: DraftContext = {}): Promise<SocialDraft> {
  const mihmReview: MihmDraftReview = analyzeDraftWithMihm(draft, {
    objective: context.objective,
    evidencePresent: context.evidencePresent,
    assetState: context.assetState || context.mihmState,
  });
  const withMihm: SocialDraft = {
    ...draft,
    mihmReview,
    status: 'MIHM_REVIEWED',
    updatedAt: new Date().toISOString(),
  };
  const worldSpectReview = reviewDraftWithWorldSpect(withMihm, context);
  return {
    ...withMihm,
    worldSpectReview,
    status: 'WORLDSPECT_REVIEWED',
    updatedAt: new Date().toISOString(),
  };
}

export async function approveSocialDraftContent(draft: SocialDraft): Promise<SocialDraft> {
  const contentHash = await hashSocialDraftContent(draft);
  return {
    ...draft,
    contentHash,
    contentApproved: true,
    approval: {
      approvedAt: new Date().toISOString(),
      approvedBy: 'human',
      contentHash,
      sourceDescriptor: createObservationSourceDescriptor({
        sourceState: 'LOCAL_CONTEXT',
        confidence: 'limited',
        isExternal: false,
        isSimulated: false,
      }),
    },
    status: 'CONTENT_APPROVED',
    updatedAt: new Date().toISOString(),
  };
}

export function requestPublicationConfirmation(draft: SocialDraft): SocialDraft {
  return {
    ...draft,
    status: 'POST_CONFIRMATION_REQUIRED',
    updatedAt: new Date().toISOString(),
  };
}

export function assertCanPublishSocialDraft(_draft: SocialDraft) {
  return {
    canPublish: false,
    reason: 'Publicación real no habilitada en esta fase.',
  };
}

export function confirmPublication(draft: SocialDraft): SocialDraft {
  const assertion = assertCanPublishSocialDraft(draft);
  return {
    ...draft,
    status: assertion.canPublish ? 'PUBLISHED' : 'POST_CONFIRMATION_REQUIRED',
    updatedAt: new Date().toISOString(),
  };
}

export async function updateSocialDraftText(draft: SocialDraft, text: string): Promise<SocialDraft> {
  const approvedHash = draft.approval?.contentHash;
  const candidate = { ...draft, text, updatedAt: new Date().toISOString() };
  const nextHash = await hashSocialDraftContent(candidate);
  const approvalStillValid = Boolean(approvedHash && approvedHash === nextHash);

  return {
    ...candidate,
    contentHash: approvalStillValid ? nextHash : undefined,
    contentApproved: approvalStillValid,
    approval: approvalStillValid ? draft.approval : undefined,
    status: approvalStillValid ? draft.status : draft.mihmReview ? 'MIHM_REVIEWED' : 'DRAFT',
  };
}

export function archiveSocialDraft(draft: SocialDraft): SocialDraft {
  return {
    ...draft,
    status: 'ARCHIVED',
    updatedAt: new Date().toISOString(),
  };
}
