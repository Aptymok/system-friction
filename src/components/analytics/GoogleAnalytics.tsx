'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { GA_MEASUREMENT_ID, trackEvent, trackPageView } from '@/lib/analytics/client';

function internalDestination(anchor: HTMLAnchorElement) {
  try {
    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setTimeout(() => trackPageView(pathname || '/'), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const destination = internalDestination(anchor);
      if (!destination) return;
      const label = (anchor.getAttribute('data-analytics-label') || anchor.textContent || 'internal_link').trim();
      trackEvent('navigation_click', {
        destination,
        link_label: label,
        source_path: window.location.pathname,
      });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="sfi-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            transport_type: 'beacon'
          });
        `}
      </Script>
    </>
  );
}
