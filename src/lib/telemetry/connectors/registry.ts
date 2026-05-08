import type { TelemetryConnector, TelemetryProvider } from './base'
import { manualConnector } from './manual'

const officialApiPlaceholder = (provider: TelemetryProvider): TelemetryConnector => ({
  provider,
  async ingest() {
    // TODO(vNEXT): implement only via official APIs/OAuth/webhooks. No scraping.
    return []
  }
})

export const telemetryConnectors: Record<TelemetryProvider, TelemetryConnector> = {
  github: officialApiPlaceholder('github'),
  medium: officialApiPlaceholder('medium'),
  linkedin: officialApiPlaceholder('linkedin'),
  x: officialApiPlaceholder('x'),
  telegram: officialApiPlaceholder('telegram'),
  rss: officialApiPlaceholder('rss'),
  manual: manualConnector
}
