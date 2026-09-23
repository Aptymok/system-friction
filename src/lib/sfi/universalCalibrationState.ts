type CalibrationEvent = Record<string, unknown>;
type IndexedCalibrationEvent = {
  event: CalibrationEvent;
  order: { sequence: number | null; index: number };
};

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

function indexEvents(events: CalibrationEvent[]): IndexedCalibrationEvent[] {
  return events.map((value, index) => {
    const event = record(value);
    return { event, order: eventOrder(event, index) };
  });
}

function latestNamed(indexed: IndexedCalibrationEvent[], eventName: string) {
  return indexed
    .filter(({ event }) => event.event_name === eventName)
    .sort((a, b) => compareOrder(a.order, b.order))
    .at(-1) ?? null;
}

function verifiedLatestReturnCalibration(indexed: IndexedCalibrationEvent[]) {
  const latestReturn = latestNamed(indexed, 'SFI_UNIVERSAL_RETURN_RECORDED');
  const returnEventId = latestReturn && typeof latestReturn.event.event_id === 'string' ? latestReturn.event.event_id : null;
  if (!latestReturn || !returnEventId) return null;

  const latestContrast = indexed
    .filter(({ event, order }) => {
      if (event.event_name !== 'SFI_UNIVERSAL_RETURN_CONTRASTED') return false;
      if (compareOrder(order, latestReturn.order) <= 0) return false;
      return Array.isArray(event.lineage) && event.lineage.includes(returnEventId);
    })
    .sort((a, b) => compareOrder(a.order, b.order))
    .at(-1) ?? null;

  const payload = record(latestContrast?.event.payload);
  const valid = payload.calibrationStatus === 'CONTRAST_RECORDED'
    && ['CONFIRMED', 'PARTIAL', 'CONTRADICTED'].includes(String(payload.classification))
    && payload.returnTraceability === 'VERIFIED_EVIDENCE_LINKED'
    && Array.isArray(payload.returnEvidenceRefs)
    && payload.returnEvidenceRefs.length > 0;
  return valid && latestContrast ? { latestReturn, latestContrast } : null;
}

export function hasVerifiedLatestUniversalReturnCalibration(events: CalibrationEvent[]) {
  return Boolean(verifiedLatestReturnCalibration(indexEvents(events)));
}

export function getCurrentUniversalClosureRecommendation(events: CalibrationEvent[]) {
  const indexed = indexEvents(events);
  const calibration = verifiedLatestReturnCalibration(indexed);
  if (!calibration) return null;

  const recommendation = latestNamed(indexed, 'SFI_UNIVERSAL_CLOSURE_RECOMMENDED');
  if (!recommendation) return null;
  if (latestNamed(indexed, 'SFI_UNIVERSAL_CYCLE_CLOSED')) return null;

  const denial = latestNamed(indexed, 'SFI_UNIVERSAL_REPORT_DENIED_BY_USER');
  if (compareOrder(recommendation.order, calibration.latestContrast.order) <= 0) return null;
  if (denial && compareOrder(recommendation.order, denial.order) <= 0) return null;

  const contrastEventId = typeof calibration.latestContrast.event.event_id === 'string'
    ? calibration.latestContrast.event.event_id
    : null;
  if (!contrastEventId || !Array.isArray(recommendation.event.lineage) || !recommendation.event.lineage.includes(contrastEventId)) {
    return null;
  }
  return recommendation.event;
}
