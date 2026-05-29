import { asRecord, asStringArray, clamp01, numberValue, stringValue, type MihmRuntimeMatrix } from './fieldMatrixBuilder';

function latest(rows?: unknown[]) {
  return Array.isArray(rows) && rows.length > 0 ? asRecord(rows[0]) : null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberValue(source[key]);
    if (typeof value === 'number') return value;
  }
  return null;
}

function regimeFrom(ihg: number | null, nti: number | null, ldi: number | null) {
  if (ihg === null && nti === null && ldi === null) return 'missing';
  if ((nti ?? 0) > 0.66 || (ldi ?? 0) > 0.66) return 'critical';
  if ((ihg ?? 0) > 0.58) return 'homeostatic';
  return 'transition';
}

export function buildMihmRuntimeMatrix(input: {
  mihmAnalyses?: unknown[];
  kernel?: unknown;
  worldspect?: unknown;
  graph?: { nodes?: unknown[]; edges?: unknown[] } | null;
  logbookSignals?: unknown[];
}): MihmRuntimeMatrix {
  const warnings: string[] = [];
  const observed = latest(input.mihmAnalyses);
  if (observed) {
    const payload = asRecord(observed.payload || observed.result || observed.analysis);
    const vector = asRecord(observed.homeostatic_vector || payload.homeostatic_vector || payload.homeostaticVector);
    const visible = asRecord(observed.visible_variables || payload.visible_variables || payload.visibleVariables);
    const sensitive = asRecord(observed.sensitive_variables || payload.sensitive_variables || payload.sensitiveVariables);
    const ihg = pickNumber(observed, ['ihg', 'IHG']) ?? pickNumber(vector, ['ihg', 'IHG']);
    const nti = pickNumber(observed, ['nti', 'NTI', 'nti_obs']) ?? pickNumber(vector, ['nti', 'NTI', 'NTI_obs']);
    const ldi = pickNumber(observed, ['ldi', 'LDI', 'ldi_hours']) ?? pickNumber(vector, ['ldi', 'LDI', 'LDI_hours']);
    const phi = pickNumber(observed, ['phi', 'PHI_SF']) ?? pickNumber(vector, ['phi', 'PHI_SF']);
    return {
      ihg,
      nti,
      ldi,
      phi,
      regime: stringValue(observed.regime, payload.regime, regimeFrom(ihg, nti, ldi)) ?? regimeFrom(ihg, nti, ldi),
      sourceState: 'observed',
      contributingNodes: asStringArray(visible.contributingNodes || visible.nodes),
      contributingEvidence: asStringArray(visible.contributingEvidence || visible.evidence).concat(asStringArray(sensitive.evidence)),
      warnings,
    };
  }

  warnings.push('mihm_analyses_empty_derived_from_field');
  const kernel = asRecord(input.kernel);
  const kernelMihm = asRecord(kernel.mihm_state || kernel.mihm);
  const worldspect = asRecord(input.worldspect);
  const graphNodes = Array.isArray(input.graph?.nodes) ? input.graph.nodes.map(asRecord) : [];
  const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const ihg = pickNumber(kernelMihm, ['IHG', 'ihg']) ?? pickNumber(worldspect, ['ihg', 'wsi']) ?? avg(graphNodes.map((node) => clamp01(node.co_n ?? asRecord(node.attributes).co_n ?? 0)).filter(Number.isFinite));
  const nti = pickNumber(kernelMihm, ['NTI', 'NTI_obs', 'nti']) ?? pickNumber(worldspect, ['nti']) ?? avg(graphNodes.map((node) => clamp01(node.d_n ?? asRecord(node.attributes).d_n ?? 0)).filter(Number.isFinite));
  const ldi = pickNumber(kernelMihm, ['LDI', 'LDI_hours', 'ldi']) ?? avg(graphNodes.map((node) => clamp01(node.u_n ?? asRecord(node.attributes).u_n ?? 0)).filter(Number.isFinite));
  const phi = pickNumber(kernelMihm, ['PHI_SF', 'phi']) ?? (typeof ihg === 'number' && typeof nti === 'number' ? clamp01((ihg * (1 - nti))) : null);

  const hasDerived = ihg !== null || nti !== null || ldi !== null || phi !== null;
  if (!hasDerived) warnings.push('mihm_runtime_fallback_missing_field_sources');

  return {
    ihg,
    nti,
    ldi,
    phi,
    regime: regimeFrom(ihg, nti, ldi),
    sourceState: hasDerived ? 'derived' : 'missing',
    contributingNodes: graphNodes.slice(0, 12).map((node) => stringValue(node.nodeId, node.node_key, node.label)).filter((item): item is string => Boolean(item)),
    contributingEvidence: asStringArray(asRecord(kernelMihm.evidence).ids),
    warnings,
  };
}
