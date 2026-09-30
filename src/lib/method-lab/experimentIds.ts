import { createHash } from 'node:crypto';

function deterministicAnalysisId(kind: 'preregistration'|'run'|'return', logicalId: string) {
  const hex = createHash('sha256').update(`method-lab:${kind}:${logicalId.trim()}`).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = 'a';
  const value = hex.join('');
  return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20,32)}`;
}

export function methodLabPreregistrationId(experimentId: string) {
  return deterministicAnalysisId('preregistration', experimentId);
}

export function methodLabRunId(runId: string) {
  return deterministicAnalysisId('run', runId);
}

export function methodLabReturnId(runId: string) {
  return deterministicAnalysisId('return', runId);
}
