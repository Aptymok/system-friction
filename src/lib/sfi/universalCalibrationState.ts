type CalibrationEvent = Record<string, unknown>;

function record(value: unknown): CalibrationEvent {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as CalibrationEvent : {};
}

function eventOrder(event: CalibrationEvent, index: number) {
  const parsed = Number(event.sequence);
  return { sequence: Number.isFinite(parsed) ? parsed : null, index };
}

function compareOrder(a: { sequence: number | null; index: number }, b: { sequence: number | null; index: number }) {
  if (a.sequence !== null && b.sequence !== null && a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.index - b.index;
}

export function hasVerifiedLatestUniversalReturnCalibration(events: CalibrationEvent[]) {
  const indexed = events.map((event, index) => ({ event: record(event), order: eventOrder(record(event), index) }));
  const latestReturn = indexed
    .filter(({ event }) => event.event_name === 'SFI_UNIVERSAL_RETURN_RECORDED')
    .sort((a, b) => compareOrder(a.order, b.order))
    .at(-1);
  const returnEventId = latestReturn && typeof latestReturn.event.event_id === 'string' ? latestReturn.event.event_id : null;
  if (!latestReturn || !returnEventId) return false;

  const latestContrast = indexed
    .filter(({ event, order }) => {
      if (event.event_name !== 'SFI_UNIVERSAL_RETURN_CONTRASTED') return false;
      if (compareOrder(order, latestReturn.order) <= 0) return false;
      return Array.isArray(event.lineage) && event.lineage.includes(returnEventId);
    })
    .sort((a, b) => compareOrder(a.order, b.order))
    .at(-1);

  const payload = record(latestContrast?.event.payload);
  return payload.calibrationStatus === 'CONTRAST_RECORDED'
    && ['CONFIRMED', 'PARTIAL', 'CONTRADICTED'].includes(String(payload.classification))
    && payload.returnTraceability === 'VERIFIED_EVIDENCE_LINKED'
    && Array.isArray(payload.returnEvidenceRefs)
    && payload.returnEvidenceRefs.length > 0;
}
