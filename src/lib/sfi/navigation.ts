export type SfiNavigationTrail = {
  selectedEntity: string | null;
  history: string[];
  trail: string[];
  filters: Record<string, string>;
  contextState: string;
};

export function createSfiNavigationState(selectedEntity: string | null): SfiNavigationTrail {
  return {
    selectedEntity,
    history: selectedEntity ? [selectedEntity] : [],
    trail: selectedEntity ? [`entity/${selectedEntity}`] : [],
    filters: { view: 'institutional' },
    contextState: selectedEntity ? 'entity_context_loaded' : 'exploration_ready',
  };
}
