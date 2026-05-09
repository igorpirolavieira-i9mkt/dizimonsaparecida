// src/pages/Login.jsx
// Login por telefone + senha — busca o e-mail na tabela `usuarios` pelo telefone
// e autentica normalmente via Supabase Auth

import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Deixa apenas os dígitos do telefone (remove espaços, traços, parênteses)
function apenasDigitos(str) {
  return str.replace(/\D/g, '')
}

// Formata enquanto digita: (27) 99999-9999
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

      // 1. Busca o e-mail cadastrado para esse telefone
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

      // 2. Autentica com o e-mail encontrado + senha digitada
      const { error: errAuth } = await supabase.auth.signInWithPassword({
        email: data.email_auth,
        password: senha,
      })

      if (errAuth) {
        setErro('Senha incorreta. Tente novamente.')
      }
      // Se ok, o App.jsx detecta a sessão e redireciona automaticamente
    } catch (err) {
      console.error('Erro no login:', err)
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">

        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⛪</div>
          <h1 className="text-xl font-bold text-gray-800">Dízimo NS Aparecida</h1>
          <p className="text-sm text-gray-500 mt-1">Paróquia São Tiago Maior</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          {/* Telefone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              📱 Telefone
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={telefone}
              onChange={handleTelefone}
              placeholder="(27) 99999-9999"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 tracking-wide"
              required
              autoComplete="tel"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              🔒 Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro('') }}
              placeholder="••••••••"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2 px-3">
              ❌ {erro}
            </p>
          )}

          {/* Botão entrar */}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-800 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-base mt-2"
          >
            {carregando ? '⏳ Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
