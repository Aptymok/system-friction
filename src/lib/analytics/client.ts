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

export function trackEvent(eventName: SfiAnalyticsEvent, parameters: AnalyticsParameters = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, sanitize(parameters));
}

export function trackPageView(pathname: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const safePath = pathname.startsWith('/') ? pathname.split('?')[0].slice(0, 240) : '/';
  window.gtag('event', 'page_view', {
    page_path: safePath,
    page_location: `${window.location.origin}${safePath}`,
    page_title: document.title.slice(0, 120),
  });
}
