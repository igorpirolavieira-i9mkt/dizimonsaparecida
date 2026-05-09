// src/pages/RelatorioDia.jsx
// Canhoto da mitra — lançamentos por período
// UX Otimizado: botões grandes de período, auto-busca via useEffect, total em destaque no topo

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function paraInputDate(d) {
  return d.toISOString().split('T')[0]
}

const hoje = new Date()
const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

// Períodos pré-definidos — 1 toque em vez de digitar datas
const PERIODOS = [
  {
    label: 'Hoje',
    icone: '📅',
    fn: () => {
      const h = paraInputDate(hoje)
      return { inicio: h, fim: h }
    },
  },
  {
    label: 'Esta semana',
    icone: '📆',
    fn: () => {
      const dom = new Date(hoje)
      dom.setDate(hoje.getDate() - hoje.getDay())
      return { inicio: paraInputDate(dom), fim: paraInputDate(hoje) }
    },
  },
  {
    label: 'Este mês',
    icone: '🗓️',
    fn: () => ({ inicio: paraInputDate(inicioDoMes), fim: paraInputDate(hoje) }),
  },
  {
    label: 'Mês passado',
    icone: '⏮️',
    fn: () => {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
      return { inicio: paraInputDate(ini), fim: paraInputDate(fim) }
    },
  },
]

