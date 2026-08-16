'use client';

export const GA_MEASUREMENT_ID = 'G-7YKTPLX3QD';

type AnalyticsPrimitive = string | number | boolean | null | undefined;
export type AnalyticsParameters = Record<string, AnalyticsPrimitive>;

export type SfiAnalyticsEvent =
  | 'page_view'
  | 'navigation_click'
  | 'hub_open'
  | 'field_flow_start'
  | 'field_step_complete'
  | 'field_return_open'
  | 'evidence_intake_start'
  | 'reference_case_open'
  | 'instrument_status_open'
  | 'contact_intent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const FORBIDDEN_KEYS = new Set([
  'email',
  'phone',
  'name',
  'full_name',
  'content',
  'text',
  'evidence',
  'objective',
  'query',
  'message',
  'description',
  'user_id',
  'actor_id',
]);

const CAMPAIGN_QUERY_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

function safeString(value: string) {
  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 120);
}

function sanitize(parameters: AnalyticsParameters = {}) {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(parameters)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || FORBIDDEN_KEYS.has(normalizedKey) || value === null || typeof value === 'undefined') continue;
    if (typeof value === 'string') {
      const normalized = safeString(value);
      if (normalized) result[normalizedKey] = normalized;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) result[normalizedKey] = value;
    if (typeof value === 'boolean') result[normalizedKey] = value;
  }
  return result;
}

function allowlistedCampaignQuery() {
  const result = new URLSearchParams();
  if (typeof window === 'undefined') return result;
  const current = new URLSearchParams(window.location.search);
  for (const key of CAMPAIGN_QUERY_KEYS) {
    const raw = current.get(key);
    if (!raw) continue;
    const normalized = safeString(raw);
    if (normalized) result.set(key, normalized);
  }
  return result;
}

export function trackEvent(eventName: SfiAnalyticsEvent, parameters: AnalyticsParameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, sanitize(parameters));
}

export function trackPageView(pathname: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const safePath = pathname.startsWith('/') ? pathname.split('?')[0].slice(0, 240) : '/';
  const campaign = allowlistedCampaignQuery();
  const query = campaign.toString();
  const attributedPath = query ? `${safePath}?${query}` : safePath;
  const parameters: AnalyticsParameters = {
    page_path: attributedPath,
    page_location: `${window.location.origin}${attributedPath}`,
    page_title: document.title.slice(0, 120),
    campaign_source: campaign.get('utm_source'),
    campaign_medium: campaign.get('utm_medium'),
    campaign_name: campaign.get('utm_campaign'),
    campaign_content: campaign.get('utm_content'),
  };
  window.gtag('event', 'page_view', sanitize(parameters));
}
