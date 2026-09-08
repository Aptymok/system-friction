import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { buildStudioUploadDescriptor, studioAnalysisLimitBytes } from '@/lib/studio/multimodal/detect';
import {
  completeStudioSignedUpload,
  prepareStudioSignedUpload,
  STUDIO_OBJECT_BUCKET,
} from '@/lib/studio/multimodal/storage';
import { StudioMultimodalError } from '@/lib/studio/multimodal/types';

type Row = Record<string, unknown>;

type ChatGptFileRef = {
  name: string;
  id: string;
  mimeType: string | null;
  downloadLink: string;
};

export type StudioAnalysisAuthorization = {
  authorizedForAnalysis: true;
  basis: 'operator_owned' | 'authorized_by_rightsholder' | 'session_specific_permission';
  note?: string | null;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function parseSingleChatGptFileRef(value: unknown): ChatGptFileRef {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new StudioMultimodalError(
      'OPENAI_FILE_REFERENCE_REQUIRED',
      'Exactly one ChatGPT conversation file is required for Studio attachment intake.',
      400,
      { expectedParameter: 'openaiFileIdRefs', expectedCount: 1 },
    );
  }

  const ref = row(value[0]);
  const parsed = {
    name: text(ref.name),
    id: text(ref.id),
    mimeType: text(ref.mime_type) || null,
    downloadLink: text(ref.download_link),
  };
  if (!parsed.name || !parsed.id || !parsed.downloadLink) {
    throw new StudioMultimodalError(
      'OPENAI_FILE_REFERENCE_INVALID',
      'ChatGPT did not provide a usable file reference for the attached object.',
      400,
      { expectedFields: ['name', 'id', 'mime_type', 'download_link'] },
    );
  }
  return parsed;
}

function assertOpenAiAttachmentUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new StudioMultimodalError('OPENAI_FILE_URL_INVALID', 'The ChatGPT attachment URL is invalid.', 400);
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || (host !== 'files.oaiusercontent.com' && !host.endsWith('.oaiusercontent.com'))) {
    throw new StudioMultimodalError(
      'OPENAI_FILE_URL_FORBIDDEN',
      'Studio attachment intake only accepts temporary ChatGPT file URLs from the OpenAI file host.',
      400,
      { host },
    );
  }
  return url;
}

function parseAnalysisAuthorization(value: unknown): StudioAnalysisAuthorization {
  const declaration = row(value);
  const basis = text(declaration.basis);
  const allowedBases = new Set<StudioAnalysisAuthorization['basis']>([
    'operator_owned',
    'authorized_by_rightsholder',
    'session_specific_permission',
  ]);
  if (declaration.authorizedForAnalysis !== true || !allowedBases.has(basis as StudioAnalysisAuthorization['basis'])) {
    throw new StudioMultimodalError(
      'ANALYSIS_AUTHORIZATION_REQUIRED',
      'An explicit operator declaration authorizing analysis of this attachment is required.',
      400,
      {
        legalEffect: 'DECLARATION_ONLY_NOT_RIGHTS_TRANSFER',
        allowedBases: [...allowedBases],
      },
    );
  }
  return {
    authorizedForAnalysis: true,
    basis: basis as StudioAnalysisAuthorization['basis'],
    note: text(declaration.note) || null,
  };
}

async function downloadBoundedAttachment(ref: ChatGptFileRef) {
  const url = assertOpenAiAttachmentUrl(ref.downloadLink);
  const maxBytes = studioAnalysisLimitBytes('audio');
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) {
    throw new StudioMultimodalError(
      'OPENAI_FILE_DOWNLOAD_FAILED',
      `ChatGPT attachment download failed with HTTP ${response.status}.`,
      response.status === 404 || response.status === 410 ? 409 : 502,
      { openaiFileId: ref.id },
    );
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new StudioMultimodalError('FILE_TOO_LARGE', 'Attached audio exceeds the synchronous Studio analysis limit.', 413, {
      declaredLength,
      limit: maxBytes,
    });
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    sizeBytes += value.byteLength;
    if (sizeBytes > maxBytes) {
      await reader.cancel('studio_attachment_limit_exceeded');
      throw new StudioMultimodalError('FILE_TOO_LARGE', 'Attached audio exceeds the synchronous Studio analysis limit.', 413, {
        sizeBytes,
        limit: maxBytes,
      });
    }
    chunks.push(value);
  }

  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), sizeBytes);
  if (!bytes.byteLength) {
    throw new StudioMultimodalError('OPENAI_FILE_DOWNLOAD_EMPTY', 'The attached ChatGPT file contained no bytes.', 409, {
      openaiFileId: ref.id,
    });
  }
  return bytes;
}

