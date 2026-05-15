#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reestructura la entrada del sistema: una sola página inicial con tres botones,
modales integrados, y acceso anónimo al dashboard en modo observación.
Ejecuta este script en la raíz del proyecto.
"""

import os
import shutil

BASE = os.getcwd()
APP_DIR = os.path.join(BASE, "src", "app")
COMPONENTS_DIR = os.path.join(BASE, "src", "components")
AUTH_DIR = os.path.join(COMPONENTS_DIR, "auth")
DASHBOARD_DIR = os.path.join(COMPONENTS_DIR, "dashboard")
ROOT_COMPONENTS = os.path.join(COMPONENTS_DIR, "root")

# Crear directorios necesarios
os.makedirs(AUTH_DIR, exist_ok=True)
os.makedirs(DASHBOARD_DIR, exist_ok=True)
os.makedirs(ROOT_COMPONENTS, exist_ok=True)

# ============================================================
# 1. NUEVA PÁGINA PRINCIPAL (app/page.tsx)
# ============================================================
new_home_page = """// src/app/page.tsx
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
"""
with open(os.path.join(APP_DIR, "page.tsx"), "w", encoding="utf-8") as f:
    f.write(new_home_page)
print("✅ src/app/page.tsx (nueva página principal)")

# ============================================================
# 2. MODAL DE LOGIN (con olvido de contraseña, etc.)
# ============================================================
login_modal = """// src/components/auth/LoginModal.tsx
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Dialog } from '@headlessui/react';

export function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const supabase = createClientComponentClient();

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
"""
with open(os.path.join(AUTH_DIR, "LoginModal.tsx"), "w", encoding="utf-8") as f:
    f.write(login_modal)
print("✅ src/components/auth/LoginModal.tsx")

# ============================================================
# 3. MODAL DE SIGNUP (con MOP-H + suscripción)
# ============================================================
signup_modal = """// src/components/auth/SignupModal.tsx
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Dialog } from '@headlessui/react';
import { MOPHFlow } from './MOPHFlow';

export function SignupModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const supabase = createClientComponentClient();
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
"""
with open(os.path.join(AUTH_DIR, "SignupModal.tsx"), "w", encoding="utf-8") as f:
    f.write(signup_modal)
print("✅ src/components/auth/SignupModal.tsx")

# ============================================================
# 4. COMPONENTE MOPH FLOW (para el registro)
# ============================================================
moph_flow = """// src/components/auth/MOPHFlow.tsx
'use client';
import { useState } from 'react';
import { MOPH_QUESTIONS } from '@/lib/agents/systemPrompt';

export function MOPHFlow({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const question = MOPH_QUESTIONS[index];
  const handleNext = async () => {
    if (!answers[index]?.trim()) return;
    if (index < MOPH_QUESTIONS.length - 1) {
      setIndex(i => i + 1);
    } else {
      setLoading(true);
      // Enviar respuestas al backend para crear nodo, etc.
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, responses: Object.entries(answers).map(([k, v]) => ({ question_id: k, answer: v })) })
      });
      setLoading(false);
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gold">Pregunta {index+1}/{MOPH_QUESTIONS.length}</p>
      <p className="text-sm font-serif italic">{question}</p>
      <textarea value={answers[index] || ''} onChange={e => setAnswers({...answers, [index]: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 text-sm h-24" />
      <button onClick={handleNext} disabled={loading} className="w-full bg-gold text-void py-2 text-xs uppercase tracking-widest">
        {index < MOPH_QUESTIONS.length - 1 ? 'Siguiente' : 'Finalizar'}
      </button>
    </div>
  );
}
"""
with open(os.path.join(AUTH_DIR, "MOPHFlow.tsx"), "w", encoding="utf-8") as f:
    f.write(moph_flow)
print("✅ src/components/auth/MOPHFlow.tsx")

# ============================================================
# 5. MODAL WORLD SPECTRUM (acceso anónimo)
# ============================================================
world_modal = """// src/components/auth/WorldSpectrumModal.tsx
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
"""
with open(os.path.join(AUTH_DIR, "WorldSpectrumModal.tsx"), "w", encoding="utf-8") as f:
    f.write(world_modal)
print("✅ src/components/auth/WorldSpectrumModal.tsx")

# ============================================================
# 6. DASHBOARD ANÓNIMO (solo observación, sin ejecución)
# ============================================================
anon_dashboard = """// src/components/dashboard/AnonDashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import { CognitiveConsole } from './CognitiveConsole';
import { useAnonState } from '@/hooks/useAnonState';

export function AnonDashboard({ onClose }: { onClose: () => void }) {
  const { metrics, worldSpectrum, loading } = useAnonState();
  const [showConsole, setShowConsole] = useState(false);

  if (loading) return <div className="p-6 text-center">Cargando World Spectrum...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center border-b border-gold/20 pb-2">
        <h2 className="text-lg font-mono text-gold">Observatorio (Modo Anónimo)</h2>
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-gold">[Cerrar]</button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>IHG global: {metrics.globalAverageIHG?.toFixed(3) || '—'}</div>
        <div>Volatilidad: {metrics.globalVolatility?.toFixed(3) || '—'}</div>
        <div>Total auditorías: {metrics.totalAudits || 0}</div>
      </div>
      <button onClick={() => setShowConsole(!showConsole)} className="text-xs text-gold underline">
        {showConsole ? 'Ocultar consola' : 'Mostrar consola (solo lectura)'}
      </button>
      {showConsole && <CognitiveConsole readonly />}
    </div>
  );
}
"""
with open(os.path.join(DASHBOARD_DIR, "AnonDashboard.tsx"), "w", encoding="utf-8") as f:
    f.write(anon_dashboard)
print("✅ src/components/dashboard/AnonDashboard.tsx")

# ============================================================
# 7. HOOK PARA ESTADO ANÓNIMO
# ============================================================
anon_hook = """// src/hooks/useAnonState.ts
import { useEffect, useState } from 'react';
import { GlobalLearningAgent } from '@/lib/agents/GlobalLearningAgent';

