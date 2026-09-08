import 'server-only';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { hashPerformance } from '@/lib/studio/audio/acoustic/acousticPackageContract';
import { buildStudioUploadDescriptor } from '@/lib/studio/multimodal/detect';
import { completeStudioSignedUpload, loadStudioObjectBytes, prepareStudioSignedUpload, STUDIO_OBJECT_BUCKET } from '@/lib/studio/multimodal/storage';
import { cleanupMaterialProductionWorkspace, runMaterialProduction } from './productionLoop';
import type { MaterialProductionMode, MaterialProductionReceipt } from './types';

type Row = Record<string, unknown>;
export type MaterialProductionAuthorization = { authorizedForProduction: true; basis: 'operator_owned' | 'authorized_by_rightsholder' | 'session_specific_permission'; note?: string | null };
function row(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }

export function parseMaterialProductionAuthorization(value: unknown): MaterialProductionAuthorization {
  const declaration = row(value);
  const basis = typeof declaration.basis === 'string' ? declaration.basis : '';
  if (declaration.authorizedForProduction !== true || !['operator_owned', 'authorized_by_rightsholder', 'session_specific_permission'].includes(basis)) {
    const error = new Error('Explicit authorization to process/render the source audio is required.');
    Object.assign(error, { code: 'MATERIAL_PRODUCTION_AUTHORIZATION_REQUIRED', status: 400 });
    throw error;
  }
  return { authorizedForProduction: true, basis: basis as MaterialProductionAuthorization['basis'], note: typeof declaration.note === 'string' && declaration.note.trim() ? declaration.note.trim() : null };
}

function durableReceipt(receipt: MaterialProductionReceipt, objectId: string): MaterialProductionReceipt {
  return {
    ...receipt,
    outputs: receipt.outputs.map((output) => output.kind === 'master' ? { ...output, ref: `studio:${objectId}` } : output),
    lineage: [...receipt.lineage, `durable-output:studio:${objectId}`],
  };
}

function cleanupStudioProductionWorkspace(workspace: string) {
  try {
    fs.rmSync(workspace, { recursive: true, force: true });
    return 'PASS' as const;
  } catch {
    return 'FAIL' as const;
  }
}

async function withdrawProducedObject(input: { objectId: string; uploadId: string; storagePath: string }) {
  const db = createServiceSupabaseClient();
  const [uploadState, objectState] = await Promise.all([
    db.from('studio_uploads').update({ status: 'failed' }).eq('id', input.uploadId),
    db.from('studio_objects').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', input.objectId),
  ]);
  const removal = await db.storage.from(STUDIO_OBJECT_BUCKET).remove([input.storagePath]);
  const failures = [
    uploadState.error ? `upload:${uploadState.error.message}` : null,
    objectState.error ? `object:${objectState.error.message}` : null,
    removal.error ? `storage:${removal.error.message}` : null,
  ].filter(Boolean);
  if (failures.length) throw new Error(`SFI_AUDIO_MATERIAL_OUTPUT_WITHDRAWAL_FAILED:${failures.join('|')}`);
}

