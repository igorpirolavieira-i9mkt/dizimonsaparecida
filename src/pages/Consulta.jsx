// src/pages/Consulta.jsx
// Tela pública — fiel consulta o próprio histórico sem login
// Segurança: PIN de 4 dígitos = dia + mês do aniversário (ex: 31 de jan → "3101")
// Fluxo: buscar nome → selecionar → digitar PIN → ver histórico

import { useState } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ANO_ATUAL = new Date().getFullYear()

// Deriva o PIN esperado a partir de data_nascimento no formato "1900-01-31"
// Resultado: dia (2 dig) + mês (2 dig) → "3101"
function derivarPin(data_nascimento) {
  if (!data_nascimento) return null
  const [, mes, dia] = data_nascimento.split('-') // ["1900", "01", "31"]
  return `${dia}${mes}` // "3101"
}

export default function Consulta() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [buscou, setBuscou] = useState(false)

  // Etapa 1 — dizimista escolhido, aguardando PIN
  const [pinPendente, setPinPendente]   = useState(null)  // { id, nome, data_nascimento }
  const [pinDigitado, setPinDigitado]   = useState('')
  const [pinErro, setPinErro]           = useState('')
  const [verificandoPin, setVerificandoPin] = useState(false)

  // Etapa 2 — PIN validado, exibe histórico
  const [selecionado, setSelecionado]   = useState(null)
  const [historico, setHistorico]       = useState([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [anoVisualizado, setAnoVisualizado] = useState(ANO_ATUAL)

  // ── Busca por nome ──────────────────────────────────────────
  async function buscar(e) {
    e.preventDefault()
    const texto = busca.trim()
    if (texto.length < 2) return

    setCarregando(true)
    setBuscou(false)
    setPinPendente(null)
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

  // ── Seleciona dizimista — pede PIN ──────────────────────────
  function selecionarParaPin(d) {
    setResultados([])
    setBusca(d.nome)
    setPinDigitado('')
    setPinErro('')
    setPinPendente(d)
  }

  // ── Valida PIN e carrega histórico ──────────────────────────
  async function submeterPin(e) {
    e.preventDefault()
    if (!pinPendente) return

    // Caso especial: dizimista sem data de nascimento cadastrada
    if (!pinPendente.data_nascimento) {
      setPinErro('Este cadastro ainda não tem data de nascimento. Fale com o coordenador para configurar seu PIN.')
      return
    }

    const pinEsperado = derivarPin(pinPendente.data_nascimento)
    if (pinDigitado !== pinEsperado) {
      setPinErro('PIN incorreto. Verifique com o coordenador da comunidade.')
      setPinDigitado('')
      return
    }

    // PIN correto — carrega histórico
    setPinErro('')
    setVerificandoPin(true)
    setSelecionado(pinPendente)
    setPinPendente(null)
    setCarregandoHistorico(true)

    try {
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('ano_referencia, mes_referencia, valor, forma_pagamento, data_registro')
        .eq('dizimista_id', pinPendente.id)
        .order('ano_referencia', { ascending: false })
        .order('mes_referencia', { ascending: false })

      if (error) throw error
      setHistorico(data || [])
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setCarregandoHistorico(false)
      setVerificandoPin(false)
    }
  }

  // ── Limpar e recomeçar ──────────────────────────────────────
  function limpar() {
    setBusca('')
    setSelecionado(null)
    setPinPendente(null)
    setPinDigitado('')
    setPinErro('')
    setResultados([])
    setHistorico([])
    setBuscou(false)
  }

  // ── Helpers de formatação ───────────────────────────────────
  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Agrupa histórico por ano/mês, somando valores (regra #4 — múltiplas contribuições)
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

  const mapa       = mapaPorAnoMes()
  const anos       = selecionado ? anosComHistorico() : []
  const porMesAno  = mapa[anoVisualizado] || {}
  const totalAno   = Object.values(porMesAno).reduce((s, v) => s + v, 0)
  const mesesPagos = Object.keys(porMesAno).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-manto-dark to-manto">

      {/* Header */}
      <header className="px-4 pt-8 pb-4 text-center text-white">
        <div className="text-4xl mb-2">⛪</div>
        <h1 className="splash-titulo text-white text-2xl">Dízimo Aparecida</h1>
        <p className="text-dourado text-xs font-bold tracking-wider uppercase mt-2">Consulta de contribuições</p>
        <p className="text-blue-200 text-xs mt-0.5">Paróquia São Tiago Maior — Guarapari/ES</p>
      </header>

      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">

        {/* Card de busca */}
        {!selecionado && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="h-[3px] bg-faixa-dourada" />
            <div className="px-4 py-5">
              <p className="text-sm font-bold text-manto mb-3">🔍 Consultar meu histórico</p>
              <form onSubmit={buscar} className="flex gap-2">
                <input
                  type="text"
                  value={busca}
                  onChange={e => { setBusca(e.target.value); if (pinPendente || selecionado) limpar() }}
                  placeholder="Digite seu nome..."
                  className="flex-1 px-4 py-3 rounded-xl border-[1.5px] border-cinza-borda focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 text-sm font-medium bg-gray-50 transition-all"
                  autoComplete="off"
                  minLength={2}
                />
                <button
                  type="submit"
                  disabled={carregando || busca.trim().length < 2}
                  className={`px-4 py-3 rounded-xl font-bold text-white text-sm transition-all shrink-0 active:scale-95
                    ${carregando || busca.trim().length < 2 ? 'bg-gray-300 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark'}`}
                >
                  {carregando ? '⏳' : 'Buscar'}
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2">Digite pelo menos 2 letras do seu nome.</p>

              {/* Resultados da busca — SEM mostrar o aniversário (protege o PIN) */}
              {resultados.length > 0 && (
                <ul className="mt-3 border border-cinza-borda rounded-xl overflow-hidden">
                  {resultados.map(d => (
                    <li key={d.id}>
                      <button
                        onClick={() => selecionarParaPin(d)}
                        className="w-full text-left px-4 py-3.5 hover:bg-manto/5 active:bg-manto/10 transition-colors border-b border-gray-50 last:border-0 min-h-[48px]"
                      >
                        <span className="font-semibold text-manto text-sm">{d.nome}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {buscou && resultados.length === 0 && !pinPendente && (
                <p className="mt-3 text-sm text-center text-gray-400">
                  Nenhum cadastro encontrado.<br />
                  <span className="text-xs">Verifique com o responsável da comunidade.</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Etapa PIN ─────────────────────────────────────────── */}
        {pinPendente && !selecionado && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="h-[3px] bg-faixa-dourada" />
            <div className="px-4 py-5">
              <p className="text-sm font-bold text-manto mb-1">🔒 Confirme sua identidade</p>
              <p className="text-xs text-gray-500 mb-4">
                Você selecionou: <span className="font-semibold text-manto">{pinPendente.nome}</span>
              </p>

              <form onSubmit={submeterPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-manto uppercase tracking-wider mb-2">
                    PIN de 4 dígitos
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pinDigitado}
                    onChange={e => { setPinDigitado(e.target.value.replace(/\D/g, '')); setPinErro('') }}
                    placeholder="Ex: 3101"
                    className="w-full px-4 py-4 rounded-xl border-[1.5px] border-cinza-borda focus:outline-none focus:border-dourado focus:ring-2 focus:ring-dourado/15 text-2xl font-bold text-center tracking-[0.5em] bg-gray-50 transition-all"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Seu PIN é o dia e mês do seu aniversário.<br />
                    Exemplo: 31 de Janeiro → <span className="font-bold text-manto">3101</span>
                  </p>
                </div>

                {pinErro && (
                  <div className="bg-ausente-light border border-ausente-border rounded-xl px-4 py-3 text-ausente text-sm text-center">
                    ❌ {pinErro}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={limpar}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-manto border-[1.5px] border-cinza-borda hover:bg-gray-50 transition-all"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={pinDigitado.length < 4}
                    className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95
                      ${pinDigitado.length < 4 ? 'bg-gray-300 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark'}`}
                  >
                    Confirmar →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Histórico (após PIN válido) ───────────────────────── */}
        {selecionado && (
          <div className="space-y-4">
            {carregandoHistorico ? (
              <div className="text-center py-8 text-white">
                <div className="text-3xl mb-2 animate-pulse">🕊️</div>
                <p className="text-sm">Carregando histórico...</p>
              </div>
            ) : (
              <>
                {/* Resumo do ano */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="manto-header bg-manto text-white px-4 py-3 flex items-center justify-between border-b-[3px] border-dourado">
                    <div>
                      <p className="font-bold text-sm">{selecionado.nome}</p>
                      <p className="text-blue-200 text-xs mt-0.5">
                        {mesesPagos} mês{mesesPagos !== 1 ? 'es' : ''} pago{mesesPagos !== 1 ? 's' : ''} em {anoVisualizado}
                        {' · '}{formatarValor(totalAno)}
                      </p>
                    </div>
                    <select
                      value={anoVisualizado}
                      onChange={e => setAnoVisualizado(Number(e.target.value))}
                      className="bg-manto-light text-white text-sm font-bold rounded-lg px-2 py-1.5 border border-blue-400 focus:outline-none"
                    >
                      {anos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {/* Grid de 12 meses */}
                  <div className="px-4 py-4">
                    <div className="grid grid-cols-6 gap-1.5">
                      {MESES.map((mes, idx) => {
                        const numMes = idx + 1
                        const valor  = porMesAno[numMes]
                        const pago   = valor !== undefined && valor > 0
                        const ehAtual = numMes === new Date().getMonth() + 1 && anoVisualizado === ANO_ATUAL
                        return (
                          <div key={mes}
                            className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border
                              ${pago
                                ? 'bg-pago text-white border-pago/50'
                                : ehAtual
                                ? 'bg-dourado/10 text-dourado-dark border-dourado/40 ring-1 ring-dourado/40'
                                : 'bg-gray-50 text-gray-300 border-gray-200'
                              }`}
                          >
                            <div>{mes}</div>
                            {pago && <div className="text-[9px] opacity-90 mt-0.5">✓</div>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-pago inline-block" /> Pago
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" /> Em aberto
                      </span>
                    </div>
                  </div>
                </div>

                {/* Histórico por ano */}
                {anos.map(ano => {
                  const itens = historico.filter(c => c.ano_referencia === ano)
                  if (itens.length === 0) return null
                  const totalDoAno = itens.reduce((s, c) => s + Number(c.valor), 0)
                  return (
                    <div key={ano} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-manto/5 border-b border-manto/10">
                        <span className="text-sm font-bold text-manto">{ano}</span>
                        <span className="text-xs text-gray-500 font-semibold">{formatarValor(totalDoAno)}</span>
                      </div>
                      {itens.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 min-h-[48px]">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0
                            ${c.forma_pagamento === 'pix' ? 'bg-pix-light' : 'bg-pago-light'}`}>
                            {c.forma_pagamento === 'pix' ? '📱' : '💵'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-manto">
                              {MESES_COMPLETOS[c.mes_referencia - 1]}
                            </p>
                            <p className="text-xs text-gray-400">
                              {c.data_registro ? new Date(c.data_registro).toLocaleDateString('pt-BR') : ''}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-pago">{formatarValor(c.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {historico.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📋</div>
                    <p className="text-sm">Nenhuma contribuição registrada ainda.</p>
                  </div>
                )}

                <button
                  onClick={limpar}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-white border-[1.5px] border-dourado/40 hover:bg-white/5 transition-all"
                >
                  🔍 Consultar outro nome
                </button>
              </>
            )}
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-dourado/60 text-xs pb-4">
          Dízimo NS Aparecida · Paróquia São Tiago Maior<br />
          Apenas consulta — sem edição de dados
        </p>
      </div>
    </div>
  )
}
