// src/pages/Login.jsx
// Login direto por e-mail + senha no Supabase Auth
// Design NS Aparecida: gradiente manto, Cormorant Garamond no título, esferas decorativas

import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Mensagens de erro traduzidas para português
function traduzirErro(mensagem) {
  if (!mensagem) return 'Erro inesperado. Tente novamente.'
  if (mensagem.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (mensagem.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar.'
  if (mensagem.includes('Too many requests'))         return 'Muitas tentativas. Aguarde um momento.'
  if (mensagem.includes('User not found'))            return 'E-mail não cadastrado.'
  return 'Erro ao entrar. Verifique os dados e tente novamente.'
}

export default function Login() {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro]         = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      if (error) setErro(traduzirErro(error.message))
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0F2347 0%, #1A3A6B 60%, #254D8F 100%)' }}
    >
      {/* Esferas decorativas — assinatura visual do manto */}
      <div className="absolute top-[-80px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none"
           style={{ background: 'rgba(201,168,76,0.08)' }} />
      <div className="absolute bottom-[-100px] left-[-80px] w-[240px] h-[240px] rounded-full pointer-events-none"
           style={{ background: 'rgba(201,168,76,0.06)' }} />
      <div className="absolute top-[40%] right-[-20px] w-[80px] h-[80px] rounded-full pointer-events-none"
           style={{ background: 'rgba(201,168,76,0.05)' }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo devocional — Cormorant Garamond itálico */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⛪</div>
          <h1 className="splash-titulo text-white">
            Comunidade<br />Aparecida
          </h1>
          <p className="text-dourado font-bold text-xs tracking-[0.18em] uppercase mt-2">
            Padroeira do Brasil
          </p>
          <p className="text-azul-claro text-xs mt-1">
            Paróquia São Tiago Maior · Guarapari/ES
          </p>
        </div>

        {/* Card do formulário */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-[3px] bg-faixa-dourada" />

          <div className="px-7 py-7">
            <form onSubmit={handleLogin} className="space-y-4">

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-manto uppercase tracking-[0.08em] mb-1.5">
                  ✉️ E-mail
                </label>
                <input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErro('') }}
                  placeholder="seu@email.com"
                  className="w-full border-[1.5px] border-cinza-borda rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 transition-all bg-white"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-manto uppercase tracking-[0.08em] mb-1.5">
                  🔒 Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  placeholder="••••••••"
                  className="w-full border-[1.5px] border-cinza-borda rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 transition-all bg-white"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Erro */}
              {erro && (
                <p className="text-ausente text-sm text-center bg-ausente-light rounded-xl py-2 px-3 border border-ausente-border">
                  ❌ {erro}
                </p>
              )}

              {/* Botão entrar */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50 mt-1"
                style={{ background: carregando ? '#9CA3AF' : 'linear-gradient(135deg, #1A3A6B, #254D8F)' }}
              >
                {carregando ? '⏳ Entrando...' : '⛪ Entrar'}
              </button>
            </form>
          </div>
        </div>

        {/* Nota de sessão */}
        <p className="text-azul-claro text-xs text-center mt-5 px-4">
          A sessão fica salva no celular — você só precisa entrar uma vez.
        </p>
        <p className="text-xs text-center mt-1" style={{ color: 'rgba(91,155,213,0.5)' }}>
          Acesso restrito à equipe da comunidade
        </p>
      </div>
    </div>
  )
}
