export type TelemetryProvider = 'github' | 'medium' | 'linkedin' | 'x' | 'twitter' | 'instagram' | 'tiktok' | 'telegram' | 'rss' | 'manual'

export interface RawSignal {
  provider: TelemetryProvider
  external_id?: string
  raw_text: string
  raw_payload: Record<string, unknown>
  published_at?: string
}

export interface TelemetryConnector {
  provider: TelemetryProvider
  ingest(input: Record<string, unknown>): Promise<RawSignal[]>
}
