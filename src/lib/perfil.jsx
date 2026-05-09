// src/lib/perfil.js
// Context e hook de perfil — lê o role do usuário logado (coordenador | agente)
// Use <PerfilProvider> em App.jsx e usePerfil() nos componentes que precisam do role.

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const PerfilContext = createContext(undefined)

export function PerfilProvider({ children }) {
  // undefined = carregando | null = sem sessão | { role, nome } = carregado
  const [perfil, setPerfil] = useState(undefined)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPerfil(null); return }

      const { data } = await supabase
        .from('perfis')
        .select('role, nome')
        .eq('id', user.id)
        .maybeSingle()

      // Fallback seguro: usuário sem perfil cadastrado age como agente
      setPerfil(data || { role: 'agente', nome: user.email })
    }

    carregar()

    // Atualiza quando o status de autenticação muda (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setPerfil(null)
      else carregar()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <PerfilContext.Provider value={perfil}>
      {children}
    </PerfilContext.Provider>
  )
}

// Hook — use em qualquer componente dentro do PerfilProvider
export function usePerfil() {
  return useContext(PerfilContext)
}

// Helpers semânticos
export const ehCoordenador = (perfil) => perfil?.role === 'coordenador'
export const ehAgente      = (perfil) => perfil?.role === 'agente' || perfil?.role === 'coordenador'
