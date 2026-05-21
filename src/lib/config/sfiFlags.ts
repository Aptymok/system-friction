export type SfiRuntimeFlags = {
  canonicalFieldRead: boolean;
};

function envFlag(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function getSfiRuntimeFlags(): SfiRuntimeFlags {
  return {
    canonicalFieldRead: envFlag(process.env.SFI_CANONICAL_FIELD_READ),
  };
}

export const SFI_CANONICAL_FIELD_READ_DEFAULT = false;
