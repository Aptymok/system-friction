import {
  fixtureAsset,
  fixtureFieldContext,
  fixtureIntervention,
  fixtureMetrics,
  fixtureProjection,
  fixtureReport,
  evaluatorFixtureNotice,
} from './fixtures';

export type EvaluatorPrototypeState = {
  readonly: true;
  fixtureOnly: true;
  notice: string;
  asset: typeof fixtureAsset;
  metrics: typeof fixtureMetrics;
  fieldContext: typeof fixtureFieldContext;
  report: typeof fixtureReport;
  projection: typeof fixtureProjection;
  intervention: typeof fixtureIntervention;
};

export function buildEvaluatorPrototypeState(): EvaluatorPrototypeState {
  return {
    readonly: true,
    fixtureOnly: true,
    notice: evaluatorFixtureNotice,
    asset: fixtureAsset,
    metrics: fixtureMetrics,
    fieldContext: fixtureFieldContext,
    report: fixtureReport,
    projection: fixtureProjection,
    intervention: fixtureIntervention,
  };
}
