export type StudioModality =
  | 'audio'
  | 'video'
  | 'image'
  | 'text'
  | 'community'
  | 'time_coordinate'
  | 'unknown';

export type StudioDatabaseObjectType =
  | 'music'
  | 'video'
  | 'image'
  | 'text'
  | 'community'
  | 'time_coordinate'
  | 'unknown';

export type StudioFeatureStatus = 'OBSERVED' | 'DERIVED' | 'DEGRADED' | 'MISSING' | 'FAILED';

export type StudioUploadDescriptor = {
  fileName: string;
  safeFileName: string;
  extension: string;
  mimeType: string | null;
  sizeBytes: number;
  title: string;
  modality: StudioModality;
  objectType: StudioDatabaseObjectType;
};

export type StudioGenericFeature = {
  key: string;
  label: string;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
  source: string;
  confidence: number | null;
  status: StudioFeatureStatus;
  explanation: string;
  warnings: string[];
  payload?: Record<string, unknown>;
};

export type StudioMultimodalAnalysisResult = {
  ok: true;
  objectId: string;
  jobId: string;
  modality: Exclude<StudioModality, 'unknown'>;
  status: 'COMPLETE' | 'DEGRADED';
  engine: string;
  engineVersion: string;
  checksumSha256: string;
  featureCount: number;
  warnings: string[];
  details?: Record<string, unknown>;
};

export type StudioPreparedUpload = {
  objectId: string;
  sessionId: string;
  uploadId: string;
  storagePath: string;
  signedToken: string;
  descriptor: StudioUploadDescriptor;
};

export type StudioStoredObject = {
  object: Record<string, unknown>;
  upload: Record<string, unknown>;
  bytes: Buffer;
  byteLength: number;
  checksumSha256: string;
  storagePath: string;
};

export class StudioMultimodalError extends Error {
  constructor(
    public readonly code:
      | 'AUTH_REQUIRED'
      | 'OWNER_REQUIRED'
      | 'OBJECT_NOT_FOUND'
      | 'UPLOAD_NOT_FOUND'
      | 'UPLOAD_NOT_COMPLETE'
      | 'UNSUPPORTED_FILE_TYPE'
      | 'FILE_TOO_LARGE'
      | 'STORAGE_DOWNLOAD_FAILED'
      | 'EXTRACTION_RUNTIME_UNAVAILABLE'
      | 'TRANSCODE_FAILED'
      | 'DOCUMENT_PARSE_FAILED'
      | 'IMAGE_ANALYSIS_FAILED'
      | 'VIDEO_ANALYSIS_FAILED'
      | 'PERSISTENCE_FAILED'
      | 'ANALYSIS_FAILED',
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'StudioMultimodalError';
  }
}

export function toStudioMultimodalApiError(error: unknown) {
  if (error instanceof StudioMultimodalError) {
    return {
      ok: false,
      error: error.code,
      details: error.message,
      context: error.details,
    };
  }

  return {
    ok: false,
    error: 'ANALYSIS_FAILED',
    details: error instanceof Error ? error.message : String(error),
  };
}
