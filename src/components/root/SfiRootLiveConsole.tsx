'use client';

import RootFieldExactConsole from './RootFieldExactConsole';

type RootFieldExactConsoleProps = Parameters<typeof RootFieldExactConsole>[0];

export default function SfiRootLiveConsole(props: RootFieldExactConsoleProps) {
  return <RootFieldExactConsole {...props} />;
}
