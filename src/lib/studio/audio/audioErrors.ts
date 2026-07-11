import type { StudioAudioErrorCode } from './audioTypes';

export class StudioAudioError extends Error {
  readonly code: StudioAudioErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(code: StudioAudioErrorCode, message: string, status = 400, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'StudioAudioError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isStudioAudioError(error: unknown): error is StudioAudioError {
  return error instanceof StudioAudioError;
}

export function toStudioAudioApiError(error: unknown) {
  if (isStudioAudioError(error)) {
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
    details: error instanceof Error ? error.message : 'Unknown Studio audio analysis failure.',
    context: {},
  };
}
