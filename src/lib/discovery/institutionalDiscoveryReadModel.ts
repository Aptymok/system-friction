import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { projectInstitutionalDiscoveryMesh } from './institutionalDiscoveryMesh';

export const SFI_INSTITUTIONAL_DISCOVERY_READ_CONTRACT = 'SFI-INSTITUTIONAL-DISCOVERY-READ-1.0' as const;

const NODE_LIMIT = 200;
const EDGE_LIMIT = 400;
const TRAJECTORY_LIMIT = 300;

type Row = Record<string, unknown>;

type BoundedResult = {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  rows: Row[];
  sampleLimit: number;
  sampleSaturated: boolean;
  warning: string | null;
};

function result(data: unknown, error: { message?: string } | null | undefined, sampleLimit: number): BoundedResult {
  if (error) return { availability: 'UNAVAILABLE', rows: [], sampleLimit, sampleSaturated: false, warning: error.message ?? 'read_unavailable' };
  const rows = Array.isArray(data) ? data.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
  return { availability: 'AVAILABLE', rows, sampleLimit, sampleSaturated: rows.length >= sampleLimit, warning: null };
}

export async function readInstitutionalDiscoveryMesh() {
  const db = createServiceSupabaseClient();
  const [nodesQuery, edgesQuery, trajectoryQuery] = await Promise.all([
    db.from('graph_nodes')
      .select('id,node_id,label,ontology_type,lineage,attributes,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(NODE_LIMIT),
    db.from('graph_edges')
      .select('id,edge_id,source_node_id,target_node_id,relation,weight,lineage,attributes,created_at,updated_at')
      .order('updated_at', { ascending: false })
      .limit(EDGE_LIMIT),
    db.from('sfi_artifact_trajectory_events')
      .select('id,object_ref,parent_event_id,platform,source_uri,observed_at,relation,content_hash,marker_ref,evidence_refs,semantic_state,payload,created_at')
      .order('observed_at', { ascending: false })
      .limit(TRAJECTORY_LIMIT),
  ]);

  const nodes = result(nodesQuery.data, nodesQuery.error, NODE_LIMIT);
  const edges = result(edgesQuery.data, edgesQuery.error, EDGE_LIMIT);
  const trajectory = result(trajectoryQuery.data, trajectoryQuery.error, TRAJECTORY_LIMIT);
  const mesh = projectInstitutionalDiscoveryMesh({
    graphNodes: nodes.rows,
    graphEdges: edges.rows,
    trajectoryEvents: trajectory.rows,
  });
  const availability = [nodes.availability, edges.availability, trajectory.availability].includes('UNAVAILABLE')
    ? 'DEGRADED' as const
    : 'AVAILABLE' as const;

  return {
    ok: availability === 'AVAILABLE',
    contract: SFI_INSTITUTIONAL_DISCOVERY_READ_CONTRACT,
    availability,
    mesh,
    readPlan: {
      dbQueries: 3,
      exactCountProbes: 0,
      pollingLoops: 0,
      nPlusOneReads: 0,
      graphNodes: { sampled: nodes.rows.length, sampleLimit: nodes.sampleLimit, sampleSaturated: nodes.sampleSaturated, availability: nodes.availability },
      graphEdges: { sampled: edges.rows.length, sampleLimit: edges.sampleLimit, sampleSaturated: edges.sampleSaturated, availability: edges.availability },
      trajectoryEvents: { sampled: trajectory.rows.length, sampleLimit: trajectory.sampleLimit, sampleSaturated: trajectory.sampleSaturated, availability: trajectory.availability },
    },
    warnings: [nodes.warning, edges.warning, trajectory.warning].filter((value): value is string => Boolean(value)),
    epistemicBoundary: {
      samplesAreNotTotals: true,
      missingGraphRowsAreNotNegativeEvidence: true,
      unsupportedRelationsDoNotBecomeSemanticEdges: true,
      founderForcedOutreachDoesNotBecomePull: true,
    },
  };
}
