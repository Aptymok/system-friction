import { findInstitutionalMember } from './institutionalMembers';

type ProfileLike = Record<string, unknown> | null | undefined;

export type FounderAuthoritySource =
  | 'configured_user_id'
  | 'configured_email'
  | 'explicit_sovereign_profile'
  | null;

export type FounderAuthorityResolution = {
  isFounder: boolean;
  source: FounderAuthoritySource;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function configuredFounderIds() {
  return new Set(
    (process.env.SFI_FOUNDER_USER_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function configuredFounderEmails() {
  return new Set(
    [process.env.SYSTEM_ROOT_EMAIL, ...(process.env.SFI_FOUNDER_EMAILS || '').split(',')]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
}

export function isConfiguredFounderIdentity(input: {
  userId?: string | null;
  email?: string | null;
}) {
  const email = input.email?.trim().toLowerCase() || null;
  return (
    Boolean(input.userId && configuredFounderIds().has(input.userId)) ||
    Boolean(email && configuredFounderEmails().has(email))
  );
}

export function resolveFounderAuthority(input: {
  userId?: string | null;
  email?: string | null;
  profile?: ProfileLike;
}): FounderAuthorityResolution {
  if (input.userId && configuredFounderIds().has(input.userId)) {
    return { isFounder: true, source: 'configured_user_id' };
  }

  const email = input.email?.trim().toLowerCase() || null;
  if (email && configuredFounderEmails().has(email)) {
    return { isFounder: true, source: 'configured_email' };
  }

  const profile = record(input.profile);
  const role = typeof profile.role === 'string' ? profile.role : null;
  const moduleAccess = record(profile.module_access);
  const registeredInstitutionalMember = Boolean(findInstitutionalMember(email));
  const explicitSovereignProfile =
    !registeredInstitutionalMember &&
    (role === 'root' || role === 'system') &&
    moduleAccess.full_access === true;

  if (explicitSovereignProfile) {
    return { isFounder: true, source: 'explicit_sovereign_profile' };
  }

  return { isFounder: false, source: null };
}
