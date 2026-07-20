'use client';

import { useState } from 'react';
import PpoiPhenomenonWizard from '@/components/root/PpoiPhenomenonWizard';

export default function RootPageClient() {

  const [
    showPpoiWizard,
    setShowPpoiWizard
  ] = useState(false);


  const [
    initialPpoiName,
    setInitialPpoiName
  ] = useState('');


  return (
    <>
      {showPpoiWizard && (
        <PpoiPhenomenonWizard
          initialName={initialPpoiName}

          onCreated={(phenomenon) => {
            setShowPpoiWizard(false);

            window.location.href =
              `/root/phenomena/${phenomenon.id}`;
          }}

          onCancel={() => {
            setShowPpoiWizard(false);
          }}
        />
      )}
    </>
  );
}