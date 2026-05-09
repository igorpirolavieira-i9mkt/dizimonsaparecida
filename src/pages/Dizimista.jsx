// src/pages/Dizimista.jsx
// Perfil individual do dizimista — histórico de pagamentos + lançamento de múltiplos meses

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ANO_ATUAL = new Date().getFullYear()
const ANOS_DISPONIVEIS = [ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1]

export default function Dizimista() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [dizimista, setDizimista] = useState(null)
  const [contribuicoes, setContribuicoes] = useState([]) // todas as contribuições
  const [carregando, setCarregando] = useState(true)
  const [anoVisualizado, setAnoVisualizado] = useState(ANO_ATUAL)

  // Modal de múltiplos meses
  const [modalMultiplos, setModalMultiplos] = useState(false)

  // Link compartilhável para a Consulta pública
  const [copiado, setCopiado] = useState(false)

  // Abre o modal automaticamente se vier com ?acao=multiplos
  useEffect(() => {
    if (searchParams.get('acao') === 'multiplos') {
      setModalMultiplos(true)
    }
  }, [searchParams])

  useEffect(() => {
    carregarDados()
  }, [id])

  async function carregarDados() {
    setCarregando(true)
    try {
      // Busca o dizimista
      const { data: d, error: errD } = await supabase
        .from('dizimistas')
        .select('*')
        .eq('id', id)
        .single()
      if (errD) throw errD
      setDizimista(d)

      // Busca todas as contribuições dele (todos os anos)
      const { data: c, error: errC } = await supabase
        .from('contribuicoes')
        .select('id, ano_referencia, mes_referencia, valor, forma_pagamento, data_registro, observacao')
        .eq('dizimista_id', id)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })
      if (errC) throw errC
      setContribuicoes(c || [])
    } catch (err) {
      console.error('Erro ao carregar:', err)
    } finally {
      setCarregando(false)
    }
  }

  // Agrupa contribuições por ano e mês (somando valores — regra #4)
  function contribuicoesPorAnoMes() {
    const mapa = {}
    for (const c of contribuicoes) {
      const ano = c.ano_referencia
      const mes = c.mes_referencia
      if (!mapa[ano]) mapa[ano] = {}
      if (!mapa[ano][mes]) mapa[ano][mes] = 0
      mapa[ano][mes] += Number(c.valor)
    }
    return mapa
  }

  // Anos que têm pelo menos uma contribuição (+ ano atual)
  function anosComHistorico() {
    const anos = new Set(contribuicoes.map(c => c.ano_referencia))
    anos.add(ANO_ATUAL)
    return Array.from(anos).sort((a, b) => b - a)
  }

  function formatarAniversario(data) {
    if (!data) return null
    const [, mes, dia] = data.split('-')
    return `${dia}/${mes}`
  }

  function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Copia o link de consulta pública com o id já preenchido
  function compartilharLink() {
    const url = `${window.location.origin}/consulta?id=${id}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2500)
      })
    } else {
      // Fallback para dispositivos sem clipboard API
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  function totalAno(ano, mapa) {
    const porMes = mapa[ano] || {}
    return Object.values(porMes).reduce((s, v) => s + v, 0)
  }

  function mesesPagosNoAno(ano, mapa) {
    return Object.keys(mapa[ano] || {}).length
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🕊️</div>
          <p className="text-manto text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!dizimista) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-gray-600 font-semibold">Dizimista não encontrado.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-manto text-sm underline">
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }

  const mapa = contribuicoesPorAnoMes()
  const anos = anosComHistorico()
  const porMesAnoAtual = mapa[anoVisualizado] || {}

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="manto-header bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-200 hover:text-white text-xl leading-none"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{dizimista.nome}</h1>
          <p className="text-blue-200 text-xs">Perfil do dizimista</p>
        </div>
        {!dizimista.ativo && (
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full shrink-0">inativo</span>
        )}
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Card de dados pessoais */}
        <div className="bg-white rounded-2xl shadow-sm border border-dourado/20 px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {dizimista.data_nascimento && (
                <p className="text-sm text-gray-600">
                  🎂 Aniversário: <strong>{formatarAniversario(dizimista.data_nascimento)}</strong>
                </p>
              )}
              {dizimista.telefone && (
                <p className="text-sm text-gray-600">
                  📱 <a href={`tel:${dizimista.telefone}`} className="text-manto font-semibold">{dizimista.telefone}</a>
                </p>
              )}
              {dizimista.email && (
                <p className="text-sm text-gray-600 truncate">
                  ✉️ <span className="text-manto">{dizimista.email}</span>
                </p>
              )}
              {!dizimista.data_nascimento && !dizimista.telefone && !dizimista.email && (
                <p className="text-sm text-gray-400">Sem dados de contato cadastrados.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0 ml-2">
              <button
                onClick={() => navigate(`/admin`)}
                className="text-manto text-xs border border-manto/30 rounded-lg px-2 py-1 hover:bg-manto/5"
              >
                ✏️ Editar
              </button>
              <button
                onClick={compartilharLink}
                className={`text-xs rounded-lg px-2 py-1 transition-all border ${
                  copiado
                    ? 'bg-pago text-white border-pago'
                    : 'text-dourado-dark border-dourado/40 hover:bg-dourado/5'
                }`}
                title="Copiar link de consulta pública"
              >
                {copiado ? '✓ Copiado!' : '🔗 Consulta'}
              </button>
            </div>
          </div>
        </div>

        {/* Resumo do ano atual */}
        <div className="bg-manto text-white rounded-2xl shadow-md px-4 py-4 border-b-[3px] border-dourado">
          <p className="text-dourado text-xs font-semibold uppercase tracking-wider mb-3">
            Situação {anoVisualizado}
          </p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-2xl font-bold">{formatarValor(totalAno(anoVisualizado, mapa))}</p>
              <p className="text-blue-200 text-xs mt-0.5">
                {mesesPagosNoAno(anoVisualizado, mapa)} mês{mesesPagosNoAno(anoVisualizado, mapa) !== 1 ? 'es' : ''} pago{mesesPagosNoAno(anoVisualizado, mapa) !== 1 ? 's' : ''}
                {' · '}
                {12 - mesesPagosNoAno(anoVisualizado, mapa)} em aberto
              </p>
            </div>
            {/* Seletor de ano */}
            <select
              value={anoVisualizado}
              onChange={e => setAnoVisualizado(Number(e.target.value))}
              className="bg-manto-light text-white text-sm font-bold rounded-lg px-2 py-1.5 border border-blue-400 focus:outline-none"
            >
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-6 gap-1.5">
            {MESES.map((mes, idx) => {
              const numMes = idx + 1
              const valor = porMesAnoAtual[numMes]
              const pago = valor !== undefined && valor > 0
              const ehAtual = numMes === new Date().getMonth() + 1 && anoVisualizado === ANO_ATUAL
              return (
                <div
                  key={mes}
                  className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border transition-all
                    ${pago
                      ? 'bg-pago text-white border-pago/50'
                      : ehAtual
                      ? 'bg-dourado/30 text-dourado border-dourado/50 ring-1 ring-dourado/50'
                      : 'bg-manto-light/60 text-blue-200 border-manto-light'
                    }`}
                >
                  <div>{mes}</div>
                  {pago && (
                    <div className="text-[9px] font-normal opacity-90 mt-0.5">
                      {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Botão de lançar múltiplos meses */}
        <button
          onClick={() => setModalMultiplos(true)}
          className="w-full py-3 rounded-xl font-semibold text-sm text-manto border-2 border-dourado/40 bg-white hover:bg-dourado/5 active:bg-dourado/10 transition-all shadow-sm"
        >
          📅 Lançar múltiplos meses de uma vez
        </button>

        {/* Histórico detalhado */}
        <div>
          <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">
            Histórico completo
          </p>

          {contribuicoes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">Nenhuma contribuição registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupa por ano */}
              {anos.map(ano => {
                const contribsDoAno = contribuicoes.filter(c => c.ano_referencia === ano)
                if (contribsDoAno.length === 0) return null
                return (
                  <div key={ano} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Cabeçalho do ano */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-manto/5 border-b border-manto/10">
                      <span className="text-sm font-bold text-manto">{ano}</span>
                      <span className="text-xs text-gray-500 font-semibold">
                        Total: {formatarValor(totalAno(ano, mapa))}
                      </span>
                    </div>
                    {/* Registros do ano */}
                    {contribsDoAno.map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                        {/* Indicador de forma de pagamento */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                          ${c.forma_pagamento === 'pix' ? 'bg-pix-light' : 'bg-pago-light'}`}>
                          {c.forma_pagamento === 'pix' ? '📱' : '💵'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-manto">
                            {MESES_COMPLETOS[c.mes_referencia - 1]}
                          </p>
                          <p className="text-xs text-gray-400">
                            {c.data_registro
                              ? `Lançado em ${new Date(c.data_registro).toLocaleDateString('pt-BR')}`
                              : ''}
                            {c.observacao ? ` · ${c.observacao}` : ''}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-pago shrink-0">
                          {formatarValor(c.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal — Lançar múltiplos meses */}
      {modalMultiplos && (
        <ModalMultiplosMeses
          dizimista={dizimista}
          onFechar={() => setModalMultiplos(false)}
          onSalvo={carregarDados}
        />
      )}
    </div>
  )
}

// ===========================================================
// Modal: lançar vários meses de uma vez (retroativo/adiantado)
// ===========================================================
function ModalMultiplosMeses({ dizimista, onFechar, onSalvo }) {
  const [anoRef, setAnoRef] = useState(ANO_ATUAL)
  const [mesesSelecionados, setMesesSelecionados] = useState([]) // array de números 1-12
  const [valor, setValor] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('dinheiro')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  // Contribuições já existentes para marcar no grid
  const [jaExistem, setJaExistem] = useState({})

  useEffect(() => {
    carregarExistentes()
  }, [anoRef])

  async function carregarExistentes() {
    const { data } = await supabase
      .from('contribuicoes')
      .select('mes_referencia, valor')
      .eq('dizimista_id', dizimista.id)
      .eq('ano_referencia', anoRef)

    const mapa = {}
    for (const c of data || []) {
      mapa[c.mes_referencia] = (mapa[c.mes_referencia] || 0) + Number(c.valor)
    }
    setJaExistem(mapa)
    // Desmarca meses que já têm pagamento
    setMesesSelecionados(prev => prev.filter(m => !mapa[m]))
  }

  function toggleMes(mes) {
    setMesesSelecionados(prev =>
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    )
  }

  function selecionarTodosEmAberto() {
    const emAberto = MESES.map((_, i) => i + 1).filter(m => !jaExistem[m])
    setMesesSelecionados(emAberto)
  }

  async function salvar() {
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      setMensagem({ tipo: 'erro', texto: 'Informe um valor válido.' })
      return
    }
    if (mesesSelecionados.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Selecione pelo menos um mês.' })
      return
    }

    setSalvando(true)
    setMensagem(null)
    try {
      const registros = mesesSelecionados.map(mes => ({
        dizimista_id: dizimista.id,
        ano_referencia: anoRef,
        mes_referencia: mes,
        valor: valorNum,
        forma_pagamento: formaPagamento,
        observacao: observacao.trim() || null,
      }))

      const { error } = await supabase.from('contribuicoes').insert(registros)
      if (error) throw error

      setMensagem({
        tipo: 'sucesso',
        texto: `${mesesSelecionados.length} mês${mesesSelecionados.length > 1 ? 'es' : ''} lançado${mesesSelecionados.length > 1 ? 's' : ''}!`
      })
      onSalvo()
      setTimeout(() => {
        onFechar()
      }, 1500)
    } catch (err) {
      console.error('Erro:', err)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-dourado sticky top-0 bg-manto text-white z-10">
          <div>
            <h2 className="font-bold">📅 Múltiplos meses</h2>
            <p className="text-xs text-blue-200">{dizimista.nome}</p>
          </div>
          <button onClick={onFechar} className="text-blue-200 text-xl hover:text-white">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Seletor de ano */}
          <div>
            <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">Ano de referência</label>
            <select
              value={anoRef}
              onChange={e => setAnoRef(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 bg-gray-50 font-semibold text-sm"
            >
              {ANOS_DISPONIVEIS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Grid de meses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-dourado uppercase tracking-wider">Selecione os meses</label>
              <button
                type="button"
                onClick={selecionarTodosEmAberto}
                className="text-xs text-manto font-semibold hover:underline"
              >
                Todos em aberto
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MESES.map((mes, idx) => {
                const numMes = idx + 1
                const jaPago = !!jaExistem[numMes]
                const selecionado = mesesSelecionados.includes(numMes)
                return (
                  <button
                    key={mes}
                    type="button"
                    onClick={() => !jaPago && toggleMes(numMes)}
                    disabled={jaPago}
                    className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                      ${jaPago
                        ? 'bg-pago-light text-pago border-pago-border cursor-not-allowed'
                        : selecionado
                        ? 'bg-manto text-white border-manto shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-manto/40'
                      }`}
                  >
                    {mes}
                    {jaPago && <div className="text-[9px] font-normal">✓ pago</div>}
                  </button>
                )
              })}
            </div>
            {mesesSelecionados.length > 0 && (
              <p className="text-xs text-manto font-semibold mt-2 text-center">
                {mesesSelecionados.length} mês{mesesSelecionados.length > 1 ? 'es' : ''} selecionado{mesesSelecionados.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">
              Valor por mês (R$)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="w-full px-4 py-3 text-lg font-bold rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 bg-gray-50"
            />
            {valor && mesesSelecionados.length > 1 && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                Total: {Number(parseFloat(valor.replace(',','.')) * mesesSelecionados.length || 0)
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>

          {/* Forma de pagamento */}
          <div>
            <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {['dinheiro','pix'].map(forma => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => setFormaPagamento(forma)}
                  className={`py-3 rounded-xl font-bold text-sm border-2 transition-all
                    ${formaPagamento === forma
                      ? forma === 'pix'
                        ? 'bg-pix text-white border-pix shadow-md'
                        : 'bg-pago text-white border-pago shadow-md'
                      : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                  {forma === 'dinheiro' ? '💵 Dinheiro' : '📱 PIX'}
                </button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">Observação (opcional)</label>
            <input
              type="text"
              placeholder="Ex: retroativo, pagamento anual..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 bg-gray-50 text-sm"
            />
          </div>

          {/* Feedback */}
          {mensagem && (
            <div className={`rounded-xl px-4 py-3 text-sm font-semibold
              ${mensagem.tipo === 'sucesso'
                ? 'bg-pago-light text-pago border border-pago-border'
                : 'bg-ausente-light text-ausente border border-ausente-border'
              }`}>
              {mensagem.tipo === 'sucesso' ? '✅' : '❌'} {mensagem.texto}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pb-2">
            <button
              onClick={onFechar}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all
                ${salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark active:scale-95'}`}
            >
              {salvando ? '⏳ Salvando...' : `💾 Lançar ${mesesSelecionados.length > 0 ? mesesSelecionados.length : ''} mês${mesesSelecionados.length !== 1 ? 'es' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
