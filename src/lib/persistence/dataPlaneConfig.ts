import 'server-only';

export const DEFAULT_SFI_NEON_DATA_API_URL =
  'https://ep-aged-fog-awnq9sns.apirest.c-12.us-east-1.aws.neon.tech/sfi_continuity/rest/v1';

export const SFI_DATA_PLANE_MIRROR_TTL_MS = 2 * 60 * 60 * 1000;

export function sfiNeonDataApiUrl() {
  return (process.env.SFI_NEON_DATA_API_URL || DEFAULT_SFI_NEON_DATA_API_URL).trim().replace(/\/$/, '');
}
