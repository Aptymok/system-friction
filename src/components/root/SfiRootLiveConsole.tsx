'use client';

import RootConsoleScreen from './RootConsoleScreen';
import { RootConsoleInstitutionalOverride } from './RootConsoleInstitutionalOverride';

type RootConsoleScreenProps = Parameters<typeof RootConsoleScreen>[0];

export default function SfiRootLiveConsole(props: RootConsoleScreenProps) {
  return (
    <>
      <RootConsoleInstitutionalOverride />
      <RootConsoleScreen {...props} />
    </>
  );
}
