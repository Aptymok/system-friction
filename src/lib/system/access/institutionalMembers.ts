import type { SfiInstitutionalDomain, SfiInstitutionalRoleKey } from './institutionalRoles';

export type SfiExternalScope =
  | 'observe'
  | 'propose'
  | 'execute'
  | 'cases:read'
  | 'cases:write'
  | 'lab:read'
  | 'lab:write'
  | 'lab:run'
  | 'studio:read'
  | 'studio:content'
  | 'studio:run';

export type SfiInstitutionalMember = {
  email: string;
  displayName: string;
  title: string;
  role: 'operator' | 'controller' | 'observer';
  institutionalRole: SfiInstitutionalRoleKey;
  institutionalDomain: SfiInstitutionalDomain;
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
    displayName: 'Edwing Peredo Guadarrama',
    title: 'Director Institucional — System Friction Institute',
    role: 'controller',
    institutionalRole: 'institutional_director',
    institutionalDomain: 'institution',
    decisionAuthority: 'controller',
    // Director authority is institutional, not sovereign. ROOT currently mixes
    // institutional state with Founder Cognitive Twin / AMV state.
    workspace: '/member',
    modules: {
      field: true,
      studio: true,
      observatory: true,
      worldField: true,
      root: false,
    },
    external: {
      // External GPT authority deliberately remains an institutional operator.
      // Human directorship does not delegate identity administration or sovereignty to an agent.
      role: 'institutional_operator',
      scopes: [
        'observe',
        'propose',
        'execute',
        'cases:read',
        'cases:write',
        'lab:read',
        'lab:write',
        'lab:run',
        'studio:read',
        'studio:content',
        'studio:run',
      ],
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
