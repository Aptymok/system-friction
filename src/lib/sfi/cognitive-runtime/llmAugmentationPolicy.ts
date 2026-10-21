/**
 * Shared cognitive-agent LLM admission. An explicit false is a hard model-off
 * control even when an institutional Cognitive Spine snapshot was consumed.
 * The established governed-spine default continues when the value is unset.
 */
export function agentLlmAugmentationAllowed(
  agentId: string,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (metadata?.llmAugmentation === false) return false;
  const governedUniversalAi = metadata?.ctSnapshotConsumed === true
    && metadata?.aiGovernancePolicyId === 'SFI-AIMS-2026-08';
  if (metadata?.llmAugmentation !== true && !governedUniversalAi) return false;
  const allowlist = metadata?.llmAugmentationAgents;
  if (!Array.isArray(allowlist)) return true;
  return allowlist.includes(agentId);
}
