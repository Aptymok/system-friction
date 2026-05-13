"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupProfilePage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState("BUSCANDO_SEÑAL...")
  const [formData, setFormData] = useState({ password: "", fullName: "" })

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      } else {
        // Si no hay sesión real, abortar al login inmediatamente
        router.push("/login")
      }
    }
    getSession()
  }, [supabase, router])

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Inyección de Credenciales (Update Password)
    const { error: authError } = await supabase.auth.updateUser({
      password: formData.password
    })

    if (authError) {
      console.error("COLAPSO_AUTH:", authError.message)
      setLoading(false)
      return
    }

    // 2. Sincronización del Nodo (Profiles)
    // Usamos el ID directamente del auth para evitar dobles pensamientos
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: formData.fullName,
        setup_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user?.id)

    if (!profileError) {
      // Forzamos el refresh para que el Middleware detecte el setup_completed: true
      router.refresh()
      setTimeout(() => {
        router.push("/terminal")
      }, 1500) // Latencia estética para simular carga de módulos
    } else {
      console.error("ERROR_SINCRONIZACION_NODO")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#C8A951] font-mono flex items-center justify-center p-6 selection:bg-[#E6FF00] selection:text-black">
      <div className="max-w-md w-full border border-[#1a1a1a] bg-[#0c0c0c] p-8 shadow-[0_20px_50px_rgba(0,0,0,1)] relative overflow-hidden">
        
        {/* Decoración Estética SFI */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C8A951] to-transparent opacity-30"></div>
        
        <div className="mb-10 text-center">
          <h1 className="text-[#e8e8e8] text-sm tracking-[0.3em] uppercase font-bold mb-2">
            SFI_NODE_ACTIVATION
          </h1>
          <div className="h-[1px] w-12 bg-[#C8A951] mx-auto mb-4"></div>
          <p className="text-[#444] text-[9px] uppercase tracking-widest">
            Identidad Detectada: <span className="text-[#7a6630] italic">{userEmail}</span>
          </p>
        </div>

        <form onSubmit={handleFinalize} className="space-y-8">
          <div className="group">
            <label className="block text-[9px] uppercase tracking-[0.2em] mb-3 text-[#444] group-focus-within:text-[#C8A951] transition-colors">
              Nombre del Operador (Identidad Ontológica)
            </label>
            <input 
              required
              className="w-full bg-[#050505] border border-[#222] p-3 text-[#e8e8e8] outline-none focus:border-[#C8A951] transition-all placeholder:text-[#222] text-sm"
              placeholder="NOMBRE_APELLIDO"
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div className="group">
            <label className="block text-[9px] uppercase tracking-[0.2em] mb-3 text-[#444] group-focus-within:text-[#C8A951] transition-colors">
              Definir Llave de Acceso (Kernel Password)
            </label>
            <input 
              type="password"
              required
              minLength={8}
              className="w-full bg-[#050505] border border-[#222] p-3 text-[#e8e8e8] outline-none focus:border-[#C8A951] transition-all placeholder:text-[#222] text-sm"
              placeholder="********"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="pt-4">
            <button 
              disabled={loading}
              className="w-full border border-[#C8A951] py-4 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#C8A951] hover:text-black transition-all disabled:opacity-20 relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? "Sincronizando Nodos..." : "Activar Soberanía"}
              </span>
              {loading && (
                <div className="absolute inset-0 bg-[#C8A951] animate-pulse opacity-20"></div>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[8px] text-[#222] uppercase tracking-tighter">
            System Friction Institute © 2026 // Protocolo MIHM v3.0
          </p>
        </div>
      </div>
    </div>
  )
}