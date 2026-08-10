import { mean, clamp01 } from './utils.mjs';
import { CONSTITUTIONS } from './constitutions.mjs';

function futureLeak(answer, cutoffYear, targetYear) {
  const text = JSON.stringify(answer);
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  return years.some((y) => y > targetYear); // naming the forecast target year itself is allowed
}

export function scoreAnswers(problems, answers, { constitutionId, engineId, year }) {
  const byProblem = new Map(problems.map((p) => [p.problemId, p]));
  const rows = [];
  for (const answer of answers) {
    const p = byProblem.get(answer.problemId); if (!p) continue;
    const outcome = p.hiddenOutcome?.direction;
    const answered = answer.decision !== 'ABSTAIN';
    const hit = answered && answer.decision === outcome ? 1 : 0;
    const evidenceIds = new Set(p.evidenceCatalog.map((e) => e.evidenceId));
    const invalidEvidence = (answer.evidenceUsed || []).filter((id) => !evidenceIds.has(id));
    const requiredMethod = p.requiredMethod?.id || null;
    const sfiMode = CONSTITUTIONS[constitutionId]?.sfiMode || 'NONE';
    const methodCompliance = requiredMethod && sfiMode !== 'NONE' ? Number((answer.sfiMethods || []).includes(requiredMethod)) : 1;
    const sfiBoundaryViolation = sfiMode === 'NONE' && ((answer.sfiMethods || []).length > 0 || (answer.agentsUsed || []).length > 0);
    const leaked = futureLeak(answer, p.year, p.targetYear);
    const confidence = clamp01(answer.confidence);
    rows.push({
      problemId: p.problemId, type: p.type, outcome, decision: answer.decision, confidence,
      answered, hit, brier: answered ? (confidence - hit) ** 2 : null,
      rivals: (answer.rivals || []).length,
      evidenceInvalid: invalidEvidence.length,
      methodCompliance,
      agentUse: Array.isArray(answer.agentsUsed) && answer.agentsUsed.length ? 1 : 0,
      sfiBoundaryViolation: sfiBoundaryViolation ? 1 : 0,
      temporalViolation: leaked ? 1 : 0,
      abstentionJustified: answer.decision === 'ABSTAIN' && (!p.history || p.history.length < 2) ? 1 : 0,
    });
  }
  const answeredRows = rows.filter((r) => r.answered);
  const abstained = rows.filter((r) => !r.answered);
  const score = {
    year, constitutionId, engineId, problems: rows.length,
    coverage: rows.length ? answeredRows.length / rows.length : 0,
    accuracy: answeredRows.length ? mean(answeredRows.map((r) => r.hit)) : 0,
    brier: answeredRows.length ? mean(answeredRows.map((r) => r.brier)) : 1,
    rivalRate: rows.length ? mean(rows.map((r) => Number(r.rivals > 0))) : 0,
    evidenceDiscipline: rows.length ? 1 - mean(rows.map((r) => Number(r.evidenceInvalid > 0))) : 0,
    sfiMethodCompliance: rows.length ? mean(rows.map((r) => r.methodCompliance)) : 0,
    agentUseRate: rows.length ? mean(rows.map((r) => r.agentUse)) : 0,
    sfiBoundaryIntegrity: rows.length ? 1 - mean(rows.map((r) => r.sfiBoundaryViolation)) : 1,
    temporalIntegrity: rows.length ? 1 - mean(rows.map((r) => r.temporalViolation)) : 0,
    abstentionRate: rows.length ? abstained.length / rows.length : 0,
    abstentionQuality: abstained.length ? mean(abstained.map((r) => r.abstentionJustified)) : 1,
  };
  score.composite = 0.36 * score.accuracy + 0.14 * (1 - score.brier) + 0.12 * score.evidenceDiscipline + 0.12 * score.temporalIntegrity + 0.08 * score.rivalRate + 0.05 * score.sfiMethodCompliance + 0.02 * score.agentUseRate + 0.03 * score.sfiBoundaryIntegrity + 0.08 * score.coverage;
  return { score, rows };
}
