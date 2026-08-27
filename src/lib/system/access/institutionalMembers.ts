export type SfiExternalScope =
  | 'observe'
  | 'propose'
  | 'execute'
  | 'lab:read'
  | 'lab:write'
  | 'lab:run';

export type SfiInstitutionalMember = {
  email: string;
  displayName: string;
  role: 'operator' | 'controller' | 'observer';
  decisionAuthority?: 'controller';
  workspace: '/member' | '/root';
  modules: {
    field: boolean;
    studio: boolean;
    observatory: boolean;
    worldField: boolean;
    root: boolean;
  };
  external: {
    role: 'agent' | 'institutional_operator';
    scopes: readonly SfiExternalScope[];
  };
};

const MEMBERS: SfiInstitutionalMember[] = [
  {
    email: 'edwin.tzolkin@gmail.com',
    displayName: 'Edwin',
    role: 'observer',
    decisionAuthority: 'controller',
    workspace: '/root',
    modules: {
      field: true,
      studio: true,
      observatory: true,
      worldField: true,
      root: true,
    },
    external: {
      role: 'institutional_operator',
      scopes: ['observe', 'propose', 'execute', 'lab:read', 'lab:write', 'lab:run'],
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
