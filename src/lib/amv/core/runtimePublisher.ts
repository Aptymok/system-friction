import type { AmvEvidenceRecord } from '@/lib/amv/core/evidenceTypes';
import { evaluateAmvEvidence } from '@/lib/amv/agents/evidenceAgent';
import { buildAmvGraph } from '@/lib/amv/core/amvGraphBuilder';

import {
  wrapEvidenceReading,
  wrapGraphReading,
} from '@/lib/sfi/cognitive-runtime/amvReading';

import {
  relayPhenomenonReading,
} from '@/lib/sfi/cognitive-runtime/PhenomenonRelay';

import {
  appendEpistemicEvent,
} from '@/lib/events/eventStore';


const RUNTIME_SCHEMA =
  '2026-07-26.sfi-amv-runtime-publisher.v1';


export async function publishAmvEvidenceIntoRuntime(
  evidence: AmvEvidenceRecord,
  logbookId: string,
)
{

  const result = evaluateAmvEvidence(evidence);

  const reading = wrapEvidenceReading(
    evidence.sourceId,
    result
  );


  const cognitiveEvent =
    relayPhenomenonReading(
      reading,
      logbookId
    );


  const appended =
    await appendEpistemicEvent({
      ...cognitiveEvent,
      schemaVersion: RUNTIME_SCHEMA,
    });


  console.log(
    '[AMV_RUNTIME_APPEND]',
    JSON.stringify(appended, null, 2)
  );


  return appended;
}



export async function publishAmvGraphIntoRuntime(
  scope: string,
  subject: string,
  logbookId: string,
) {

  const graph =
    buildAmvGraph(
      scope,
      subject
    );


  const reading =
    wrapGraphReading(
      scope,
      graph
    );


  const cognitiveEvent =
    relayPhenomenonReading(
      reading,
      logbookId
    );


  const appended =
    await appendEpistemicEvent({
      ...cognitiveEvent,
      schemaVersion: RUNTIME_SCHEMA,
    });


  console.log(
    '[AMV_GRAPH_APPEND]',
    JSON.stringify(appended, null, 2)
  );


  return appended;
}