export default function RelatorioDia() {
  const navigate = useNavigate()

  const [dataInicio, setDataInicio] = useState(paraInputDate(inicioDoMes))
  const [dataFim, setDataFim]       = useState(paraInputDate(hoje))
  const [periodoAtivo, setPeriodoAtivo] = useState('Este mês')
  const [carregando, setCarregando] = useState(false)
  const [lancamentos, setLancamentos] = useState([])

  // Auto-busca — atualiza automaticamente ao mudar o período
  const buscar = useCallback(async (inicio, fim) => {
    setCarregando(true)
    try {
      const { data, error } = await supabase
        .from('contribuicoes')
        .select(`id, valor, forma_pagamento, mes_referencia, ano_referencia, data_registro, observacao, dizimistas(id, nome)`)
        .gte('data_registro', `${inicio}T00:00:00`)
        .lte('data_registro', `${fim}T23:59:59`)
        .order('data_registro', { ascending: false })
      if (error) throw error
      setLancamentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  // Busca inicial
  useEffect(() => {
    buscar(dataInicio, dataFim)
  }, []) // eslint-disable-line

  // Busca automática ao mudar período via inputs de data
  useEffect(() => {
    if (dataInicio && dataFim && dataInicio <= dataFim) {
      const timer = setTimeout(() => buscar(dataInicio, dataFim), 400)
      return () => clearTimeout(timer)
    }
  }, [dataInicio, dataFim, buscar])

  function selecionarPeriodo(periodo) {
    const { inicio, fim } = periodo.fn()
    setPeriodoAtivo(periodo.label)
    setDataInicio(inicio)
    setDataFim(fim)
    // useEffect acima detecta mudança e dispara a busca
  }

  // Totais
  const totalGeral    = lancamentos.reduce((s, l) => s + Number(l.valor), 0)
  const totalDinheiro = lancamentos.filter(l => l.forma_pagamento === 'dinheiro').reduce((s, l) => s + Number(l.valor), 0)
  const totalPix      = lancamentos.filter(l => l.forma_pagamento === 'pix').reduce((s, l) => s + Number(l.valor), 0)
  const qtdDinheiro   = lancamentos.filter(l => l.forma_pagamento === 'dinheiro').length
  const qtdPix        = lancamentos.filter(l => l.forma_pagamento === 'pix').length

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatarDataHora(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatarDataCurta(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  function exportarExcel() {
    const linhas = lancamentos.map(l => ({
      'Data Lançamento':  formatarDataHora(l.data_registro),
      'Dizimista':        l.dizimistas?.nome || '?',
      'Mês Referência':   MESES_COMPLETOS[(l.mes_referencia || 1) - 1],
      'Ano Referência':   l.ano_referencia,
      'Valor (R$)':       Number(l.valor).toFixed(2).replace('.', ','),
      'Forma Pagamento':  l.forma_pagamento === 'pix' ? 'PIX' : 'Dinheiro',
      'Observação':       l.observacao || '',
    }))
    linhas.push({})
    linhas.push({
      'Data Lançamento': 'TOTAL GERAL',
      'Valor (R$)':      formatarValor(totalGeral),
      'Observação':      `Dinheiro: ${formatarValor(totalDinheiro)} | PIX: ${formatarValor(totalPix)}`,
    })
    const ws = XLSX.utils.json_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Canhoto')
    ws['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 25 }]
    XLSX.writeFile(wb, `Canhoto_${dataInicio}_${dataFim}_NSAparecida.xlsx`)
  }

  const porData = {}
  for (const l of lancamentos) {
    const data = formatarDataCurta(l.data_registro)
    if (!porData[data]) porData[data] = []
    porData[data].push(l)
  }
  const datasOrdenadas = Object.keys(porData)

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <h1 className="text-base font-bold">📋 Canhoto da Mitra</h1>
        <p className="text-blue-200 text-xs">Lançamentos por período — data de registro</p>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Botões grandes de período — 1 toque em vez de digitar data */}
        <div className="grid grid-cols-2 gap-2">
          {PERIODOS.map(p => (
            <button
              key={p.label}
              onClick={() => selecionarPeriodo(p)}
              className={`flex items-center gap-2 px-3 py-3.5 rounded-xl font-semibold text-sm border-2 transition-all
                ${periodoAtivo === p.label
                  ? 'bg-manto text-white border-manto shadow-md'
                  : 'bg-white text-manto border-manto/20 hover:border-manto/50'
                }`}
            >
              <span className="text-base">{p.icone}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtro de datas manuais */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
          <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">Período personalizado</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">De</label>
              <input
                type="date" value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPeriodoAtivo('') }}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm font-semibold bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Até</label>
              <input
                type="date" value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPeriodoAtivo('') }}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm font-semibold bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Total geral em destaque — aparece no topo, antes da lista */}
        <div className="bg-manto text-white rounded-2xl shadow-md px-5 py-4 border-b-[3px] border-dourado">
          {carregando ? (
            <div className="text-center py-1">
              <p className="text-blue-200 text-sm animate-pulse">⏳ Atualizando...</p>
            </div>
          ) : (
            <>
              <p className="text-dourado text-xs font-bold uppercase tracking-wider mb-1">Total arrecadado</p>
              <p className="text-3xl font-bold">{formatarValor(totalGeral)}</p>
              <p className="text-blue-200 text-xs mt-1">{lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-4 mt-3">
                <div>
                  <p className="text-blue-300 text-xs">💵 Dinheiro</p>
                  <p className="text-pago-light font-bold text-sm">{formatarValor(totalDinheiro)}</p>
                  <p className="text-blue-400 text-xs">{qtdDinheiro} lanç.</p>
                </div>
                <div className="w-px bg-blue-600" />
                <div>
                  <p className="text-blue-300 text-xs">📱 PIX</p>
                  <p className="text-pix-light font-bold text-sm">{formatarValor(totalPix)}</p>
                  <p className="text-blue-400 text-xs">{qtdPix} lanç.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Exportar Excel */}
        {lancamentos.length > 0 && (
          <button
            onClick={exportarExcel}
            className="w-full py-3 rounded-xl font-semibold text-sm text-manto border-2 border-dourado/40 bg-white hover:bg-dourado/5 transition-all"
          >
            📤 Exportar Excel
          </button>
        )}

        {/* Lista agrupada por data */}
        {!carregando && lancamentos.length === 0 && (
          <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-semibold">Nenhum lançamento no período.</p>
            <p className="text-xs mt-1">Tente outro período.</p>
          </div>
        )}

        <div className="space-y-3">
          {datasOrdenadas.map(data => {
            const itens = porData[data]
            const totalDia = itens.reduce((s, l) => s + Number(l.valor), 0)
            return (
              <div key={data} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-manto/5 border-b border-manto/10">
                  <span className="text-sm font-bold text-manto">{data}</span>
                  <span className="text-xs font-semibold text-gray-500">
                    {itens.length} lanç. · {formatarValor(totalDia)}
                  </span>
                </div>
                {itens.map(l => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/dizimista/${l.dizimistas?.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left min-h-[52px]"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                      ${l.forma_pagamento === 'pix' ? 'bg-pix-light' : 'bg-pago-light'}`}>
                      {l.forma_pagamento === 'pix' ? '📱' : '💵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-manto truncate">{l.dizimistas?.nome || '?'}</p>
                      <p className="text-xs text-gray-400">
                        Ref: {MESES_COMPLETOS[(l.mes_referencia || 1) - 1]}/{l.ano_referencia}
                        {l.observacao ? ` · ${l.observacao}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-pago shrink-0">{formatarValor(l.valor)}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
