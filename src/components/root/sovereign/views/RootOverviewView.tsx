'use client';

import type { ReactNode } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection, RootViewId } from '../sovereignTypes';
import { RootCartographyView } from './RootCartographyView';
import './root-cartography-overlay.css';

type EmbeddedView = Exclude<RootViewId, 'overview'>;

export function RootOverviewView({
  state,
  onSelect,
  embeddedView,
  embeddedPanel,
  onOpenPanel,
  onClosePanel,
}: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
  embeddedView: EmbeddedView | null;
  embeddedPanel: ReactNode;
  onOpenPanel: (view: EmbeddedView) => void;
  onClosePanel: () => void;
}) {
  return (
    <RootCartographyView
      state={state}
      onSelect={onSelect}
      embeddedView={embeddedView}
      embeddedPanel={embeddedPanel}
      onOpenPanel={onOpenPanel}
      onClosePanel={onClosePanel}
    />
  );
}
