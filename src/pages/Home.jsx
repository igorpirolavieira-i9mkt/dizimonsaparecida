// src/pages/Home.jsx
// Tela principal — busca de dizimistas + lançamento de contribuição
// Mobile-first, usada durante a coleta de dízimo na missa

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Nomes dos meses abreviados para o grid de status
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Remove acentos e deixa tudo minúsculo para a busca funcionar sem acento
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function Home() {
  const navigate = useNavigate()

  // --- Estados de busca ---
  const [busca, setBusca] = useState('')
  const [dizimistas, setDizimistas] = useState([])
  const [carregandoBusca, setCarregandoBusca] = useState(false)

  // --- Estados do formulário ---
  const [dizimistaSelecionado, setDizimistaSelecionado] = useState(null)
  const [contribuicoesDoAno, setContribuicoesDoAno] = useState([]) // para o grid de meses
  const [formulario, setFormulario] = useState({
    valor: '',
    forma_pagamento: 'dinheiro',
    mes_referencia: new Date().getMonth() + 1, // mês atual
    ano_referencia: new Date().getFullYear(),
    observacao: '',
  })
  const [comprovante, setComprovante] = useState(null) // arquivo de imagem
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null) // { tipo: 'sucesso'|'erro', texto: '' }

  const inputBuscaRef = useRef(null)
  const formRef = useRef(null)

  // Foca no campo de busca ao abrir a tela
  useEffect(() => {
    inputBuscaRef.current?.focus()
  }, [])

  // Busca em tempo real — dispara quando o usuário digita
  useEffect(() => {
    const texto = busca.trim()
    if (texto.length < 2) {
      setDizimistas([])
      return
    }

    const timer = setTimeout(() => buscarDizimistas(texto), 300) // debounce de 300ms
    return () => clearTimeout(timer)
  }, [busca])

  // Quando seleciona um dizimista, carrega as contribuições do ano atual
  useEffect(() => {
    if (dizimistaSelecionado) {
      carregarContribuicoesDoAno(dizimistaSelecionado.id, formulario.ano_referencia)
    }
  }, [dizimistaSelecionado, formulario.ano_referencia])

  // --- Funções ---

  async function buscarDizimistas(texto) {
    setCarregandoBusca(true)
    try {
      // Busca por nome parcial, case-insensitive, apenas ativos
      const { data, error } = await supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento, telefone')
        .eq('ativo', true)
        .ilike('nome', `%${texto}%`) // busca parcial sem acento
        .order('nome')
        .limit(10)

      if (error) throw error
      setDizimistas(data || [])
    } catch (err) {
      console.error('Erro na busca:', err)
    } finally {
      setCarregandoBusca(false)
    }
  }

  async function carregarContribuicoesDoAno(dizimista_id, ano) {
    try {
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('mes_referencia, valor, forma_pagamento')
        .eq('dizimista_id', dizimista_id)
        .eq('ano_referencia', ano)

      if (error) throw error

      // Agrupa por mês somando valores (regra de negócio #4)
      const porMes = {}
      for (const c of data || []) {
        if (!porMes[c.mes_referencia]) {
          porMes[c.mes_referencia] = 0
        }
        porMes[c.mes_referencia] += Number(c.valor)
      }
      setContribuicoesDoAno(porMes)
    } catch (err) {
      console.error('Erro ao carregar contribuições:', err)
    }
  }

  function selecionarDizimista(d) {
    setDizimistaSelecionado(d)
    setBusca(d.nome)
    setDizimistas([]) // fecha a lista
    setMensagem(null)
    // Scrolla suavemente para o formulário
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function limparSelecao() {
    setDizimistaSelecionado(null)
    setBusca('')
    setDizimistas([])
    setContribuicoesDoAno([])
    setComprovante(null)
    setMensagem(null)
    setFormulario({
      valor: '',
      forma_pagamento: 'dinheiro',
      mes_referencia: new Date().getMonth() + 1,
      ano_referencia: new Date().getFullYear(),
      observacao: '',
    })
    setTimeout(() => inputBuscaRef.current?.focus(), 100)
  }

  function formatarAniversario(data_nascimento) {
    if (!data_nascimento) return null
    // Exibe apenas DD/MM, ignorando o ano 1900 (placeholder)
    const [, mes, dia] = data_nascimento.split('-')
    return `${dia}/${mes}`
  }

  function formatarValor(valor) {
    if (!valor) return '—'
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dizimistaSelecionado) return

    // Validações
    const valorNum = parseFloat(formulario.valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      setMensagem({ tipo: 'erro', texto: 'Informe um valor válido.' })
      return
    }
    if (formulario.forma_pagamento === 'pix' && !comprovante) {
      setMensagem({ tipo: 'erro', texto: 'Comprovante obrigatório para pagamento via PIX.' })
      return
    }

    setSalvando(true)
    setMensagem(null)

    try {
      let comprovante_url = null

      // 1. Upload do comprovante PIX (se houver)
      if (comprovante) {
        const extensao = comprovante.name.split('.').pop()
        const caminho = `${dizimistaSelecionado.id}/${formulario.ano_referencia}/${formulario.mes_referencia}/${Date.now()}.${extensao}`

        const { error: uploadError } = await supabase.storage
          .from('comprovantes')
          .upload(caminho, comprovante, { upsert: false })

        if (uploadError) throw uploadError
        comprovante_url = caminho
      }

      // 2. Salva a contribuição no banco
      const { error: insertError } = await supabase
        .from('contribuicoes')
        .insert({
          dizimista_id: dizimistaSelecionado.id,
          ano_referencia: formulario.ano_referencia,
          mes_referencia: formulario.mes_referencia,
          valor: valorNum,
          forma_pagamento: formulario.forma_pagamento,
          comprovante_url,
          observacao: formulario.observacao || null,
        })

      if (insertError) throw insertError

      // Sucesso!
      setMensagem({ tipo: 'sucesso', texto: `Dízimo de ${formatarValor(valorNum)} lançado para ${MESES[formulario.mes_referencia - 1]}/${formulario.ano_referencia}!` })

      // Recarrega grid de meses
      carregarContribuicoesDoAno(dizimistaSelecionado.id, formulario.ano_referencia)

      // Limpa apenas o valor e comprovante (mantém o dizimista selecionado)
      setFormulario(f => ({ ...f, valor: '', observacao: '' }))
      setComprovante(null)

    } catch (err) {
      console.error('Erro ao salvar:', err)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  // --- Render ---
  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold leading-tight">🕊️ Dízimo NS Aparecida</h1>
          <p className="text-blue-200 text-xs">Lançamento de contribuições</p>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="text-blue-200 text-xs border border-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 active:bg-blue-900 transition-colors"
        >
          Admin
        </button>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Campo de busca */}
        <div className="relative">
          <label className="block text-sm font-semibold text-blue-900 mb-1">
            Buscar dizimista
          </label>
          <div className="relative">
            <input
              ref={inputBuscaRef}
              type="text"
              value={busca}
              onChange={e => {
                setBusca(e.target.value)
                if (dizimistaSelecionado) {
                  setDizimistaSelecionado(null)
                  setContribuicoesDoAno([])
                }
              }}
              placeholder="Digite o nome..."
              className="w-full px-4 py-3 pr-10 text-base rounded-xl border-2 border-blue-200 bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              autoComplete="off"
            />
            {/* Ícone busca ou X para limpar */}
            {busca ? (
              <button
                onClick={limparSelecao}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                type="button"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xl">🔍</span>
            )}
          </div>

          {/* Lista de sugestões */}
          {dizimistas.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-blue-100 rounded-xl shadow-xl overflow-hidden">
              {carregandoBusca && (
                <li className="px-4 py-2 text-sm text-gray-400">Buscando...</li>
              )}
              {dizimistas.map(d => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selecionarDizimista(d)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-semibold text-blue-900 text-sm">{d.nome}</span>
                    {d.data_nascimento && (
                      <span className="text-gray-400 text-xs ml-2">🎂 {formatarAniversario(d.data_nascimento)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busca.length >= 2 && !carregandoBusca && dizimistas.length === 0 && !dizimistaSelecionado && (
            <p className="mt-2 text-sm text-gray-400 text-center">Nenhum dizimista encontrado.</p>
          )}
        </div>

        {/* Card do dizimista selecionado */}
        {dizimistaSelecionado && (
          <div ref={formRef} className="bg-white rounded-2xl shadow-md overflow-hidden">

            {/* Cabeçalho do card */}
            <div className="bg-blue-700 text-white px-4 py-3 flex items-start justify-between">
              <div>
                <p className="font-bold text-base leading-tight">{dizimistaSelecionado.nome}</p>
                {dizimistaSelecionado.data_nascimento && (
                  <p className="text-blue-200 text-xs mt-0.5">
                    🎂 {formatarAniversario(dizimistaSelecionado.data_nascimento)}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}`)}
                className="text-blue-200 text-xs border border-blue-500 rounded-lg px-2 py-1 ml-2 shrink-0 hover:bg-blue-600"
                type="button"
              >
                Ver perfil
              </button>
            </div>

            {/* Grid de meses — status visual */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Situação {formulario.ano_referencia}
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {MESES.map((mes, idx) => {
                  const numMes = idx + 1
                  const valor = contribuicoesDoAno[numMes]
                  const temContribuicao = valor !== undefined && valor > 0
                  const ehMesAtual = numMes === new Date().getMonth() + 1
                  return (
                    <div
                      key={mes}
                      className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border transition-all
                        ${temContribuicao
                          ? 'bg-green-500 text-white border-green-400'
                          : ehMesAtual
                          ? 'bg-blue-50 text-blue-600 border-blue-300 ring-1 ring-blue-400'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}
                    >
                      <div>{mes}</div>
                      {temContribuicao && (
                        <div className="text-[9px] font-normal opacity-90 mt-0.5">
                          {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Formulário de lançamento */}
            <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-bold text-blue-900">Novo lançamento</p>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={formulario.valor}
                  onChange={e => setFormulario(f => ({ ...f, valor: e.target.value }))}
                  className="w-full px-4 py-3 text-lg font-bold rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50"
                  required
                />
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {['dinheiro', 'pix'].map(forma => (
                    <button
                      key={forma}
                      type="button"
                      onClick={() => setFormulario(f => ({ ...f, forma_pagamento: forma }))}
                      className={`py-3 rounded-xl font-bold text-sm transition-all border-2
                        ${formulario.forma_pagamento === forma
                          ? forma === 'pix'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-green-600 text-white border-green-600 shadow-md'
                          : 'bg-white text-gray-500 border-gray-200'
                        }`}
                    >
                      {forma === 'dinheiro' ? '💵 Dinheiro' : '📱 PIX'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload comprovante PIX (obrigatório se PIX) */}
              {formulario.forma_pagamento === 'pix' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Comprovante PIX <span className="text-red-500">*</span>
                  </label>
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
                    ${comprovante
                      ? 'border-green-400 bg-green-50'
                      : 'border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100'
                    }`}>
                    <span className="text-2xl">{comprovante ? '✅' : '📎'}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-blue-800">
                        {comprovante ? comprovante.name : 'Toque para anexar'}
                      </p>
                      {comprovante && (
                        <p className="text-xs text-gray-400">
                          {(comprovante.size / 1024).toFixed(0)} KB
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => setComprovante(e.target.files[0] || null)}
                    />
                  </label>
                  {comprovante && (
                    <button
                      type="button"
                      onClick={() => setComprovante(null)}
                      className="mt-1 text-xs text-red-400 hover:text-red-600"
                    >
                      Remover comprovante
                    </button>
                  )}
                </div>
              )}

              {/* Mês e Ano de referência */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Mês de referência</label>
                  <select
                    value={formulario.mes_referencia}
                    onChange={e => setFormulario(f => ({ ...f, mes_referencia: Number(e.target.value) }))}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50 text-sm font-semibold"
                  >
                    {MESES.map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
                  <select
                    value={formulario.ano_referencia}
                    onChange={e => setFormulario(f => ({ ...f, ano_referencia: Number(e.target.value) }))}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50 text-sm font-semibold"
                  >
                    {[2023, 2024, 2025, 2026].map(ano => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observação (opcional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: retroativo março"
                  value={formulario.observacao}
                  onChange={e => setFormulario(f => ({ ...f, observacao: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50 text-sm"
                />
              </div>

              {/* Mensagem de feedback */}
              {mensagem && (
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2
                  ${mensagem.tipo === 'sucesso'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {mensagem.tipo === 'sucesso' ? '✅' : '❌'} {mensagem.texto}
                </div>
              )}

              {/* Botão salvar */}
              <button
                type="submit"
                disabled={salvando}
                className={`w-full py-4 rounded-xl font-bold text-base text-white shadow-md transition-all
                  ${salvando
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-800 active:scale-95'
                  }`}
              >
                {salvando ? '⏳ Salvando...' : '💾 Lançar Dízimo'}
              </button>

              {/* Atalho para lançar múltiplos meses */}
              <button
                type="button"
                onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}?acao=multiplos`)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-blue-700 border-2 border-blue-200 hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                📅 Lançar múltiplos meses
              </button>
            </form>
          </div>
        )}

        {/* Estado vazio — instrução inicial */}
        {!dizimistaSelecionado && busca.length < 2 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🙏</div>
            <p className="text-sm font-semibold">Digite o nome do dizimista acima</p>
            <p className="text-xs mt-1">A busca começa a partir de 2 letras</p>
          </div>
        )}

      </div>
    </div>
  )
}
