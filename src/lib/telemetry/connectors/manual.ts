import type { TelemetryConnector } from './base'

export const manualConnector: TelemetryConnector = {
  provider: 'manual',
  async ingest(input) {
    return [
      {
        provider: 'manual',
        external_id: typeof input.external_id === 'string' ? input.external_id : undefined,
        raw_text: String(input.raw_text || ''),
        raw_payload: input,
        published_at: typeof input.published_at === 'string' ? input.published_at : undefined
      }
    ]
  }
}
