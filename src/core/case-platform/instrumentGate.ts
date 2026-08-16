import type { SfiCaseV1, SfiInstrumentKind } from '../contracts/sfi';
import { getSfiServiceProfile } from './serviceProfiles';

export type SfiInstrumentAccessAssessment = {
  allowed: boolean;
  instrumentKind: SfiInstrumentKind;
  requiredSources: string[];
  presentSources: string[];
  missingSources: string[];
  reasons: string[];
  outputsBecomeEvidenceByInheritance: false;
  truthAuthority: false;
  executionAuthority: false;
};

export function assessSfiInstrumentAccess(input: {
  caseRecord: SfiCaseV1;
  instrumentKind: SfiInstrumentKind;
  presentSourceTypes: string[];
}): SfiInstrumentAccessAssessment {
  const profile = getSfiServiceProfile(input.caseRecord.serviceProfileId);
  const reasons: string[] = [];
  const presentSources = Array.from(new Set(input.presentSourceTypes.map((value) => value.trim()).filter(Boolean))).sort();
  const requiredSources = profile ? [...profile.requiredSources] : [];
  const missingSources = requiredSources.filter((source) => !presentSources.includes(source));

  if (!profile) reasons.push('SERVICE_PROFILE_UNKNOWN');
  if (profile && !(profile.allowedInstruments as readonly string[]).includes(input.instrumentKind)) {
    reasons.push('INSTRUMENT_NOT_ALLOWED_BY_SERVICE_PROFILE');
  }
  if (missingSources.length) reasons.push('REQUIRED_SOURCES_MISSING');
  if (['CLOSED', 'REJECTED'].includes(input.caseRecord.status)) reasons.push('CASE_NOT_EXECUTABLE');

  return {
    allowed: reasons.length === 0,
    instrumentKind: input.instrumentKind,
    requiredSources,
    presentSources,
    missingSources,
    reasons,
    outputsBecomeEvidenceByInheritance: false,
    truthAuthority: false,
    executionAuthority: false,
  };
}
