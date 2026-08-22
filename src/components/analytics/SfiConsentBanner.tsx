'use client';

import { useEffect, useState } from 'react';

type ConsentChoice = 'granted' | 'denied';

const STORAGE_KEY = 'sfi_google_consent_v1';

function updateConsent(choice: ConsentChoice) {
  const gtag = (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;
  gtag('consent', 'update', {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

export function SfiConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ConsentChoice | null;
    if (stored === 'granted' || stored === 'denied') {
      updateConsent(stored);
      return;
    }
    setVisible(true);
  }, []);

  const choose = (choice: ConsentChoice) => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    updateConsent(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Preferencias de privacidad"
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: '50%',
        bottom: 18,
        transform: 'translateX(-50%)',
        width: 'min(760px, calc(100vw - 28px))',
        border: '1px solid rgba(210,165,92,.32)',
        background: 'rgba(4,6,6,.86)',
        backdropFilter: 'blur(16px)',
        color: '#d7c7ad',
        padding: '16px 18px',
        boxShadow: '0 22px 80px rgba(0,0,0,.55)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'grid', gap: 9 }}>
        <strong style={{ color: '#d4a968', letterSpacing: '.08em' }}>PRIVACIDAD Y MEDICIÓN</strong>
        <span style={{ fontSize: 13, lineHeight: 1.55 }}>
          SFI usa Google Analytics para medir el uso del sitio. Puedes permitir o rechazar el almacenamiento analítico y publicitario. La operación institucional de SFI no depende de esta elección.
        </span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={() => choose('denied')} style={{ border: '1px solid rgba(210,165,92,.24)', background: 'transparent', color: '#bca985', padding: '9px 12px', cursor: 'pointer' }}>
            RECHAZAR
          </button>
          <button onClick={() => choose('granted')} style={{ border: '1px solid rgba(210,165,92,.48)', background: 'rgba(151,111,55,.16)', color: '#e2ba78', padding: '9px 12px', cursor: 'pointer' }}>
            ACEPTAR
          </button>
        </div>
      </div>
    </aside>
  );
}
