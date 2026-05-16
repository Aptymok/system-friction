'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/components/providers/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { WorldSpectrumModal } from '@/components/auth/WorldSpectrumModal';

export default function HomePage() {
  const { status, userRole } = useAuthState();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showWorld, setShowWorld] = useState(false);

  // Redirigir automáticamente cuando el usuario esté autenticado y tengamos el rol
  useEffect(() => {
    if (status === 'authenticated' && userRole) {
      if (userRole === 'root') {
        router.replace('/root');
      } else {
        router.replace('/user');
      }
    }
  }, [status, userRole, router]);

  // Mostrar carga mientras se obtiene el rol o se redirige
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-void text-paper flex items-center justify-center font-mono">
        {userRole ? 'Redirigiendo a tu dashboard...' : 'Cargando perfil...'}
      </div>
    );
  }

  // Usuario no autenticado: mostrar la pantalla de entrada
  return (
    <div className="min-h-screen bg-void text-paper flex flex-col items-center justify-center p-6 font-mono">
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
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <SignupModal isOpen={showSignup} onClose={() => setShowSignup(false)} />
      <WorldSpectrumModal isOpen={showWorld} onClose={() => setShowWorld(false)} />
    </div>
  );
}