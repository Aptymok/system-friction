import { AGENT_LOADER } from "./agentLoader";

export interface RuntimeDispatchRequest {

  agentId: string;

  input: unknown;

}

export interface RuntimeDispatchResult {

  ok: boolean;

  agentId: string;

  emittedEvent?: string;

  output?: unknown;

  confidence?: number;

  error?: string;

}

export async function runtimeDispatcher(
  request: RuntimeDispatchRequest
): Promise<RuntimeDispatchResult> {

  const handler =
    (AGENT_LOADER as Record<
      string,
      ((input: unknown) => unknown) | undefined
    >)[request.agentId];

  if (!handler) {

    return {

      ok: false,

      agentId: request.agentId,

      error:
        `No handler registered for ${request.agentId}`

    };

  }

  try {

    const result = await Promise.resolve(
      handler(request.input)
    ) as Record<string, unknown>;

    return {

      ok: true,

      agentId: request.agentId,

      emittedEvent:
        result.emittedEvent as string | undefined,

      confidence:
        result.confidence as number | undefined,

      output:
        result.output

    };

  } catch (error) {

    return {

      ok: false,

      agentId: request.agentId,

      error:
        error instanceof Error
          ? error.message
          : String(error)

    };

  }

}