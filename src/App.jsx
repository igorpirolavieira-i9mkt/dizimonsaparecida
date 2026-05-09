// src/App.jsx
// Rotas do app + proteção de acesso + NavBar
// Todas as rotas exceto /login e /consulta exigem autenticação

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { supabase } from './lib/supabase'
import { PerfilProvider } from './lib/perfil'
import NavBar from './components/NavBar'

// Importação das páginas
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'         // agora em /lancar
import Dizimista from './pages/Dizimista'
import Resumo from './pages/Resumo'
import RelatorioDia from './pages/RelatorioDia'
import Comprovantes from './pages/Comprovantes'
import Pix from './pages/Pix'
import Admin from './pages/Admin'
import Consulta from './pages/Consulta'
import Aniversariantes from './pages/Aniversariantes'

// Placeholder para telas ainda não construídas (mantido por compatibilidade)
// function EmConstrucao já definida abaixo

// Placeholder para telas ainda não construídas
function EmConstrucao({ titulo }) {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center text-center px-4 pb-20">
      <div className="text-5xl mb-4">🔧</div>
      <h2 className="text-xl font-bold text-blue-900">{titulo}</h2>
      <p className="text-gray-400 text-sm mt-2">Em construção</p>
    </div>
  )
}

// Componente que protege rotas privadas
function RotaProtegida({ children, sessao }) {
  if (sessao === undefined) {
    // Ainda verificando sessão — tela de loading
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🕊️</div>
          <p className="text-blue-600 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }
  if (!sessao) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Layout com NavBar (só para telas autenticadas)
function LayoutComNav({ children }) {
  return (
    <div className="pb-20"> {/* pb-20 = espaço para a NavBar fixa */}
      {children}
      <NavBar />
    </div>
  )
}

export default function App() {
  const [sessao, setSessao] = useState(undefined) // undefined = carregando

  useEffect(() => {
    // Verifica sessão atual ao iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
    })

    // Escuta mudanças de autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <PerfilProvider>
    <BrowserRouter>
      <Routes>
        {/* Login — público */}
        <Route path="/login" element={
          sessao ? <Navigate to="/" replace /> : <Login />
        } />

        {/* Consulta pública — sem login */}
        <Route path="/consulta" element={<Consulta />} />

        {/* Rotas protegidas */}
        <Route path="/" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Dashboard /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/lancar" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Home /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/dizimista/:id" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Dizimista /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/resumo" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Resumo /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/relatorio-dia" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><RelatorioDia /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/comprovantes" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Comprovantes /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/pix" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Pix /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/admin" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Admin /></LayoutComNav>
          </RotaProtegida>
        } />

        <Route path="/aniversariantes" element={
          <RotaProtegida sessao={sessao}>
            <LayoutComNav><Aniversariantes /></LayoutComNav>
          </RotaProtegida>
        } />

        {/* Qualquer rota inválida → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SpeedInsights />
    </BrowserRouter>
    </PerfilProvider>
  )
}
