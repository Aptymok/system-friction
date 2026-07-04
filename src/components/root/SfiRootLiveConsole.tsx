'use client';

import RootLiveObservatory from './RootLiveObservatory';

type RootLiveObservatoryProps = Parameters<typeof RootLiveObservatory>[0];

export default function SfiRootLiveConsole(props: RootLiveObservatoryProps) {
  return <RootLiveObservatory {...props} />;
}
