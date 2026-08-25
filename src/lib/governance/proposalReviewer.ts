import { findInstitutionalMember } from '@/lib/system/access/institutionalMembers';

export type ProposalReviewerAuthority = 'root' | 'controller' | null;

export function resolveProposalReviewerAuthority(ctx: {
  isRoot: boolean;
  user: { email?: string | null } | null;
}): ProposalReviewerAuthority {
  if (ctx.isRoot) return 'root';
  const member = findInstitutionalMember(ctx.user?.email);
  if (member?.decisionAuthority === 'controller' && member.modules.root) return 'controller';
  return null;
}
