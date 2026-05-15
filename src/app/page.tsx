// src/app/page.tsx
'use client';
import { useState } from 'react';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { WorldSpectrumModal } from '@/components/auth/WorldSpectrumModal';
import { useAuthState } from '@/components/providers/AuthProvider';
import { AnonDashboard } from '@/components/dashboard/AnonDashboard';

export default function HomePage() {
  const { session, status } = useAuthState();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showWorld, setShowWorld] = useState(false);

  // Si el usuario ya está autenticado, mostrar el dashboard correspondiente
  if (status === 'authenticated' && session) {
    // El usuario ya tiene sesión, redirigir internamente a su dashboard
    // (el middleware se encargará de la redirección real, pero aquí renderizamos directamente)
    const role = (session.user?.user_metadata as any)?.role || 'observer';
    if (role === 'root') {
      import('@/app/root/page').then(mod => mod.default);
    } else {
      import('@/app/user/page').then(mod => mod.default);
    }
  }

  return (
    <div className="min-h-screen bg-void text-paper flex flex-col items-center justify-center p-6 font-mono">
      {/* Pleca central */}
      <div className="text-center space-y-8 max-w-3xl">
        <div className="border border-gold/20 p-6">
          <h1 className="text-2xl tracking-[0.3em] font-display text-gold">SYSTEM FRICTION INSTITUTE</h1>
        </div>
        <p className="text-xl italic leading-relaxed text-zinc-300">
          "Los sistemas no fallan por falta de intención,<br />
          fallan cuando nadie registra lo que todos observan."
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center mt-8">
          <button onClick={() => setShowLogin(true)} className="border border-gold px-6 py-3 text-sm uppercase tracking-widest hover:bg-gold/10">
            IDENTIFICAR NODO (LOGIN)
          </button>
          <button onClick={() => setShowSignup(true)} className="border border-gold px-6 py-3 text-sm uppercase tracking-widest hover:bg-gold/10">
            AGREGAR NODO (SIGNUP)
          </button>
          <button onClick={() => setShowWorld(true)} className="border border-gold px-6 py-3 text-sm uppercase tracking-widest hover:bg-gold/10">
            WORLD SPECTRUM OBSERVABILITY
          </button>
        </div>
      </div>

      {/* Modales */}
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} />
      <WorldSpectrumModal isOpen={showWorld} onClose={() => setShowWorld(false)} />
    </div>
  );
}
