// src/pages/Resumo.jsx
// Resumo mensal — totais arrecadados + quem pagou e quem não pagou por mês

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_ATUAL = new Date().getFullYear()
const MES_ATUAL = new Date().getMonth() + 1

export default function Resumo() {
  const navigate = useNavigate()

  const [ano, setAno] = useState(ANO_ATUAL)
  const [mesSelecionado, setMesSelecionado] = useState(MES_ATUAL)
  const [carregando, setCarregando] = useState(true)

  // Dados carregados
  const [totalDizimistas, setTotalDizimistas] = useState(0)
  const [resumoPorMes, setResumoPorMes] = useState({}) // { mes: { total, qtd } }
  const [detalhesMes, setDetalhesMes] = useState(null) // { pagaram: [], naoPagearam: [] }
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false)

  useEffect(() => {
    carregarResumo()
  }, [ano])

  useEffect(() => {
    carregarDetalhesMes()
  }, [mesSelecionado, ano])

  async function carregarResumo() {
    setCarregando(true)
    try {
      // Total de dizimistas ativos
      const { count } = await supabase
        .from('dizimistas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
      setTotalDizimistas(count || 0)

      // Contribuições do ano agrupadas por mês
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('mes_referencia, valor')
        .eq('ano_referencia', ano)
      if (error) throw error

      // Agrupa por mês
      const mapa = {}
      for (const c of data || []) {
        const m = c.mes_referencia
        if (!mapa[m]) mapa[m] = { total: 0, qtd: 0, dizimistasSet: new Set() }
        mapa[m].total += Number(c.valor)
        mapa[m].qtd++
      }
      setResumoPorMes(mapa)
    } catch (err) {
      console.error('Erro ao carregar resumo:', err)
    } finally {
      setCarregando(false)
    }
  }

  async function carregarDetalhesMes() {
    setCarregandoDetalhes(true)
    setDetalhesMes(null)
    try {
      // Busca quem pagou no mês selecionado
      const { data: pagamentos, error: errP } = await supabase
        .from('contribuicoes')
        .select('dizimista_id, valor, forma_pagamento, dizimistas(nome)')
        .eq('ano_referencia', ano)
        .eq('mes_referencia', mesSelecionado)
      if (errP) throw errP

      // Agrega por dizimista (pode ter múltiplos registros no mesmo mês)
      const pagaramMap = {}
      for (const p of pagamentos || []) {
        const did = p.dizimista_id
        if (!pagaramMap[did]) {
          pagaramMap[did] = {
            id: did,
            nome: p.dizimistas?.nome || '?',
            total: 0,
            formas: new Set(),
          }
        }
        pagaramMap[did].total += Number(p.valor)
        pagaramMap[did].formas.add(p.forma_pagamento)
      }
      const pagaram = Object.values(pagaramMap).sort((a, b) => a.nome.localeCompare(b.nome))
      const idsPagaram = new Set(Object.keys(pagaramMap))

      // Busca quem NÃO pagou (dizimistas ativos fora da lista)
      const { data: todos, error: errT } = await supabase
        .from('dizimistas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      if (errT) throw errT

      const naoPagaram = (todos || []).filter(d => !idsPagaram.has(d.id))

      setDetalhesMes({ pagaram, naoPagaram })
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    } finally {
      setCarregandoDetalhes(false)
    }
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function totalAnual() {
    return Object.values(resumoPorMes).reduce((s, m) => s + m.total, 0)
  }

  function mesesComContribuicao() {
    return Object.keys(resumoPorMes).length
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          <p className="text-blue-600 text-sm">Carregando resumo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">📊 Resumo Mensal</h1>
          <p className="text-blue-200 text-xs">Arrecadação e situação dos dizimistas</p>
        </div>
        {/* Seletor de ano */}
        <select
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          className="bg-blue-700 text-white text-sm font-bold rounded-lg px-2 py-1.5 border border-blue-600 focus:outline-none"
        >
          {[ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Cards de totais anuais */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-manto text-white rounded-xl shadow-md px-3 py-3 text-center">
            <p className="text-blue-200 text-xs font-semibold">Total {ano}</p>
            <p className="text-base font-bold mt-1">{formatarValor(totalAnual())}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-dourado/20 px-3 py-3 text-center">
            <p className="text-xs text-gray-400 font-semibold">Meses c/ rec.</p>
            <p className="text-base font-bold text-manto mt-1">{mesesComContribuicao()}/12</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-dourado/20 px-3 py-3 text-center">
            <p className="text-xs text-gray-400 font-semibold">Dizimistas</p>
            <p className="text-base font-bold text-manto mt-1">{totalDizimistas}</p>
          </div>
        </div>

        {/* Barra mensal — gráfico simples */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4">
          <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-3">
            Arrecadação por mês — {ano}
          </p>
          {/* Valor máximo para escala da barra */}
          {(() => {
            const maxValor = Math.max(...Object.values(resumoPorMes).map(m => m.total), 1)
            return (
              <div className="space-y-1.5">
                {MESES_CURTOS.map((mes, idx) => {
                  const numMes = idx + 1
                  const dados = resumoPorMes[numMes]
                  const total = dados?.total || 0
                  const largura = total > 0 ? Math.max((total / maxValor) * 100, 4) : 0
                  const ehSelecionado = numMes === mesSelecionado
                  const ehAtual = numMes === MES_ATUAL && ano === ANO_ATUAL
                  return (
                    <button
                      key={mes}
                      onClick={() => setMesSelecionado(numMes)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors text-left
                        ${ehSelecionado ? 'bg-manto/5 ring-1 ring-manto/30' : 'hover:bg-gray-50'}`}
                    >
                      {/* Nome do mês */}
                      <span className={`text-xs font-semibold w-7 shrink-0 ${ehAtual ? 'text-dourado' : 'text-gray-400'}`}>
                        {mes}{ehAtual ? ' ·' : ''}
                      </span>
                      {/* Barra */}
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        {largura > 0 && (
                          <div
                            className={`h-full rounded-full transition-all ${ehSelecionado ? 'bg-manto' : 'bg-manto/50'}`}
                            style={{ width: `${largura}%` }}
                          />
                        )}
                      </div>
                      {/* Valor */}
                      <span className={`text-xs font-bold w-16 text-right shrink-0
                        ${total > 0 ? 'text-manto' : 'text-gray-300'}`}>
                        {total > 0 ? formatarValor(total) : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Detalhes do mês selecionado */}
        <div>
          <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">
            {MESES_COMPLETOS[mesSelecionado - 1]} {ano}
          </p>

          {carregandoDetalhes ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm animate-pulse">Carregando...</p>
            </div>
          ) : detalhesMes ? (
            <div className="space-y-3">

              {/* Quem pagou */}
              <div className="bg-white rounded-2xl shadow-sm border border-pago-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-pago-light border-b border-pago-border">
                  <span className="text-sm font-bold text-pago">
                    ✅ Pagaram ({detalhesMes.pagaram.length})
                  </span>
                  <span className="text-xs font-semibold text-pago">
                    {formatarValor(detalhesMes.pagaram.reduce((s, p) => s + p.total, 0))}
                  </span>
                </div>
                {detalhesMes.pagaram.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Nenhum pagamento registrado.</p>
                ) : (
                  detalhesMes.pagaram.map(p => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/dizimista/${p.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {[...p.formas].map(f => f === 'pix' ? '📱' : '💵').join('')}
                        </span>
                        <span className="text-sm text-manto font-semibold">{p.nome}</span>
                      </div>
                      <span className="text-sm font-bold text-pago">{formatarValor(p.total)}</span>
                    </button>
                  ))
                )}
              </div>

              {/* Quem não pagou */}
              {detalhesMes.naoPagaram.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-ausente-border overflow-hidden">
                  <div className="px-4 py-2.5 bg-ausente-light border-b border-ausente-border">
                    <span className="text-sm font-bold text-ausente">
                      ⏳ Em aberto ({detalhesMes.naoPagaram.length})
                    </span>
                  </div>
                  {detalhesMes.naoPagaram.map(d => (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/dizimista/${d.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left"
                    >
                      <span className="text-sm text-gray-600">{d.nome}</span>
                      <span className="text-xs text-gray-400">→</span>
                    </button>
                  ))}
                </div>
              )}

              {detalhesMes.naoPagaram.length === 0 && detalhesMes.pagaram.length > 0 && (
                <div className="text-center py-3 bg-pago-light rounded-xl border border-pago-border">
                  <p className="text-sm font-bold text-pago">🎉 Todos os dizimistas pagaram este mês!</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
