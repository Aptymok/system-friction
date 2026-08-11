import { EXPERIMENT_VERSION, START_YEAR, END_YEAR } from './config.mjs';
import { CONSTITUTIONS } from './constitutions.mjs';
import { SFI_METHODS, FOUNDER_EDITION_SOURCE } from './sfi-methods.mjs';

export const METHOD_LAB_CONTRACT_VERSION = 'SFI-METHOD-LAB-RUN-1.0';
export const METHOD_LAB_PROTOCOL_ID = 'chronos_olympics';

export function experimentManifest() {
  return {
    experiment: 'SFI Cognitive Olympics 2026',
    version: EXPERIMENT_VERSION,
    methodLab: {
      contractVersion: METHOD_LAB_CONTRACT_VERSION,
      protocolId: METHOD_LAB_PROTOCOL_ID,
      protocolVersion: '2026-08-11.chronos.v1',
      epistemicClass: 'SIMULATED',
      validationLevel: 'RETROSPECTIVE',
      promotionAllowed: false,
      institutionalPersistence: false,
      persistence: 'local append-only .sfi-cl ledger until a governed import is requested',
    },
    motto: 'No se trata de llegar. Se trata de aprender a saber llegar.',
    years: { start: START_YEAR, end: END_YEAR },
    objectUnderTest: 'Cognitive Twin and derived cognitive constitutions under System Friction Institute constraints; forecasting/learning algorithms are instruments, not claimed SFI inventions.',
    tracks: {
      A: 'historical replay; current historical series may contain revision/model-weight leakage and is not the definitive validation',
      B: 'shadow-world replay with pseudonymized entities/indicators to reduce recognition effects',
      C: 'prospective live validation from 2026 forward; definitive temporal test when outcomes occur',
    },
    rules: [
      'future partition is never exposed to an athlete',
      'predictions are hashed before outcomes are scored',
      'same datasets and scoring are used for comparable heats',
      'an unregistered failure cannot be relabeled retrospectively as an experimental perturbation',
      'model engine, cognitive constitution, SFI access and learning policy are separately recorded',
      'SFI auxiliary methods keep their original canon/stability status',
      'all outputs remain SIMULATED and cannot self-promote into canonical state',
    ],
    constitutions: CONSTITUTIONS,
    auxiliaryMethodSource: FOUNDER_EDITION_SOURCE,
    sfiMethods: SFI_METHODS,
  };
}
