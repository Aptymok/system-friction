export type SfiInstitutionalMember = {
  email: string;
  displayName: string;
  role: 'operator' | 'controller';
  workspace: '/member';
  modules: {
    field: boolean;
    studio: boolean;
    observatory: boolean;
    worldField: boolean;
    root: false;
  };
};

const MEMBERS: SfiInstitutionalMember[] = [
  {
    email: 'edwin.tzolkin@gmail.com',
    displayName: 'Edwin',
    role: 'operator',
    workspace: '/member',
    modules: {
      field: true,
      studio: true,
      observatory: true,
      worldField: true,
      root: false,
    },
  },
];

export function normalizeMemberEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function findInstitutionalMember(email: string | null | undefined) {
  const normalized = normalizeMemberEmail(email);
  return MEMBERS.find((member) => member.email === normalized) ?? null;
}

export const SFI_INSTITUTIONAL_MEMBERS = MEMBERS;
