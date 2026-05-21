import type { FieldStateDTO, LogEntryDTO, NodeStateDTO, SourceHealthDTO } from './index';

export type TerminalReadModelWarning = {
  code: string;
  message: string;
};

export type TerminalCanonicalReadModel = {
  fieldState: FieldStateDTO | null;
  nodeState: NodeStateDTO | null;
  logs: LogEntryDTO[];
  sourceHealth: SourceHealthDTO[];
  warnings: TerminalReadModelWarning[];
};

export type TerminalCanonicalReadModelInput = {
  fieldState?: FieldStateDTO | null;
  nodeState?: NodeStateDTO | null;
  logs?: LogEntryDTO[];
  sourceHealth?: SourceHealthDTO[];
};

function arrayOrEmpty<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function buildTerminalCanonicalReadModel(
  input: TerminalCanonicalReadModelInput,
): TerminalCanonicalReadModel {
  const warnings: TerminalReadModelWarning[] = [];

  if (!input.fieldState) {
    warnings.push({
      code: 'missing_field_state',
      message: 'FieldState unavailable. Terminal must not infer field truth locally.',
    });
  }

  if (!input.nodeState) {
    warnings.push({
      code: 'missing_node_state',
      message: 'NodeState unavailable. Terminal must not infer node truth locally.',
    });
  }

  return {
    fieldState: input.fieldState ?? null,
    nodeState: input.nodeState ?? null,
    logs: arrayOrEmpty(input.logs),
    sourceHealth: arrayOrEmpty(input.sourceHealth),
    warnings,
  };
}
