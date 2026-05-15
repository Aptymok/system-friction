// src/components/auth/WorldSpectrumModal.tsx
'use client';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { AnonDashboard } from '@/components/dashboard/AnonDashboard';

export function WorldSpectrumModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // Aquí podrías registrar el correo para estadísticas o enviar un token
      setAccessGranted(true);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="terminal-panel w-full max-w-4xl max-h-[90vh] overflow-auto bg-void border border-gold/20">
          {!accessGranted ? (
            <div className="p-6">
              <Dialog.Title className="text-xl font-mono text-gold mb-4 uppercase tracking-widest">World Spectrum Observability</Dialog.Title>
              <p className="text-sm text-zinc-400 mb-4">Ingresa tu correo para acceder al dashboard en modo observación (solo lectura).</p>
              <form onSubmit={handleRequest} className="space-y-4">
                <input type="email" placeholder="correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 text-sm" required />
                <button type="submit" className="w-full bg-gold text-void py-2 text-xs uppercase tracking-widest">Acceder como observador</button>
              </form>
            </div>
          ) : (
            <AnonDashboard onClose={onClose} />
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
