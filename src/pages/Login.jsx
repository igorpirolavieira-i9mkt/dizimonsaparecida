// src/pages/Login.jsx
// Login por telefone + senha

import { useState } from 'react'
import { supabase } from '../lib/supabase'

function apenasDigitos(str) {
  return str.replace(/\D/g, '')
}

function formatarTelefone(valor) {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export default function Login() {
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function handleTelefone(e) {
    setTelefone(formatarTelefone(e.target.value))
    setErro('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    try {
      const digitos = apenasDigitos(telefone)
      const { data, error: errBusca } = await supabase
        .from('usuarios')
        .select('email_auth')
        .eq('telefone', digitos)
        .single()

      if (errBusca || !data) {
        setErro('Telefone não encontrado. Verifique o número.')
        setCarregando(false)
        return
      }

      const { error: errAuth } = await supabase.auth.signInWithPassword({
        email: data.email_auth,
        password: senha,
      })

      if (errAuth) setErro('Senha incorreta. Tente novamente.')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #0F2347 0%, #1A3A6B 60%, #254D8F 100%)' }}>

      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">⛪</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dízimo</h1>
          <p className="text-dourado font-semibold text-sm mt-0.5">Nossa Senhora Aparecida</p>
          <p className="text-blue-300 text-xs mt-1">Paróquia São Tiago Maior · Guarapari/ES</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Faixa dourada */}
          <div className="h-[3px] bg-dourado" />

          <div className="px-7 py-7">
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold text-manto uppercase tracking-wider mb-1.5">
                  📱 Telefone
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={telefone}
                  onChange={handleTelefone}
                  placeholder="(27) 99999-9999"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-dourado transition-colors"
                  required
                  autoComplete="tel"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-manto uppercase tracking-wider mb-1.5">
                  🔒 Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setErro('') }}
                  placeholder="••••••••"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-dourado transition-colors"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Erro */}
              {erro && (
                <p className="text-ausente text-sm text-center bg-ausente-light rounded-lg py-2 px-3 border border-ausente-border">
                  ❌ {erro}
                </p>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-50 mt-1"
                style={{ background: carregando ? '#9CA3AF' : 'linear-gradient(135deg, #1A3A6B, #254D8F)' }}
              >
                {carregando ? '⏳ Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-blue-400 text-xs text-center mt-6">
          Acesso restrito à equipe da comunidade
        </p>
      </div>
    </div>
  )
}