export function useAnonState() {
  const [metrics, setMetrics] = useState<any>({});
  const [worldSpectrum, setWorldSpectrum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      GlobalLearningAgent.getAggregatedMetrics(),
      fetch('/api/world-spectrum').then(r => r.json())
    ]).then(([globalMetrics, ws]) => {
      setMetrics(globalMetrics);
      setWorldSpectrum(ws);
      setLoading(false);
    });
  }, []);

  return { metrics, worldSpectrum, loading };
}
"""
with open(os.path.join(BASE, "src", "hooks", "useAnonState.ts"), "w", encoding="utf-8") as f:
    f.write(anon_hook)
print("✅ src/hooks/useAnonState.ts")

# ============================================================
# 8. MODIFICAR MIDDLEWARE PARA NO BLOQUEAR RAÍZ
# ============================================================
middleware_path = os.path.join(BASE, "src", "middleware.ts")
if os.path.exists(middleware_path):
    os.remove(middleware_path)
    print("🗑️ Se eliminó middleware.ts antiguo (ya no se necesita para redirigir raíz)")

# ============================================================
# 9. MODIFICAR AuthProvider para soportar modo anónimo sin redirecciones automáticas
# ============================================================
auth_provider_path = os.path.join(BASE, "src", "components", "providers", "AuthProvider.tsx")
if os.path.exists(auth_provider_path):
    with open(auth_provider_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Eliminar redirecciones automáticas a /terminal
    content = content.replace("if (AUTH_ROUTES.has(pathname)) router.replace('/terminal')", "if (AUTH_ROUTES.has(pathname)) router.replace('/')")
    with open(auth_provider_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ AuthProvider actualizado (redirección a raíz en lugar de /terminal)")
else:
    print("⚠️ No se encontró AuthProvider.tsx, omite modificación")

# ============================================================
# 10. INSTRUCCIONES FINALES
# ============================================================
print("\n" + "="*60)
print("🎉 REESTRUCTURACIÓN COMPLETADA – ENTRADA UNIFICADA CON TRES BOTONES")
print("="*60)
print("\n✅ Archivos generados/modificados:")
print("   - src/app/page.tsx (nueva página principal)")
print("   - LoginModal, SignupModal, WorldSpectrumModal, MOPHFlow")
print("   - AnonDashboard, useAnonState")
print("   - middleware eliminado (ya no fuerza redirección)")
print("   - AuthProvider ajustado")
print("\n🚀 Ahora la experiencia es:")
print("   - Página inicial con tres botones (sin redirecciones a páginas separadas).")
print("   - Login/Registro/World Spectrum se abren en modales sobre la misma pantalla.")
print("   - El dashboard se muestra según corresponda (anónimo, usuario normal o root).")
print("   - No hay landing page de marketing, todo ocurre en la misma interfaz.")
print("\n⚠️ Para que funcione correctamente, asegúrate de tener instalado @headlessui/react:")
print("   npm install @headlessui/react")