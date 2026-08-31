import { structuredResultMatchesSignalIdentity, type UniversalObservationIdentity } from '@/lib/sfi/universalObservationIdentity';

type Row = Record<string, unknown>;

type ResumeIdentityInput = {
  openedPayload: unknown;
  structuredResults: unknown[];
  hydrationEventId: string | null;
  hydrationBasis: string | null;
  resumeCycleId: string;
  normalizedSignal: UniversalObservationIdentity & { name?: string | null };
};

export type UniversalResumeIdentityResolution = {
  matches: boolean;
  basis:
    | 'EXACT_OBJECT_KEY'
    | 'MATERIAL_HASH_MATCH'
    | 'CANONICAL_REFERENCE_TO_MATERIAL_UPGRADE'
    | 'MATERIAL_HASH_CONFLICT'
    | 'NO_CANONICAL_IDENTITY_BRIDGE';
  openedObjectKey: string | null;
  currentObjectKey: string;
  openedObjectHash: string | null;
  currentObjectHash: string;
  structuredResultEventId: string | null;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizedLocator(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith('url:')) return `url:${normalized.slice(4)}`;
  const assetMarker = ':asset:';
  const assetIndex = normalized.indexOf(assetMarker);
  if (assetIndex >= 0) return `asset:${normalized.slice(assetIndex + assetMarker.length)}`;
  const separator = normalized.indexOf(':');
  const reference = separator >= 0 ? normalized.slice(separator + 1) : normalized;
  return `name:${reference.replace(/\\/g, '/').split('/').pop() ?? reference}`;
}

function filenameLocator(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  const normalized = candidate.toLowerCase().replace(/\\/g, '/');
  return `name:${normalized.split('/').pop() ?? normalized}`;
}

function structuredResultAliases(payloadValue: unknown) {
  const payload = row(payloadValue);
  const object = row(payload.object);
  const result = row(payload.result);
  const profile = row(result.profile);
  const profileSource = row(profile.source);
  const resultSource = row(result.source);
  const aliases = new Set<string>();

  for (const value of [payload.objectKey, object.objectKey]) {
    const locator = normalizedLocator(text(value));
    if (locator) aliases.add(locator);
  }

  for (const value of [
    object.name,
    object.logicalFilename,
    object.observedTransportFilename,
    object.filename,
    object.fileName,
    result.logicalFilename,
    result.observedTransportFilename,
    profileSource.logicalFilename,
    profileSource.observedTransportFilename,
    profileSource.filename,
    resultSource.logicalFilename,
    resultSource.observedTransportFilename,
    resultSource.filename,
  ]) {
    const locator = filenameLocator(value);
    if (locator) aliases.add(locator);
  }

  const assetRef = text(payload.assetRef) ?? text(object.assetRef);
  if (assetRef) aliases.add(`asset:${assetRef.toLowerCase()}`);
  return aliases;
}

function structuredResultMaterialHash(payloadValue: unknown) {
  const payload = row(payloadValue);
  const object = row(payload.object);
  const result = row(payload.result);
  const profile = row(result.profile);
  const source = row(profile.source);
  return text(payload.objectHash)
    ?? text(object.objectHash)
    ?? text(object.contentHash)
    ?? text(object.fingerprint)
    ?? text(source.contentHash);
}

export function resolveUniversalResumeIdentity(input: ResumeIdentityInput): UniversalResumeIdentityResolution {
  const opened = row(input.openedPayload);
  const openedObjectKey = text(opened.objectKey);
  const openedObjectHash = text(opened.objectHash);
  const openedReferenceHash = text(opened.referenceHash);
  const openedHashBasis = text(opened.objectHashBasis);
  const current = input.normalizedSignal;
  const currentHasMaterialHash = current.objectHashBasis !== 'REFERENCE_IDENTITY';
  const openedHasMaterialHash = Boolean(openedObjectHash)
    && openedHashBasis !== 'REFERENCE_IDENTITY'
    && !(openedReferenceHash && openedObjectHash === openedReferenceHash);

  if (openedHasMaterialHash && currentHasMaterialHash && openedObjectHash !== current.objectHash) {
    return {
      matches: false,
      basis: 'MATERIAL_HASH_CONFLICT',
      openedObjectKey,
      currentObjectKey: current.objectKey,
      openedObjectHash,
      currentObjectHash: current.objectHash,
      structuredResultEventId: input.hydrationEventId,
    };
  }

  if (openedObjectKey && openedObjectKey === current.objectKey) {
    return {
      matches: true,
      basis: 'EXACT_OBJECT_KEY',
      openedObjectKey,
      currentObjectKey: current.objectKey,
      openedObjectHash,
      currentObjectHash: current.objectHash,
      structuredResultEventId: input.hydrationEventId,
    };
  }

  if (openedObjectHash && currentHasMaterialHash && openedObjectHash === current.objectHash) {
    return {
      matches: true,
      basis: 'MATERIAL_HASH_MATCH',
      openedObjectKey,
      currentObjectKey: current.objectKey,
      openedObjectHash,
      currentObjectHash: current.objectHash,
      structuredResultEventId: input.hydrationEventId,
    };
  }

  const openedReferenceOnly = openedHashBasis === 'REFERENCE_IDENTITY'
    || Boolean(openedReferenceHash && openedObjectHash && openedReferenceHash === openedObjectHash);
  const canAttemptCanonicalUpgrade = openedReferenceOnly
    && currentHasMaterialHash
    && input.hydrationBasis === 'SFI_STRUCTURED_ANALYSIS_RESULT_RECEIVED'
    && Boolean(input.hydrationEventId);

  if (canAttemptCanonicalUpgrade) {
    const hydrationEvent = input.structuredResults
      .map(row)
      .find((event) => text(event.event_id) === input.hydrationEventId);
    const payload = row(hydrationEvent?.payload);
    const eventCycleId = text(payload.cycleId);
    const materialHash = structuredResultMaterialHash(payload);
    const openedLocator = normalizedLocator(openedObjectKey);
    const aliases = structuredResultAliases(payload);
    const stableReferenceMatch = Boolean(openedLocator && aliases.has(openedLocator));
    const currentMatchesCanonicalResult = eventCycleId === input.resumeCycleId
      && structuredResultMatchesSignalIdentity(payload, current, input.resumeCycleId);
    const materialHashMatch = Boolean(materialHash && materialHash === current.objectHash);

    if (stableReferenceMatch && currentMatchesCanonicalResult && materialHashMatch) {
      return {
        matches: true,
        basis: 'CANONICAL_REFERENCE_TO_MATERIAL_UPGRADE',
        openedObjectKey,
        currentObjectKey: current.objectKey,
        openedObjectHash,
        currentObjectHash: current.objectHash,
        structuredResultEventId: input.hydrationEventId,
      };
    }
  }

  return {
    matches: false,
    basis: 'NO_CANONICAL_IDENTITY_BRIDGE',
    openedObjectKey,
    currentObjectKey: current.objectKey,
    openedObjectHash,
    currentObjectHash: current.objectHash,
    structuredResultEventId: input.hydrationEventId,
  };
}
