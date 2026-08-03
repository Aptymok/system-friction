'use client';

import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection, RootViewId } from '../sovereignTypes';
import { RootAutonomousGovernance } from './RootAutonomousGovernance';
import { RootCartographyView } from './RootCartographyView';
import './root-cartography-overlay.css';

export function RootOverviewView({
  state,
  onSelect,
  onOpenTool,
}: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  onOpenTool?: (view: RootViewId) => void;
}) {
  return (
    <>
      <RootCartographyView
        state={state}
        onSelect={onSelect}
        onNavigate={(view) => onOpenTool?.(view)}
      />
      <RootAutonomousGovernance state={state} />
    </>
  );
}
