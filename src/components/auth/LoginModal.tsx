// src/components/auth/LoginModal.tsx
'use client';
import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/runtime/supabase/client';
import { Dialog } from '@headlessui/react';

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const supabase = createBrowserSupabaseClient();
  if (!supabase) throw new Error('Supabase client is not configured');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onClose(); // cerrar modal tras éxito
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message);
    else alert('Correo de restablecimiento enviado');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="terminal-panel w-full max-w-md p-6 bg-void border border-gold/20">
          <Dialog.Title className="text-xl font-mono text-gold mb-4 uppercase tracking-widest">
            {resetMode ? 'Restablecer clave' : 'Identificar nodo'}
          </Dialog.Title>
          <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
            <input type="email" placeholder="correo" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 text-sm" required />
            {!resetMode && (
              <input type="password" placeholder="clave" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 p-2 text-sm" required />
            )}
            <button type="submit" className="w-full bg-gold text-void py-2 text-xs uppercase tracking-widest">Ejecutar</button>
          </form>
          <div className="mt-4 text-xs text-center space-y-2">
            {!resetMode && (
              <button onClick={() => setResetMode(true)} className="text-zinc-500 hover:text-gold">¿Olvidaste tu clave?</button>
            )}
            {resetMode && (
              <button onClick={() => setResetMode(false)} className="text-zinc-500 hover:text-gold">Volver a inicio de sesión</button>
            )}
            <div className="border-t border-zinc-800 pt-2 mt-2">
              <button className="text-zinc-500 hover:text-gold">Ingresar por otro medio (OAuth)</button>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
