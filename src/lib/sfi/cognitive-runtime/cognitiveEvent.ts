import { randomUUID } from 'crypto';
import type { SFIEvent } from '../../../../packages/events/src/schema';

/**
 * Metadata adicional del evento cognitivo.
 *
 * No agrega autoridad ni decisión.
 * Solo conserva información sobre:
 *
 * - confianza de la fuente original (ej. AMV evidence trust)
 * - integridad de la traducción entre capas
 *
 * confidence sigue siendo la confianza epistemológica del evento.
 */
export type CognitiveEventMetadata = {
  sourceTrust?: string;
  translationIntegrity?: number;
};


/**
 * CognitiveEvent — ADR-005.
 *
 * Specialization of SFIEvent<TPayload>.
 *
 * Única diferencia obligatoria:
 * logbookId deja de ser opcional.
 *
 * ADR-007 establece que cada ciclo cognitivo posee un logbookId propio,
 * por lo tanto un evento cognitivo sin identidad de ciclo no puede ser
 * reconstruido posteriormente dentro de su trayectoria.
 *
 * No contiene:
 * - autoridad
 * - decisión
 * - lógica de negocio
 * - persistencia
 *
 * Su única responsabilidad es transportar una observación hacia el
 * Event Graph conservando su contexto.
 */
export type CognitiveEvent<TPayload = unknown> = SFIEvent<TPayload> & {
  logbookId: string;
  metadata?: CognitiveEventMetadata;
};


/**
 * Constructor de CognitiveEvent.
 *
 * Solo completa campos mecánicos:
 *
 * - eventId
 * - occurredAt
 *
 * No inventa significado:
 *
 * - epistemicClass
 * - confidence
 * - source
 *
 * pertenecen al componente que genera el evento.
 */
export function createCognitiveEvent<TPayload>(input: {
  eventName: string;

  epistemicClass: SFIEvent<TPayload>['epistemicClass'];

  confidence: number;

  payload: TPayload;

  logbookId: string;

  source?: SFIEvent<TPayload>['source'];

  lineage?: string[];

  uncertainty?: string;

  eventId?: string;

  occurredAt?: string;

  checksum?: string;

  metadata?: CognitiveEventMetadata;

}): CognitiveEvent<TPayload> {

  return {

    eventId: input.eventId ?? randomUUID(),

    eventName: input.eventName,

    epistemicClass: input.epistemicClass,

    confidence: input.confidence,

    payload: input.payload,

    occurredAt:
      input.occurredAt ?? new Date().toISOString(),

    source: input.source,

    checksum: input.checksum,

    lineage: input.lineage ?? [],

    uncertainty: input.uncertainty,

    logbookId: input.logbookId,

    metadata: input.metadata,

  };
}