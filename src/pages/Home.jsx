// src/pages/Home.jsx
// Tela principal — busca de dizimistas + lançamento de contribuição

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function Home() {
  const navigate = useNavigate()

  const [busca, setBusca] = useState('')
  const [dizimistas, setDizimistas] = useState([])
  const [carregandoBusca, setCarregandoBusca] = useState(false)
  const [dizimistaSelecionado, setDizimistaSelecionado] = useState(null)
  const [contribuicoesDoAno, setContribuicoesDoAno] = useState([])
  const [formulario, setFormulario] = useState({
    valor: '',
    forma_pagamento: 'dinheiro',
    mes_referencia: new Date().getMonth() + 1,
    ano_referencia: new Date().getFullYear(),
    observacao: '',
  })
  const [comprovante, setComprovante] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  const inputBuscaRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => { inputBuscaRef.current?.focus() }, [])

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

  async function buscarDizimistas(texto) {
    setCarregandoBusca(true)
    try {
      const { data, error } = await supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento, telefone')
        .eq('ativo', true)
        .ilike('nome', `%${texto}%`)
        .order('nome')
        .limit(10)
      if (error) throw error
      setDizimistas(data || [])
    } catch (err) { console.error(err) }
    finally { setCarregandoBusca(false) }
  }

  async function carregarContribuicoesDoAno(dizimista_id, ano) {
    try {
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('mes_referencia, valor')
        .eq('dizimista_id', dizimista_id)
        .eq('ano_referencia', ano)
      if (error) throw error
      const porMes = {}
      for (const c of data || []) {
        porMes[c.mes_referencia] = (porMes[c.mes_referencia] || 0) + Number(c.valor)
      }
      setContribuicoesDoAno(porMes)
    } catch (err) { console.error(err) }
  }

  function selecionarDizimista(d) {
    setDizimistaSelecionado(d)
    setBusca(d.nome)
    setDizimistas([])
    setMensagem(null)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function limparSelecao() {
    setDizimistaSelecionado(null)
    setBusca('')
    setDizimistas([])
    setContribuicoesDoAno([])
    setComprovante(null)
    setMensagem(null)
    setFormulario({ valor: '', forma_pagamento: 'dinheiro', mes_referencia: new Date().getMonth() + 1, ano_referencia: new Date().getFullYear(), observacao: '' })
    setTimeout(() => inputBuscaRef.current?.focus(), 100)
  }

  function formatarAniversario(data_nascimento) {
    if (!data_nascimento) return null
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
    const valorNum = parseFloat(formulario.valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setMensagem({ tipo: 'erro', texto: 'Informe um valor válido.' }); return }
    if (formulario.forma_pagamento === 'pix' && !comprovante) { setMensagem({ tipo: 'erro', texto: 'Comprovante obrigatório para PIX.' }); return }

    setSalvando(true)
    setMensagem(null)
    try {
      let comprovante_url = null
      if (comprovante) {
        const extensao = comprovante.name.split('.').pop()
        const caminho = `${dizimistaSelecionado.id}/${formulario.ano_referencia}/${formulario.mes_referencia}/${Date.now()}.${extensao}`
        const { error: uploadError } = await supabase.storage.from('comprovantes').upload(caminho, comprovante, { upsert: false })
        if (uploadError) throw uploadError
        comprovante_url = caminho
      }
      const { error: insertError } = await supabase.from('contribuicoes').insert({
        dizimista_id: dizimistaSelecionado.id,
        ano_referencia: formulario.ano_referencia,
        mes_referencia: formulario.mes_referencia,
        valor: valorNum,
        forma_pagamento: formulario.forma_pagamento,
        comprovante_url,
        observacao: formulario.observacao || null,
      })
      if (insertError) throw insertError
      setMensagem({ tipo: 'sucesso', texto: `${formatarValor(valorNum)} lançado para ${MESES[formulario.mes_referencia - 1]}/${formulario.ano_referencia}!` })
      carregarContribuicoesDoAno(dizimistaSelecionado.id, formulario.ano_referencia)
      setFormulario(f => ({ ...f, valor: '', observacao: '' }))
      setComprovante(null)
    } catch (err) {
      console.error(err)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally { setSalvando(false) }
  }

  return (
    <div className="min-h-screen bg-manto-50">

      {/* Header com faixa dourada */}
      <header className="bg-manto text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <div>
          <h1 className="text-base font-bold leading-tight">🕊️ Dízimo NS Aparecida</h1>
          <p className="text-blue-300 text-xs">Lançamento de contribuições</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin')}
            className="text-dourado text-xs border border-dourado/50 rounded-lg px-3 py-1.5 hover:bg-dourado/10 transition-colors font-semibold"
          >
            ⚙️ Admin
          </button>
          <button
            onClick={async () => { if (window.confirm('Deseja sair?')) await supabase.auth.signOut() }}
            className="text-blue-300 text-xs border border-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-manto-light transition-colors"
          >
            🚪
          </button>
        </div>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Campo de busca */}
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
                if (dizimistaSelecionado) { setDizimistaSelecionado(null); setContribuicoesDoAno([]) }
              }}
              placeholder="Digite o nome..."
              className="w-full px-4 py-3 pr-10 text-base rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-dourado shadow-sm transition-colors"
              autoComplete="off"
            />
            {busca ? (
              <button onClick={limparSelecao} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl" type="button">✕</button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-xl">🔍</span>
            )}
          </div>

          {dizimistas.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {carregandoBusca && <li className="px-4 py-2 text-sm text-gray-400">Buscando...</li>}
              {dizimistas.map(d => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selecionarDizimista(d)}
                    className="w-full text-left px-4 py-3 hover:bg-manto-50 active:bg-manto-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <span className="font-semibold text-manto text-sm">{d.nome}</span>
                    {d.data_nascimento && <span className="text-gray-400 text-xs ml-2">🎂 {formatarAniversario(d.data_nascimento)}</span>}
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
          <div ref={formRef} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">

            {/* Header do card com faixa dourada */}
            <div className="bg-manto text-white px-4 py-3 flex items-start justify-between border-b-[3px] border-dourado">
              <div>
                <p className="font-bold text-base leading-tight">{dizimistaSelecionado.nome}</p>
                {dizimistaSelecionado.data_nascimento && (
                  <p className="text-blue-300 text-xs mt-0.5">🎂 {formatarAniversario(dizimistaSelecionado.data_nascimento)}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}`)}
                className="text-dourado text-xs border border-dourado/50 rounded-lg px-2 py-1 ml-2 shrink-0 hover:bg-dourado/10 transition-colors"
                type="button"
              >
                Ver perfil
              </button>
            </div>

            {/* Grid de meses */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">
                Situação {formulario.ano_referencia}
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {MESES.map((mes, idx) => {
                  const numMes = idx + 1
                  const valor = contribuicoesDoAno[numMes]
                  const temContribuicao = valor !== undefined && valor > 0
                  const ehMesAtual = numMes === new Date().getMonth() + 1
                  return (
                    <div key={mes} className={`rounded-lg px-1 py-1.5 text-center text-xs font-semibold border transition-all
                      ${temContribuicao ? 'bg-pago text-white border-pago-border'
                        : ehMesAtual ? 'bg-manto-50 text-manto border-manto ring-1 ring-manto'
                        : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
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

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-bold text-dourado uppercase tracking-wider">Novo lançamento</p>

              {/* Valor */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$)</label>
                <input
                  type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0,00"
                  value={formulario.valor}
                  onChange={e => setFormulario(f => ({ ...f, valor: e.target.value }))}
                  className="w-full px-4 py-3 text-lg font-bold rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 transition-colors"
                  required
                />
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormulario(f => ({ ...f, forma_pagamento: 'dinheiro' }))}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2
                      ${formulario.forma_pagamento === 'dinheiro' ? 'bg-pago text-white border-pago shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>
                    💵 Dinheiro
                  </button>
                  <button type="button" onClick={() => setFormulario(f => ({ ...f, forma_pagamento: 'pix' }))}
                    className={`py-3 rounded-xl font-bold text-sm transition-all border-2
                      ${formulario.forma_pagamento === 'pix' ? 'bg-pix text-white border-pix shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>
                    📱 PIX
                  </button>
                </div>
              </div>

              {/* Upload PIX */}
              {formulario.forma_pagamento === 'pix' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Comprovante PIX <span className="text-ausente">*</span></label>
                  <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all
                    ${comprovante ? 'border-pago bg-pago-light' : 'border-dashed border-pix bg-pix-light hover:bg-pix/10'}`}>
                    <span className="text-2xl">{comprovante ? '✅' : '📎'}</span>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-manto">{comprovante ? comprovante.name : 'Toque para anexar'}</p>
                      {comprovante && <p className="text-xs text-gray-400">{(comprovante.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setComprovante(e.target.files[0] || null)} />
                  </label>
                  {comprovante && <button type="button" onClick={() => setComprovante(null)} className="mt-1 text-xs text-ausente hover:text-ausente-dark">Remover</button>}
                </div>
              )}

              {/* Mês e Ano */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Mês de referência</label>
                  <select value={formulario.mes_referencia} onChange={e => setFormulario(f => ({ ...f, mes_referencia: Number(e.target.value) }))}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm font-semibold">
                    {MESES.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
                  <select value={formulario.ano_referencia} onChange={e => setFormulario(f => ({ ...f, ano_referencia: Number(e.target.value) }))}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm font-semibold">
                    {[2023, 2024, 2025, 2026].map(ano => <option key={ano} value={ano}>{ano}</option>)}
                  </select>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Observação (opcional)</label>
                <input type="text" placeholder="Ex: retroativo março" value={formulario.observacao}
                  onChange={e => setFormulario(f => ({ ...f, observacao: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-dourado bg-gray-50 text-sm transition-colors" />
              </div>

              {/* Feedback */}
              {mensagem && (
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2
                  ${mensagem.tipo === 'sucesso' ? 'bg-pago-light text-pago border border-pago-border' : 'bg-ausente-light text-ausente border border-ausente-border'}`}>
                  {mensagem.tipo === 'sucesso' ? '✅' : '❌'} {mensagem.texto}
                </div>
              )}

              {/* Botão salvar */}
              <button type="submit" disabled={salvando}
                className={`w-full py-4 rounded-xl font-bold text-base text-white shadow-md transition-all
                  ${salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark active:scale-95'}`}>
                {salvando ? '⏳ Salvando...' : '💾 Lançar Dízimo'}
              </button>

              {/* Múltiplos meses */}
              <button type="button" onClick={() => navigate(`/dizimista/${dizimistaSelecionado.id}?acao=multiplos`)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-dourado border-2 border-dourado/40 hover:bg-dourado/10 active:bg-dourado/20 transition-all">
                📅 Lançar múltiplos meses
              </button>
            </form>
          </div>
        )}

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
