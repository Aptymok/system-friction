/** A readable label derived only from the tenant-authorized case index.
 * Case subjects such as SYSTEM and AI_SYSTEM describe the object type, NOT
 * the case identity. Never pass a UUID off as a user-readable case title. */
export function summarizeCaseScope(scope: unknown, maxLength = 110): string | null {
  if (typeof scope !== 'string') return null;
  const normalized = scope.replace(/\s+/g,' ').trim()
    .replace(/^(?:objeto|objetivo|alcance|scope)\s*:\s*/i,'');
  if (!normalized) return null;
  const first = normalized.match(/^.{8,}?\.(?=\s|$)/)?.[0] ?? normalized;
  const trimmed = first.replace(/[.!]+$/,'').trim();
  if (trimmed.length <= maxLength) return trimmed;
  const head = trimmed.slice(0,maxLength-1);
  const lastSpace = head.lastIndexOf(' ');
  return (lastSpace>maxLength*0.65?head.slice(0,lastSpace):head).trimEnd()+'…';
}
export function projectCaseLabel(input:{
  id: string;subject: string;scope?:unknown;projectName?:string|null;boundary?:string|null;
}) {
  const subject=input.subject.trim();
  const descriptive = summarizeCaseScope(input.scope);
  const meaningfulSubject = subject && !/^(SYSTEM|AI_SYSTEM|CASE|GENERAL|OTHER|UNKNOWN)$/i.test(subject)
    ? subject : null;
  const project=input.projectName?.trim()||null;
  const boundary=input.boundary?.trim()||null;
  const title=descriptive||meaningfulSubject||project||boundary||'Expediente sin nombre descriptivo';
  return {title, projectName:project, caseType:subject||'NO DEFINIDO',
    lacksDescription:!descriptive&&!meaningfulSubject&&!project&&!boundary};
}
