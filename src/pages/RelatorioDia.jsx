// src/pages/RelatorioDia.jsx
// Canhoto da mitra — lançamentos por período com totais por forma de pagamento + exportação Excel

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Formata data para YYYY-MM-DD (padrão do input date)
function paraInputDate(d) {
  return d.toISOString().split('T')[0]
}

// Hoje e início do mês como datas padrão
const hoje = new Date()
const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

export default function RelatorioDia() {
  const navigate = useNavigate()

  const [dataInicio, setDataInicio] = useState(paraInputDate(inicioDoMes))
  const [dataFim, setDataFim] = useState(paraInputDate(hoje))
  const [carregando, setCarregando] = useState(false)
  const [lancamentos, setLancamentos] = useState([])
  const [buscado, setBuscado] = useState(false)

  // Busca ao carregar (período padrão = mês atual)
  useEffect(() => {
    buscar()
  }, [])

  async function buscar() {
    setCarregando(true)
    setBuscado(false)
    try {
      // Usa data_registro (data real do lançamento — regra de negócio #2)
      const inicio = `${dataInicio}T00:00:00`
      const fim = `${dataFim}T23:59:59`

      const { data, error } = await supabase
        .from('contribuicoes')
        .select(`
          id,
          valor,
          forma_pagamento,
          mes_referencia,
          ano_referencia,
          data_registro,
          observacao,
          dizimistas(id, nome)
        `)
        .gte('data_registro', inicio)
        .lte('data_registro', fim)
        .order('data_registro', { ascending: false })

      if (error) throw error
      setLancamentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar:', err)
    } finally {
      setCarregando(false)
      setBuscado(true)
    }
  }

  // Totais
  const totalGeral = lancamentos.reduce((s, l) => s + Number(l.valor), 0)
  const totalDinheiro = lancamentos.filter(l => l.forma_pagamento === 'dinheiro').reduce((s, l) => s + Number(l.valor), 0)
  const totalPix = lancamentos.filter(l => l.forma_pagamento === 'pix').reduce((s, l) => s + Number(l.valor), 0)
  const qtdDinheiro = lancamentos.filter(l => l.forma_pagamento === 'dinheiro').length
  const qtdPix = lancamentos.filter(l => l.forma_pagamento === 'pix').length

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
      'Data Lançamento': formatarDataHora(l.data_registro),
      'Dizimista': l.dizimistas?.nome || '?',
      'Mês Referência': MESES_COMPLETOS[(l.mes_referencia || 1) - 1],
      'Ano Referência': l.ano_referencia,
      'Valor (R$)': Number(l.valor).toFixed(2).replace('.', ','),
      'Forma Pagamento': l.forma_pagamento === 'pix' ? 'PIX' : 'Dinheiro',
      'Observação': l.observacao || '',
    }))

    // Linha de totais no final
    linhas.push({})
    linhas.push({
      'Data Lançamento': 'TOTAL GERAL',
      'Dizimista': '',
      'Mês Referência': '',
      'Ano Referência': '',
      'Valor (R$)': formatarValor(totalGeral),
      'Forma Pagamento': '',
      'Observação': `Dinheiro: ${formatarValor(totalDinheiro)} | PIX: ${formatarValor(totalPix)}`,
    })

    const ws = XLSX.utils.json_to_sheet(linhas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Canhoto')

    // Largura das colunas
    ws['!cols'] = [
      { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 25 }
    ]

    const nomeArq = `Canhoto_${dataInicio}_${dataFim}_NSAparecida.xlsx`
    XLSX.writeFile(wb, nomeArq)
  }

  // Agrupa lançamentos por data (para o canhoto visual)
  const porData = {}
  for (const l of lancamentos) {
    const data = formatarDataCurta(l.data_registro)
    if (!porData[data]) porData[data] = []
    porData[data].push(l)
  }
  const datasOrdenadas = Object.keys(porData) // já vêm em ordem decrescente

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <h1 className="text-base font-bold">📋 Canhoto da Mitra</h1>
        <p className="text-blue-200 text-xs">Lançamentos por período (data de registro)</p>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Filtro de período */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 px-4 py-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Período</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">De</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 text-sm font-semibold bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Até</label>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 text-sm font-semibold bg-gray-50"
              />
            </div>
          </div>

          {/* Atalhos de período */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Hoje', fn: () => { const h = paraInputDate(hoje); setDataInicio(h); setDataFim(h) } },
              { label: 'Esta semana', fn: () => {
                const dom = new Date(hoje); dom.setDate(hoje.getDate() - hoje.getDay())
                setDataInicio(paraInputDate(dom)); setDataFim(paraInputDate(hoje))
              }},
              { label: 'Este mês', fn: () => {
                setDataInicio(paraInputDate(inicioDoMes)); setDataFim(paraInputDate(hoje))
              }},
              { label: 'Mês passado', fn: () => {
                const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
                const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
                setDataInicio(paraInputDate(ini)); setDataFim(paraInputDate(fim))
              }},
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={() => { fn(); setTimeout(buscar, 50) }}
                className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 font-semibold"
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={buscar}
            disabled={carregando}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all
              ${carregando ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 active:scale-95'}`}
          >
            {carregando ? '⏳ Buscando...' : '🔍 Gerar Relatório'}
          </button>
        </div>

        {/* Cards de totais */}
        {buscado && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-700 text-white rounded-xl shadow-md px-3 py-3 text-center">
                <p className="text-blue-200 text-xs font-semibold">Total</p>
                <p className="text-base font-bold mt-1">{formatarValor(totalGeral)}</p>
                <p className="text-blue-300 text-xs">{lancamentos.length} lanç.</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-green-100 px-3 py-3 text-center">
                <p className="text-gray-400 text-xs font-semibold">💵 Dinheiro</p>
                <p className="text-base font-bold text-green-700 mt-1">{formatarValor(totalDinheiro)}</p>
                <p className="text-gray-400 text-xs">{qtdDinheiro} lanç.</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 px-3 py-3 text-center">
                <p className="text-gray-400 text-xs font-semibold">📱 PIX</p>
                <p className="text-base font-bold text-blue-700 mt-1">{formatarValor(totalPix)}</p>
                <p className="text-gray-400 text-xs">{qtdPix} lanç.</p>
              </div>
            </div>

            {/* Botão exportar */}
            {lancamentos.length > 0 && (
              <button
                onClick={exportarExcel}
                className="w-full py-3 rounded-xl font-semibold text-sm text-blue-700 border-2 border-blue-200 bg-white hover:bg-blue-50 active:bg-blue-100 transition-all"
              >
                📤 Exportar Excel
              </button>
            )}

            {/* Lista de lançamentos agrupados por data */}
            {lancamentos.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-semibold">Nenhum lançamento no período.</p>
                <p className="text-xs mt-1">Tente ampliar o intervalo de datas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {datasOrdenadas.map(data => {
                  const itens = porData[data]
                  const totalDia = itens.reduce((s, l) => s + Number(l.valor), 0)
                  return (
                    <div key={data} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Cabeçalho do dia */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-sm font-bold text-blue-900">{data}</span>
                        <span className="text-xs font-semibold text-gray-500">
                          {itens.length} lanç. · {formatarValor(totalDia)}
                        </span>
                      </div>
                      {/* Lançamentos do dia */}
                      {itens.map(l => (
                        <button
                          key={l.id}
                          onClick={() => navigate(`/dizimista/${l.dizimistas?.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 text-left"
                        >
                          {/* Ícone de pagamento */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                            ${l.forma_pagamento === 'pix' ? 'bg-blue-100' : 'bg-green-100'}`}>
                            {l.forma_pagamento === 'pix' ? '📱' : '💵'}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-blue-900 truncate">
                              {l.dizimistas?.nome || '?'}
                            </p>
                            <p className="text-xs text-gray-400">
                              Ref: {MESES_COMPLETOS[(l.mes_referencia || 1) - 1]}/{l.ano_referencia}
                              {l.observacao ? ` · ${l.observacao}` : ''}
                            </p>
                          </div>
                          {/* Valor */}
                          <span className="text-sm font-bold text-green-700 shrink-0">
                            {formatarValor(l.valor)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