export async function produceStudioAudioObject(input: { ownerId: string; sourceObjectId: string; mode: MaterialProductionMode; productionAuthorization: unknown; bpm?: number; key?: string; culturalProfile?: string; instrumentIds?: { harmony?: string; bass?: string }; forceAnalysis?: boolean }) {
  const authorization = parseMaterialProductionAuthorization(input.productionAuthorization);
  const source = await loadStudioObjectBytes(input.sourceObjectId);
  if (source.object.owner_id !== input.ownerId) {
    const error = new Error('Studio source ownership is required.');
    Object.assign(error, { code: 'OWNER_REQUIRED', status: 403 });
    throw error;
  }
  const sourceMime = String(source.object.mime_type || source.upload.mime_type || '');
  if (!sourceMime.startsWith('audio/')) {
    const error = new Error('Material production requires an audio Studio object.');
    Object.assign(error, { code: 'AUDIO_SOURCE_REQUIRED', status: 415 });
    throw error;
  }

  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sfi-studio-production-'));
  const sourcePath = path.join(workspace, 'source.wav');
  const outputDir = path.join(workspace, 'result');
  fs.writeFileSync(sourcePath, source.bytes);
  let materialWorkspace: string | null = null;
  let outerWorkspaceCleaned = false;
  let admitted: { objectId: string; uploadId: string; storagePath: string } | null = null;
  let published = false;

  try {
    const beforeObservation = await analyzeStudioAudioObject(input.sourceObjectId, { force: input.forceAnalysis === true, requestedByUserId: input.ownerId });
    const produced = await runMaterialProduction({
      mode: input.mode,
      sourcePath,
      sourceRef: `studio:${input.sourceObjectId}`,
      outputDirectory: outputDir,
      authorizationRef: `studio:run:${input.ownerId}:${input.sourceObjectId}`,
      bpm: input.bpm,
      key: input.key,
      culturalProfile: input.culturalProfile,
      instrumentIds: input.instrumentIds,
    });
    materialWorkspace = produced.workspace;

    const performanceArtifacts = produced.performances.map((performance) => ({
      ref: `performance:${performance.performanceId}`,
      sha256: hashPerformance(performance),
      performance,
    }));
    for (const renderReceipt of produced.renderReceipts) {
      const artifact = performanceArtifacts.find((candidate) => candidate.ref === renderReceipt.performanceRef);
      if (!artifact || artifact.sha256 !== renderReceipt.performanceHash) {
        const error = new Error(`Render performance lineage cannot be reconstructed:${renderReceipt.performanceRef}`);
        Object.assign(error, { code: 'MATERIAL_PERFORMANCE_LINEAGE_FAILED', status: 503 });
        throw error;
      }
    }

    const cleanupState = cleanupMaterialProductionWorkspace(materialWorkspace);
    materialWorkspace = null;
    produced.receipt.cleanupState = cleanupState;
    if (cleanupState !== 'PASS') {
      produced.receipt.returnState = 'RETURN_FAIL';
      const error = new Error('Material production workspace cleanup could not be proven.');
      Object.assign(error, { code: 'MATERIAL_WORKSPACE_CLEANUP_FAILED', status: 503 });
      throw error;
    }

    const finalBytes = fs.readFileSync(produced.finalPath);
    const outerCleanupState = cleanupStudioProductionWorkspace(workspace);
    outerWorkspaceCleaned = outerCleanupState === 'PASS';
    if (!outerWorkspaceCleaned) {
      produced.receipt.returnState = 'RETURN_FAIL';
      const error = new Error('Studio production workspace cleanup could not be proven before publication.');
      Object.assign(error, { code: 'STUDIO_PRODUCTION_WORKSPACE_CLEANUP_FAILED', status: 503 });
      throw error;
    }
    produced.receipt.lineage.push('outer-workspace-cleanup:PASS');

    const finalName = input.mode === 'VOICE_MUSICALIZE' ? 'sfi-musicalized-master.wav' : 'sfi-adjusted-master.wav';
    const descriptor = buildStudioUploadDescriptor({ fileName: finalName, mimeType: 'audio/wav', sizeBytes: finalBytes.byteLength, title: input.mode === 'VOICE_MUSICALIZE' ? 'SFI Musicalized Master' : 'SFI Adjusted Master' });
    const prepared = await prepareStudioSignedUpload({ descriptor, ownerId: input.ownerId, metadata: { materialProduction: {
      contract: 'SFI-MATERIAL-AUDIO-RETURN-1.0',
      mode: input.mode,
      sourceObjectId: input.sourceObjectId,
      authorization: { ...authorization, epistemicClass: 'DECLARED', legalEffect: 'PROCESSING_PERMISSION_ONLY_NOT_RIGHTS_TRANSFER' },
      returnState: 'PENDING_REOBSERVATION',
      rightsTransfer: false,
      canonicalPromotion: false,
    } } });
    admitted = { objectId: prepared.objectId, uploadId: prepared.uploadId, storagePath: prepared.storagePath };

    const db = createServiceSupabaseClient();
    const receipt = durableReceipt(produced.receipt, prepared.objectId);
    const initialMetadataRead = await db.from('studio_objects').select('metadata').eq('id', prepared.objectId).eq('owner_id', input.ownerId).maybeSingle();
    if (initialMetadataRead.error || !initialMetadataRead.data) {
      const error = new Error(initialMetadataRead.error?.message ?? 'Material output metadata could not be read before persistence.');
      Object.assign(error, { code: 'MATERIAL_RETURN_LINEAGE_FAILED', status: 503 });
      throw error;
    }
    const initialMetadata = {
      ...row(initialMetadataRead.data.metadata),
      materialProduction: {
        ...row(row(initialMetadataRead.data.metadata).materialProduction),
        receipt,
        effectiveParameters: receipt.effectiveParameters,
        renderReceipts: produced.renderReceipts,
        performanceArtifacts,
      },
    };
    const lineageWrite = await db.from('studio_objects').update({ metadata: initialMetadata, updated_at: new Date().toISOString() }).eq('id', prepared.objectId).eq('owner_id', input.ownerId);
    if (lineageWrite.error) {
      const error = new Error(lineageWrite.error.message);
      Object.assign(error, { code: 'MATERIAL_RETURN_LINEAGE_FAILED', status: 503 });
      throw error;
    }

    const uploaded = await db.storage.from(STUDIO_OBJECT_BUCKET).upload(prepared.storagePath, finalBytes, { contentType: 'audio/wav', upsert: false });
    if (uploaded.error) {
      const error = new Error(uploaded.error.message);
      Object.assign(error, { code: 'MATERIAL_OUTPUT_PERSISTENCE_FAILED', status: 503 });
      throw error;
    }
    await completeStudioSignedUpload(prepared.objectId, input.ownerId);
    published = true;

    const afterObservation = await analyzeStudioAudioObject(prepared.objectId, { force: true, requestedByUserId: input.ownerId });
    const metadataRead = await db.from('studio_objects').select('metadata').eq('id', prepared.objectId).eq('owner_id', input.ownerId).maybeSingle();
    if (metadataRead.error || !metadataRead.data) {
      const error = new Error(metadataRead.error?.message ?? 'Material output metadata could not be read.');
      Object.assign(error, { code: 'MATERIAL_RETURN_LINEAGE_FAILED', status: 503 });
      throw error;
    }
    const metadata = {
      ...row(metadataRead.data.metadata),
      materialProduction: {
        ...row(row(metadataRead.data.metadata).materialProduction),
        receipt,
        effectiveParameters: receipt.effectiveParameters,
        renderReceipts: produced.renderReceipts,
        performanceArtifacts,
        returnState: receipt.returnState,
        sourceObservationObjectId: input.sourceObjectId,
        resultObservationObjectId: prepared.objectId,
        beforeObservationRecorded: true,
        afterObservationRecorded: true,
        rightsTransfer: false,
        canonicalPromotion: false,
      },
    };
    const update = await db.from('studio_objects').update({ metadata, updated_at: new Date().toISOString() }).eq('id', prepared.objectId).eq('owner_id', input.ownerId);
    if (update.error) {
      const error = new Error(update.error.message);
      Object.assign(error, { code: 'MATERIAL_RETURN_LINEAGE_FAILED', status: 503 });
      throw error;
    }

    return {
      sourceObjectId: input.sourceObjectId,
      resultObjectId: prepared.objectId,
      mode: input.mode,
      authorization: { ...authorization, epistemicClass: 'DECLARED', rightsTransfer: false },
      receipt,
      renderReceipts: produced.renderReceipts,
      performanceRefs: performanceArtifacts.map(({ ref, sha256 }) => ({ ref, sha256 })),
      beforeObservation,
      afterObservation,
      canonicalPromotion: false,
    };
  } catch (error) {
    if (admitted) {
      try {
        await withdrawProducedObject(admitted);
      } catch (withdrawalError) {
        const combined = new Error(`${error instanceof Error ? error.message : String(error)}; ${withdrawalError instanceof Error ? withdrawalError.message : String(withdrawalError)}`);
        Object.assign(combined, { code: 'MATERIAL_OUTPUT_WITHDRAWAL_FAILED', status: 503, publishedBeforeWithdrawal: published });
        throw combined;
      }
    }
    throw error;
  } finally {
    if (materialWorkspace) cleanupMaterialProductionWorkspace(materialWorkspace);
    if (!outerWorkspaceCleaned) cleanupStudioProductionWorkspace(workspace);
  }
}
