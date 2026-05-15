// src/components/auth/SignupModal.tsx
'use client';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Dialog } from '@headlessui/react';
import { MOPHFlow } from './MOPHFlow';

export function SignupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error('Supabase client is not configured');
  const [step, setStep] = useState<'signup' | 'moph' | 'subscription'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else {
      setUserId(data.user?.id || null);
      setStep('moph');
    }
  };

  const handleMophComplete = () => {
    setStep('subscription');
  };

  const handleSubscriptionComplete = () => {
    onClose(); // cerrar y redirigir (el usuario ya está logueado)
    window.location.href = '/'; // recargar para que el middleware redirija a su dashboard
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="terminal-panel w-full max-w-md p-6 bg-void border border-gold/20">
          <Dialog.Title className="text-xl font-mono text-gold mb-4 uppercase tracking-widest">
            Agregar nodo
          </Dialog.Title>
          {step === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <input type="email" placeholder="correo" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 text-sm" required />
              <input type="password" placeholder="clave" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 text-sm" required />
              <button type="submit" className="w-full bg-gold text-void py-2 text-xs uppercase tracking-widest">Crear nodo</button>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </form>
          )}
          {step === 'moph' && userId && (
            <MOPHFlow userId={userId} onComplete={handleMophComplete} />
          )}
          {step === 'subscription' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">Selecciona tu plan (demo)</p>
              <button onClick={handleSubscriptionComplete} className="w-full border border-gold py-2 text-xs uppercase">Activar suscripción gratuita</button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
