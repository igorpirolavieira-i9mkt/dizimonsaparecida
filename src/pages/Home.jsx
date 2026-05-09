// src/pages/Home.jsx
// Tela principal — busca + lançamento de contribuição
// UX Otimizado: modo rápido, toast com contagem regressiva, contador de sessão, busca sem acento, grade clicável

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const ANO_ATUAL = new Date().getFullYear()

// Remove acentos para busca insensível — "Jose" encontra "José"
function removerAcentos(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Home() {
  const navigate = useNavigate()

  // Busca
  const [busca, setBusca] = useState('')
  const [dizimistas, setDizimistas] = useState([])
  const [carregandoBusca, setCarregandoBusca] = useState(false)
  const [dizimistaSelecionado, setDizimistaSelecionado] = useState(null)
  const [contribuicoesDoAno, setContribuicoesDoAno] = useState({})

  // Formulário
  const [formulario, setFormulario] = useState({
    valor: '',
    forma_pagamento: 'dinheiro',
    mes_referencia: new Date().getMonth() + 1,
    ano_referencia: ANO_ATUAL,
    observacao: '',
  })
  const [comprovante, setComprovante] = useState(null)
  const [maisOpcoes, setMaisOpcoes] = useState(false) // mês, ano, observação ficam ocultos por padrão

  // Salvamento
  const [salvando, setSalvando] = useState(false)

  // Toast com contagem regressiva (3 → 2 → 1 → reset automático)
  const [toastContagem, setToastContagem] = useState(null)
  const toastTimerRef = useRef(null)

  // Contador de sessão — calculado localmente, sem query extra
  const [sessaoTotal, setSessaoTotal] = useState(0)
  const [sessaoQtd, setSessaoQtd] = useState(0)

  const inputBuscaRef = useRef(null)
  const formRef = useRef(null)

  // Foca busca ao abrir
  useEffect(() => { inputBuscaRef.current?.focus() }, [])

  // Limpa timer ao desmontar
  useEffect(() => () => clearInterval(toastTimerRef.current), [])

  // Debounce de busca
  useEffect(() => {
    const texto = busca.trim()
    if (texto.length < 2) { setDizimistas([]); return }
    const timer = setTimeout(() => buscarDizimistas(texto), 300)
    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => {
    if (dizimistaSelecionado)
      carregarContribuicoesDoAno(dizimistaSelecionado.id, formulario.ano_referencia)
  }, [dizimistaSelecionado, formulario.ano_referencia])

  // Duas queries paralelas (com e sem acento), deduplicadas por ID
  async function buscarDizimistas(texto) {
    setCarregandoBusca(true)
    try {
      const semAcento = removerAcentos(texto)
      const [r1, r2] = await Promise.all([
        supabase.from('dizimistas').select('id, nome, data_nascimento')
          .eq('ativo', true).ilike('nome', `%${texto}%`).order('nome').limit(10),
        supabase.from('dizimistas').select('id, nome, data_nascimento')
          .eq('ativo', true).ilike('nome', `%${semAcento}%`).order('nome').limit(10),
      ])
      const todos = [...(r1.data || []), ...(r2.data || [])]
      const vistos = new Set()
      const dedup = todos
        .filter(d => { if (vistos.has(d.id)) return false; vistos.add(d.id); return true })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setDizimistas(dedup)
    } catch (err) { console.error(err) }
    finally { setCarregandoBusca(false) }
  }

  async function carregarContribuicoesDoAno(dizimista_id, ano) {
    try {
      const { data, error } = await supabase
        .from('contribuicoes').select('mes_referencia, valor')
        .eq('dizimista_id', dizimista_id).eq('ano_referencia', ano)
      if (error) throw error
      const porMes = {}
      for (const c of data || [])
        porMes[c.mes_referencia] = (porMes[c.mes_referencia] || 0) + Number(c.valor)
      setContribuicoesDoAno(porMes)
    } catch (err) { console.error(err) }
  }

  function selecionarDizimista(d) {
    clearInterval(toastTimerRef.current)
    setToastContagem(null)
    setDizimistaSelecionado(d)
    setBusca(d.nome)
    setDizimistas([])
    setMaisOpcoes(false)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function limparSelecao() {
    clearInterval(toastTimerRef.current)
    setToastContagem(null)
    setDizimistaSelecionado(null)
    setBusca('')
    setDizimistas([])
    setContribuicoesDoAno({})
    setComprovante(null)
    setMaisOpcoes(false)
    setFormulario({
      valor: '', forma_pagamento: 'dinheiro',
      mes_referencia: new Date().getMonth() + 1,
      ano_referencia: ANO_ATUAL, observacao: '',
    })
    setTimeout(() => inputBuscaRef.current?.focus(), 50)
  }

  // Inicia contagem regressiva e atualiza contador de sessão
  function iniciarToastReset(valorLancado) {
    setSessaoTotal(t => t + valorLancado)
    setSessaoQtd(q => q + 1)
    setToastContagem(3)
    let c = 3
    toastTimerRef.current = setInterval(() => {
      c--
      if (c <= 0) {
        clearInterval(toastTimerRef.current)
        setToastContagem(null)
        limparSelecao()
      } else {
        setToastContagem(c)
      }
    }, 1000)
  }

  function formatarAniversario(data) {
    if (!data) return null
    const [, mes, dia] = data.split('-')
    return `${dia}/${mes}`
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dizimistaSelecionado || toastContagem !== null) return
    const valorNum = parseFloat(String(formulario.valor).replace(',', '.'))
    if (!valorNum || valorNum <= 0) return
    if (formulario.forma_pagamento === 'pix' && !comprovante) return

    setSalvando(true)
    try {
      let comprovante_url = null
      if (comprovante) {
        const ext = comprovante.name.split('.').pop()
        const caminho = `${dizimistaSelecionado.id}/${formulario.ano_referencia}/${formulario.mes_referencia}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('comprovantes').upload(caminho, comprovante, { upsert: false })
        if (upErr) throw upErr
        comprovante_url = caminho
      }
      const { error } = await supabase.from('contribuicoes').insert({
        dizimista_id: dizimistaSelecionado.id,
        ano_referencia: formulario.ano_referencia,
        mes_referencia: formulario.mes_referencia,
        valor: valorNum,
        forma_pagamento: formulario.forma_pagamento,
        comprovante_url,
        observacao: formulario.observacao.trim() || null,
      })
      if (error) throw error
      carregarContribuicoesDoAno(dizimistaSelecionado.id, formulario.ano_referencia)
      iniciarToastReset(valorNum)
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-manto-50">

      {/* Header — contador de sessão aparece após 1º lançamento */}
      <header className="manto-header bg-manto text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <div>
          <h1 className="text-base font-bold leading-tight">🕊️ Dízimo NS Aparecida</h1>
          {sessaoQtd > 0 ? (
            <p className="text-dourado text-xs font-semibold">
              {formatarValor(sessaoTotal)} · {sessaoQtd} lançamento{sessaoQtd !== 1 ? 's' : ''} hoje
            </p>
          ) : (
            <p className="text-blue-300 text-xs">Lançamento de contribuições</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin')}
            className="text-dourado text-xs border border-dourado/50 rounded-lg px-3 py-1.5 hover:bg-dourado/10 font-semibold"
          >
            ⚙️ Admin
          </button>
          <button
            onClick={async () => { if (window.confirm('Deseja sair?')) await supabase.auth.signOut() }}
            className="text-blue-300 text-xs border border-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-manto-light"
          >
            🚪
          </button>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Busca */}
        <div className="relative">
          <label className="block text-xs font-bold text-dourado uppercase tracking-wider mb-1.5">
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
                  clearInterval(toastTimerRef.current)
                  setToastContagem(null)
                  setDizimistaSelecionado(null)
                  setContribuicoesDoAno({})
                }
              }}
              placeholder="Nome... (sem acento funciona)"
              className="w-full px-4 py-3 pr-10 text-base rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-dourado shadow-sm"
              autoComplete="off"
            />
            {busca ? (
              <button onClick={limparSelecao} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" type="button">✕</button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xl">🔍</span>
            )}
          </div>

          {/* Dropdown de resultados */}
          {dizimistas.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {carregandoBusca && <li className="px-4 py-2 text-sm text-gray-400">Buscando...</li>}
              {dizimistas.map(d => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selecionarDizimista(d)}
                    className="w-full text-left px-4 hover:bg-manto/5 transition-colors border-b border-gray-50 last:border-0 min-h-[52px] flex items-center gap-2"
                  >
                    <span className="font-semibold text-manto text-sm">{d.nome}</span>
                    {d.data_nascimento && (
                      <span className="text-gray-400 text-xs">🎂 {formatarAniversario(d.data_nascimento)}</span>
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

        {/* Card do dizimista */}
        {dizimistaSelecionado && (
          <div ref={formRef} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">

            {/* Header do card */}
            <div className="bg-manto text-white px-4 py-3 flex items-start justify-between border-b-[3px] border-dourado">
              <div>
                <p className="font-bold text-base leading-tight">{dizimistaSelecionado.nome}</p>
                {dizimistaSelecionado.data_nascimento && (
                  <p className="text-blue-300 text-xs mt-0.5">🎂 {formatarAniversario(dizimistaSelecionado.data_nascimento)}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}`)}
                className="text-dourado text-xs border border-dourado/50 rounded-lg px-2 py-1 ml-2 shrink-0 hover:bg-dourado/10"
                type="button"
              >
                Ver perfil
              </button>
            </div>

            {/* Grade de meses — clicável para selecionar o mês de referência */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">
                {formulario.ano_referencia} — toque para escolher o mês
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {MESES.map((mes, idx) => {
                  const numMes = idx + 1
                  const valor = contribuicoesDoAno[numMes]
                  const pago = valor !== undefined && valor > 0
                  const selecionado = numMes === formulario.mes_referencia
                  const atual = numMes === new Date().getMonth() + 1
                  return (
                    <button
                      key={mes}
                      type="button"
                      onClick={() => setFormulario(f => ({ ...f, mes_referencia: numMes }))}
                      className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border transition-all
                        ${pago
                          ? 'bg-pago text-white border-pago-border'
                          : selecionado
                          ? 'bg-manto text-white border-manto ring-2 ring-dourado ring-offset-1'
                          : atual
                          ? 'bg-manto/10 text-manto border-manto/30'
                          : 'bg-gray-50 text-gray-400 border-gray-200 active:bg-manto/10'
                        }`}
                    >
                      <div>{mes}</div>
                      {pago && (
                        <div className="text-[9px] font-normal opacity-90 mt-0.5">
                          {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Formulário — modo rápido */}
            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-3 space-y-3 border-t border-gray-100">
              <p className="text-xs font-bold text-dourado uppercase tracking-wider">
                Lançar · {MESES[formulario.mes_referencia - 1]}/{formulario.ano_referencia}
              </p>

              {/* Valor — campo grande, destaque visual */}
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="R$ 0,00"
                value={formulario.valor}
                onChange={e => setFormulario(f => ({ ...f, valor: e.target.value }))}
                className="w-full px-4 py-4 text-2xl font-bold rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50"
                required
                autoFocus
              />

              {/* Forma de pagamento */}
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => setFormulario(f => ({ ...f, forma_pagamento: 'dinheiro' }))}
                  className={`py-4 rounded-xl font-bold text-sm border-2 transition-all
                    ${formulario.forma_pagamento === 'dinheiro' ? 'bg-pago text-white border-pago shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>
                  💵 Dinheiro
                </button>
                <button type="button"
                  onClick={() => setFormulario(f => ({ ...f, forma_pagamento: 'pix' }))}
                  className={`py-4 rounded-xl font-bold text-sm border-2 transition-all
                    ${formulario.forma_pagamento === 'pix' ? 'bg-pix text-white border-pix shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>
                  📱 PIX
                </button>
              </div>

              {/* Comprovante PIX */}
              {formulario.forma_pagamento === 'pix' && (
                <div>
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer
                    ${comprovante ? 'border-pago bg-pago-light' : 'border-dashed border-pix bg-pix-light'}`}>
                    <span className="text-2xl">{comprovante ? '✅' : '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-manto truncate">
                        {comprovante ? comprovante.name : 'Anexar comprovante PIX *'}
                      </p>
                      {comprovante && <p className="text-xs text-gray-400">{(comprovante.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={e => setComprovante(e.target.files[0] || null)} />
                  </label>
                  {comprovante && (
                    <button type="button" onClick={() => setComprovante(null)} className="mt-1 text-xs text-ausente">
                      ✕ Remover
                    </button>
                  )}
                </div>
              )}

              {/* Mais opções ▸ — mês, ano e observação ficam ocultos por padrão */}
              <button
                type="button"
                onClick={() => setMaisOpcoes(o => !o)}
                className="flex items-center gap-1.5 text-xs text-manto/60 font-semibold hover:text-manto transition-colors py-1"
              >
                <span className={`transition-transform duration-200 inline-block ${maisOpcoes ? 'rotate-90' : ''}`}>▸</span>
                Mais opções
                {!maisOpcoes && <span className="text-gray-400 font-normal">— mês, ano, observação</span>}
              </button>

              {maisOpcoes && (
                <div className="space-y-3 pl-4 border-l-2 border-dourado/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Mês ref.</label>
                      <select
                        value={formulario.mes_referencia}
                        onChange={e => setFormulario(f => ({ ...f, mes_referencia: Number(e.target.value) }))}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm font-semibold"
                      >
                        {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
                      <select
                        value={formulario.ano_referencia}
                        onChange={e => setFormulario(f => ({ ...f, ano_referencia: Number(e.target.value) }))}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm font-semibold"
                      >
                        {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Observação (opcional)"
                    value={formulario.observacao}
                    onChange={e => setFormulario(f => ({ ...f, observacao: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm"
                  />
                </div>
              )}

              {/* Toast com contagem regressiva */}
              {toastContagem !== null && (
                <div className="bg-pago-light border border-pago-border rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-pago font-bold text-sm">✅ Lançado! Próximo em...</span>
                  <span className="bg-pago text-white font-bold text-lg w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                    {toastContagem}
                  </span>
                </div>
              )}

              {/* Botão lançar */}
              <button
                type="submit"
                disabled={salvando || toastContagem !== null}
                className={`w-full py-4 rounded-xl font-bold text-base text-white shadow-md transition-all active:scale-95
                  ${salvando || toastContagem !== null ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark'}`}
              >
                {salvando ? '⏳ Salvando...' : '💾 Lançar Dízimo'}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}?acao=multiplos`)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-dourado border-2 border-dourado/40 hover:bg-dourado/10 transition-all"
              >
                📅 Lançar múltiplos meses
              </button>
            </form>
          </div>
        )}

        {!dizimistaSelecionado && busca.length < 2 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🙏</div>
            <p className="text-sm font-semibold">Digite o nome do dizimista acima</p>
            <p className="text-xs mt-1">Busca a partir de 2 letras — sem acento funciona</p>
          </div>
        )}
      </div>
    </div>
  )
}
