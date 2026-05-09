// src/pages/Dashboard.jsx
// Tela inicial — resumo mensal + aniversariantes do mês + acesso rápido
// Substitui o Home como rota /

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const hoje    = new Date()
const MES     = hoje.getMonth() + 1          // 1-12
const ANO     = hoje.getFullYear()
const MES_PAD = String(MES).padStart(2, '0') // "05"

export default function Dashboard() {
  const navigate = useNavigate()

  const [resumo, setResumo] = useState(null)
  const [aniversariantes, setAniversariantes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    try {
      // Total de dizimistas ativos
      const { count: totalDizimistas } = await supabase
        .from('dizimistas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Contribuições do mês atual por mes_referencia
      const { data: contribs } = await supabase
        .from('contribuicoes')
        .select('dizimista_id, valor, forma_pagamento')
        .eq('mes_referencia', MES)
        .eq('ano_referencia', ANO)

      const total        = (contribs || []).reduce((s, c) => s + Number(c.valor), 0)
      const pagaram      = new Set((contribs || []).map(c => c.dizimista_id)).size
      const totalDinheiro = (contribs || []).filter(c => c.forma_pagamento === 'dinheiro').reduce((s, c) => s + Number(c.valor), 0)
      const totalPix     = (contribs || []).filter(c => c.forma_pagamento === 'pix').reduce((s, c) => s + Number(c.valor), 0)

      setResumo({ total, pagaram, totalDizimistas: totalDizimistas || 0, totalDinheiro, totalPix })

      // Aniversariantes do mês atual
      const { data: todos } = await supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null)

      const aniv = (todos || [])
        .filter(d => d.data_nascimento.split('-')[1] === MES_PAD)
        .sort((a, b) => parseInt(a.data_nascimento.split('-')[2]) - parseInt(b.data_nascimento.split('-')[2]))

      setAniversariantes(aniv)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setCarregando(false)
    }
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function iniciais(nome) {
    const p = nome.trim().split(' ')
    if (p.length === 1) return p[0][0].toUpperCase()
    return (p[0][0] + p[p.length - 1][0]).toUpperCase()
  }

  function diaMes(data_nascimento) {
    return parseInt(data_nascimento.split('-')[2], 10)
  }

  function isHoje(data_nascimento) {
    const [, mes, dia] = data_nascimento.split('-')
    return parseInt(mes) === MES && parseInt(dia) === hoje.getDate()
  }

  const pct = resumo && resumo.totalDizimistas > 0
    ? Math.round((resumo.pagaram / resumo.totalDizimistas) * 100)
    : 0

  // Cartões de acesso rápido
  const ACOES = [
    { icone: '💰', label: 'Lançar dízimo',    sub: 'Buscar dizimista',       rota: '/lancar',        destaque: true  },
    { icone: '📊', label: 'Resumo mensal',     sub: 'Quem pagou e quem não', rota: '/resumo',        destaque: false },
    { icone: '📋', label: 'Canhoto da mitra',  sub: 'Relatório por período', rota: '/relatorio-dia', destaque: false },
    { icone: '📁', label: 'Comprovantes',      sub: 'PIX e anexos',          rota: '/comprovantes',  destaque: false },
  ]

  return (
    <div className="min-h-screen bg-manto-50">

      {/* Header */}
      <header className="manto-header bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: '#F0D98C' }}>🕊️ NS Aparecida</h1>
            <p className="text-blue-200 text-xs">{MESES_COMPLETOS[MES - 1]} · {ANO}</p>
          </div>
          <p className="text-xs font-bold text-dourado uppercase tracking-wider">Dashboard</p>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {carregando ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-pulse">🕊️</div>
            <p className="text-manto/50 text-sm">Carregando...</p>
          </div>
        ) : (
          <>
            {/* Card azul — resumo mensal */}
            <div className="bg-manto text-white rounded-2xl shadow-manto px-5 py-4 border-b-[3px] border-dourado">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#F0D98C' }}>
                Total · {MESES[MES - 1]} {ANO}
              </p>
              <p className="text-3xl font-bold tracking-tight">{formatarValor(resumo?.total || 0)}</p>

              {/* Barra de progresso */}
              <div className="flex items-center gap-3 mt-3 mb-3">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-dourado rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-blue-200 text-xs shrink-0">
                  {resumo?.pagaram} / {resumo?.totalDizimistas} ({pct}%)
                </p>
              </div>

              {/* Dinheiro × PIX */}
              <div className="flex gap-5 pt-3 border-t border-white/10">
                <div>
                  <p className="text-blue-300 text-xs">💵 Dinheiro</p>
                  <p className="font-bold text-sm text-pago-light">{formatarValor(resumo?.totalDinheiro)}</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-blue-300 text-xs">📱 PIX</p>
                  <p className="font-bold text-sm text-pix-light">{formatarValor(resumo?.totalPix)}</p>
                </div>
              </div>
            </div>

            {/* Aniversariantes do mês */}
            {aniversariantes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-manto/5 border-b border-manto/10">
                  <p className="text-xs font-bold text-dourado uppercase tracking-wider">
                    🎂 Aniversariantes de {MESES[MES - 1]}
                  </p>
                  <button
                    onClick={() => navigate('/aniversariantes')}
                    className="text-xs font-semibold text-manto hover:text-dourado transition-colors"
                  >
                    Ver todos →
                  </button>
                </div>

                <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-none">
                  {aniversariantes.map(d => {
                    const hoje_flag = isHoje(d.data_nascimento)
                    return (
                      <button
                        key={d.id}
                        onClick={() => navigate(`/dizimista/${d.id}`)}
                        className="flex flex-col items-center gap-1.5 shrink-0 min-w-[52px] active:scale-95 transition-transform"
                      >
                        {/* Avatar com iniciais */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm relative
                          ${hoje_flag ? 'bg-dourado text-white shadow-dourado' : 'bg-azul-palido text-manto'}`}>
                          {iniciais(d.nome)}
                          {hoje_flag && (
                            <span className="absolute -top-1 -right-1 text-sm leading-none">🎂</span>
                          )}
                        </div>
                        {/* Primeiro nome */}
                        <p className="text-[10px] font-semibold text-gray-600 leading-tight text-center max-w-[52px] truncate">
                          {d.nome.split(' ')[0]}
                        </p>
                        {/* Dia/Mês */}
                        <p className={`text-[10px] font-bold leading-none ${hoje_flag ? 'text-dourado' : 'text-manto/50'}`}>
                          {diaMes(d.data_nascimento)}/{MES_PAD}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Acesso rápido — grid 2×2 */}
            <div>
              <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2 px-1">
                Acesso rápido
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ACOES.map(item => (
                  <button
                    key={item.rota}
                    onClick={() => navigate(item.rota)}
                    className={`flex flex-col items-start gap-2 px-4 py-4 rounded-2xl border text-left transition-all active:scale-[0.97]
                      ${item.destaque
                        ? 'bg-manto text-white border-manto shadow-manto'
                        : 'bg-white text-manto border-cinza-borda hover:border-dourado/40 shadow-sm'
                      }`}
                  >
                    <span className="text-2xl">{item.icone}</span>
                    <div>
                      <p className={`text-sm font-bold ${item.destaque ? '' : 'text-manto'}`}
                         style={item.destaque ? { color: '#F0D98C' } : {}}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${item.destaque ? 'text-blue-200' : 'text-gray-400'}`}>
                        {item.sub}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}
