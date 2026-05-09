// src/pages/Consulta.jsx
// Tela pública — fiel consulta o próprio histórico sem precisar de login
// Acesso por: /consulta
// Sem edição, sem dados de outros fiéis

import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ANO_ATUAL = new Date().getFullYear()

export default function Consulta() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [buscou, setBuscou] = useState(false)

  // Dizimista selecionado para ver o histórico
  const [selecionado, setSelecionado] = useState(null)
  const [historico, setHistorico] = useState([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [anoVisualizado, setAnoVisualizado] = useState(ANO_ATUAL)

  async function buscar(e) {
    e.preventDefault()
    const texto = busca.trim()
    if (texto.length < 2) return

    setCarregando(true)
    setBuscou(false)
    setSelecionado(null)
    setResultados([])

    try {
      const { data, error } = await supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento')
        .eq('ativo', true)
        .ilike('nome', `%${texto}%`)
        .order('nome')
        .limit(8)

      if (error) throw error
      setResultados(data || [])
    } catch (err) {
      console.error('Erro na busca:', err)
    } finally {
      setCarregando(false)
      setBuscou(true)
    }
  }

  async function selecionarDizimista(d) {
    setSelecionado(d)
    setResultados([])
    setBusca(d.nome)
    setCarregandoHistorico(true)

    try {
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('ano_referencia, mes_referencia, valor, forma_pagamento, data_registro')
        .eq('dizimista_id', d.id)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })

      if (error) throw error
      setHistorico(data || [])
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setCarregandoHistorico(false)
    }
  }

  function limpar() {
    setBusca('')
    setSelecionado(null)
    setResultados([])
    setHistorico([])
    setBuscou(false)
  }

  function formatarAniversario(data) {
    if (!data) return null
    const [, mes, dia] = data.split('-')
    return `${dia}/${mes}`
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Agrupa histórico por ano e mês (somando — regra #4)
  function mapaPorAnoMes() {
    const mapa = {}
    for (const c of historico) {
      if (!mapa[c.ano_referencia]) mapa[c.ano_referencia] = {}
      const m = c.mes_referencia
      mapa[c.ano_referencia][m] = (mapa[c.ano_referencia][m] || 0) + Number(c.valor)
    }
    return mapa
  }

  function anosComHistorico() {
    const anos = new Set(historico.map(c => c.ano_referencia))
    anos.add(ANO_ATUAL)
    return Array.from(anos).sort((a, b) => b - a)
  }

  const mapa = mapaPorAnoMes()
  const anos = selecionado ? anosComHistorico() : []
  const porMesAno = mapa[anoVisualizado] || {}
  const totalAno = Object.values(porMesAno).reduce((s, v) => s + v, 0)
  const mesesPagos = Object.keys(porMesAno).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700">

      {/* Header */}
      <header className="px-4 pt-8 pb-4 text-center text-white">
        <div className="text-4xl mb-2">⛪</div>
        <h1 className="text-xl font-bold">Dízimo NS Aparecida</h1>
        <p className="text-blue-200 text-sm mt-1">Consulta de contribuições</p>
        <p className="text-blue-300 text-xs mt-0.5">Paróquia São Tiago Maior — Guarapari/ES</p>
      </header>

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Card de busca */}
        <div className="bg-white rounded-2xl shadow-xl px-4 py-5">
          <p className="text-sm font-bold text-blue-900 mb-3">🔍 Consultar meu histórico</p>
          <form onSubmit={buscar} className="flex gap-2">
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); if (selecionado) limpar() }}
              placeholder="Digite seu nome..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-blue-200 focus:outline-none focus:border-blue-500 text-sm bg-gray-50"
              autoComplete="off"
              minLength={2}
            />
            <button
              type="submit"
              disabled={carregando || busca.trim().length < 2}
              className={`px-4 py-3 rounded-xl font-bold text-white text-sm transition-all shrink-0
                ${carregando || busca.trim().length < 2
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800 active:scale-95'}`}
            >
              {carregando ? '⏳' : 'Buscar'}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Digite pelo menos 2 letras do seu nome completo.
          </p>

          {/* Lista de resultados */}
          {resultados.length > 0 && (
            <ul className="mt-3 border border-blue-100 rounded-xl overflow-hidden">
              {resultados.map(d => (
                <li key={d.id}>
                  <button
                    onClick={() => selecionarDizimista(d)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-semibold text-blue-900 text-sm">{d.nome}</span>
                    {d.data_nascimento && (
                      <span className="text-gray-400 text-xs ml-2">
                        🎂 {formatarAniversario(d.data_nascimento)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Sem resultado */}
          {buscou && resultados.length === 0 && !selecionado && (
            <p className="mt-3 text-sm text-center text-gray-400">
              Nenhum cadastro encontrado com esse nome.<br />
              <span className="text-xs">Verifique com o responsável da comunidade.</span>
            </p>
          )}
        </div>

        {/* Histórico do dizimista selecionado */}
        {selecionado && (
          <div className="space-y-4">

            {carregandoHistorico ? (
              <div className="text-center py-8 text-white">
                <div className="text-3xl mb-2 animate-pulse">🕊️</div>
                <p className="text-sm">Carregando histórico...</p>
              </div>
            ) : (
              <>
                {/* Card de resumo do ano */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-base">{selecionado.nome}</p>
                      <p className="text-blue-200 text-xs mt-0.5">
                        {mesesPagos} mês{mesesPagos !== 1 ? 'es' : ''} pago{mesesPagos !== 1 ? 's' : ''} em {anoVisualizado}
                        {' · '}
                        {formatarValor(totalAno)}
                      </p>
                    </div>
                    <select
                      value={anoVisualizado}
                      onChange={e => setAnoVisualizado(Number(e.target.value))}
                      className="bg-blue-600 text-white text-sm font-bold rounded-lg px-2 py-1.5 border border-blue-500 focus:outline-none"
                    >
                      {anos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Grid de meses */}
                  <div className="px-4 py-4">
                    <div className="grid grid-cols-6 gap-1.5">
                      {MESES.map((mes, idx) => {
                        const numMes = idx + 1
                        const valor = porMesAno[numMes]
                        const pago = valor !== undefined && valor > 0
                        const ehAtual = numMes === new Date().getMonth() + 1 && anoVisualizado === ANO_ATUAL
                        return (
                          <div
                            key={mes}
                            className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border
                              ${pago
                                ? 'bg-green-500 text-white border-green-400'
                                : ehAtual
                                ? 'bg-blue-50 text-blue-500 border-blue-200 ring-1 ring-blue-300'
                                : 'bg-gray-50 text-gray-300 border-gray-200'
                              }`}
                          >
                            <div>{mes}</div>
                            {pago && (
                              <div className="text-[9px] font-normal opacity-90 mt-0.5">✓</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-green-500 inline-block"></span> Pago
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block"></span> Em aberto
                      </span>
                    </div>
                  </div>
                </div>

                {/* Histórico detalhado por ano */}
                {anos.map(ano => {
                  const contribsDoAno = historico.filter(c => c.ano_referencia === ano)
                  if (contribsDoAno.length === 0) return null
                  const totalDoAno = contribsDoAno.reduce((s, c) => s + Number(c.valor), 0)
                  return (
                    <div key={ano} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-sm font-bold text-blue-900">{ano}</span>
                        <span className="text-xs text-gray-500 font-semibold">
                          {formatarValor(totalDoAno)}
                        </span>
                      </div>
                      {contribsDoAno.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                            ${c.forma_pagamento === 'pix' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {c.forma_pagamento === 'pix' ? '📱' : '💵'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900">
                              {MESES_COMPLETOS[c.mes_referencia - 1]}
                            </p>
                            <p className="text-xs text-gray-400">
                              {c.data_registro
                                ? new Date(c.data_registro).toLocaleDateString('pt-BR')
                                : ''}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-green-700">
                            {formatarValor(c.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {historico.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm">Nenhuma contribuição registrada ainda.</p>
                    <p className="text-xs mt-1">Converse com o responsável da comunidade.</p>
                  </div>
                )}

                {/* Botão limpar */}
                <button
                  onClick={limpar}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white border-2 border-white/30 hover:bg-white/10 transition-all"
                >
                  🔍 Consultar outro nome
                </button>
              </>
            )}
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-blue-300 text-xs pb-4">
          Dízimo NS Aparecida · Paróquia São Tiago Maior<br />
          Apenas consulta — sem edição de dados
        </p>
      </div>
    </div>
  )
}
