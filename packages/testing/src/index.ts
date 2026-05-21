export type FixtureSourceState = 'fixture' | 'simulated';

export type DeclaredFixture<TData = unknown> = {
  fixtureId: string;
  sourceState: FixtureSourceState;
  description: string;
  data: TData;
};

