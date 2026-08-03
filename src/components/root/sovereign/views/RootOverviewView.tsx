'use client';

import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection, RootViewId } from '../sovereignTypes';
import { RootCartographyView } from './RootCartographyView';
import './root-cartography-overlay.css';

export function RootOverviewView({
  state,
  onSelect,
}: {
  state: RootSovereignState;
  onSelect: (selection: RootSelection) => void;
}) {
  function navigate(view: RootViewId) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.location.assign(url.toString());
  }

  return (
    <RootCartographyView
      state={state}
      onSelect={onSelect}
      onNavigate={navigate}
    />
  );
}