export async function ingestAndAnalyzeChatGptAudioAttachment(input: {
  ownerId: string;
  openaiFileIdRefs: unknown;
  analysisAuthorization: unknown;
  title?: unknown;
  force?: boolean;
}) {
  const ref = parseSingleChatGptFileRef(input.openaiFileIdRefs);
  const analysisAuthorization = parseAnalysisAuthorization(input.analysisAuthorization);
  const bytes = await downloadBoundedAttachment(ref);

  // Detect from filename/MIME evidence first. This operation may not override a
  // non-audio attachment into the music object class merely because the caller
  // selected ingest_analyze.
  const descriptor = buildStudioUploadDescriptor({
    fileName: ref.name,
    mimeType: ref.mimeType,
    sizeBytes: bytes.byteLength,
    title: input.title,
  });
  if (descriptor.modality !== 'audio') {
    throw new StudioMultimodalError('AUDIO_ATTACHMENT_REQUIRED', 'This Studio operation accepts one audio file only.', 415, {
      fileName: descriptor.fileName,
      modality: descriptor.modality,
      mimeType: descriptor.mimeType,
    });
  }

  const prepared = await prepareStudioSignedUpload({ descriptor, ownerId: input.ownerId });
  const db = createServiceSupabaseClient();
  const uploaded = await db.storage.from(STUDIO_OBJECT_BUCKET).upload(prepared.storagePath, bytes, {
    contentType: descriptor.mimeType ?? 'application/octet-stream',
    upsert: false,
  });
  if (uploaded.error) {
    await Promise.all([
      db.from('studio_uploads').update({ status: 'failed' }).eq('id', prepared.uploadId),
      db.from('studio_objects').update({ status: 'failed' }).eq('id', prepared.objectId),
    ]);
    throw new StudioMultimodalError('PERSISTENCE_FAILED', uploaded.error.message, 503, { objectId: prepared.objectId });
  }

  await completeStudioSignedUpload(prepared.objectId, input.ownerId);

  const current = await db.from('studio_objects').select('metadata').eq('id', prepared.objectId).maybeSingle();
  const metadata = {
    ...row(current.data?.metadata),
    externalIntake: {
      contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.0',
      source: 'chatgpt_action_attachment',
      openaiFileId: ref.id,
      originalFileName: ref.name,
      mimeType: ref.mimeType,
      receivedAt: new Date().toISOString(),
      temporaryDownloadUrlPersisted: false,
      analysisAuthorization: {
        ...analysisAuthorization,
        epistemicClass: 'DECLARED',
        legalEffect: 'ANALYSIS_PERMISSION_DECLARATION_ONLY_NOT_RIGHTS_TRANSFER',
      },
    },
  };
  const metadataUpdate = await db.from('studio_objects')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', prepared.objectId)
    .eq('owner_id', input.ownerId);
  if (metadataUpdate.error) {
    // Provenance is part of admission, not optional decoration. If it cannot be
    // persisted, make the materialized object unusable and remove its bytes so a
    // later retry cannot leave an owner-visible attachment without intake lineage.
    await Promise.allSettled([
      db.storage.from(STUDIO_OBJECT_BUCKET).remove([prepared.storagePath]),
      db.from('studio_uploads').update({ status: 'failed' }).eq('id', prepared.uploadId),
      db.from('studio_objects').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', prepared.objectId),
    ]);
    throw new StudioMultimodalError('PERSISTENCE_FAILED', metadataUpdate.error.message, 503, {
      objectId: prepared.objectId,
      provenancePersisted: false,
      materializationUsable: false,
    });
  }

  const analysis = await analyzeStudioAudioObject(prepared.objectId, {
    force: input.force === true,
    requestedByUserId: input.ownerId,
  });

  return {
    objectId: prepared.objectId,
    sessionId: prepared.sessionId,
    file: {
      name: ref.name,
      openaiFileId: ref.id,
      mimeType: ref.mimeType,
      sizeBytes: bytes.byteLength,
    },
    authority: {
      analysisAuthorization,
      epistemicClass: 'DECLARED',
      rightsTransfer: false,
      canonicalPromotion: false,
    },
    observation: analysis,
  };
}
