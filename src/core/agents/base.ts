import type {
  AgentDefinition,
  KernelContext,
  AgentResult,
} from '@/core/contracts'

export abstract class SfiAgent {
  abstract definition: AgentDefinition

  abstract execute(
    context: KernelContext
  ): Promise<AgentResult>
}