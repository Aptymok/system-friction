type LocalNodeForMigration = {
  localNodeId: string;
  declaredObjective?: string;
  dailyActivity?: string;
  recurrentActivity?: string;
  advancementLoop?: string;
  declaredEntityType?: string;
  inferredPattern?: string;
  puzzleSignals?: Record<string, unknown>;
  cognitiveTwinUxState?: Record<string, unknown>;
  supabaseAssetId?: string;
  paymentState?: string;
};

export async function migrateLocalNodeToSupabase(localNode: LocalNodeForMigration) {
  if (!localNode?.localNodeId) return { ok: false, reason: 'missing_local_node' };
  if (localNode.supabaseAssetId || localNode.paymentState === 'persisted') {
    return { ok: true, duplicate: true, assetId: localNode.supabaseAssetId };
  }

  const response = await fetch('/api/sfi/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_system: {
        name: localNode.declaredObjective || 'Nodo local SFI',
        type: localNode.declaredEntityType || 'usuario',
        source: 'local_landing_calibration',
      },
      objective: {
        declaration: localNode.declaredObjective || '',
        dailyActivity: localNode.dailyActivity || '',
        recurrentActivity: localNode.recurrentActivity || '',
        advancementLoop: localNode.advancementLoop || '',
      },
      state_vector: {
        status: 'pending_first_persistent_reading',
        source: 'local_landing_calibration',
      },
      current_phase: 'LOCAL_NODE_MIGRATED',
      metadata: {
        origin: 'local_landing_calibration',
        origin_local_node_id: localNode.localNodeId,
        puzzleSignals: localNode.puzzleSignals || {},
        inferredPattern: localNode.inferredPattern || null,
        cognitiveTwinUxState: localNode.cognitiveTwinUxState || {},
        declaredEntityType: localNode.declaredEntityType || null,
      },
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, reason: data?.error || 'asset_migration_failed' };
  const assetId = data?.asset?.asset_id;
  return { ok: true, assetId };
}
