// src/pages/Comprovantes.jsx
// Lista de comprovantes PIX — visualizar, baixar individual ou ZIP

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import JSZip from 'jszip'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MESES_COMPLETOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ANO_ATUAL = new Date().getFullYear()

export default function Comprovantes() {
  const navigate = useNavigate()

  const [ano, setAno] = useState(ANO_ATUAL)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [carregando, setCarregando] = useState(false)
  const [comprovantes, setComprovantes] = useState([])
  const [buscou, setBuscou] = useState(false)
  const [baixandoZip, setBaixandoZip] = useState(false)

  // Visualizador de imagem
  const [imagemAberta, setImagemAberta] = useState(null) // { url, nome }

  useEffect(() => {
    buscar()
  }, [ano, mes])

  async function buscar() {
    setCarregando(true)
    setBuscou(false)
    try {
      // Busca contribuições PIX com comprovante no período
      const { data, error } = await supabase
        .from('contribuicoes')
        .select('id, valor, data_registro, comprovante_url, mes_referencia, ano_referencia, dizimistas(id, nome)')
        .eq('forma_pagamento', 'pix')
        .eq('ano_referencia', ano)
        .eq('mes_referencia', mes)
        .not('comprovante_url', 'is', null)
        .order('data_registro', { ascending: false })

      if (error) throw error
      setComprovantes(data || [])
    } catch (err) {
      console.error('Erro ao buscar:', err)
    } finally {
      setCarregando(false)
      setBuscou(true)
    }
  }

  // Gera URL pública assinada (60 min) para o arquivo privado
  async function gerarUrl(path) {
    const { data, error } = await supabase.storage
      .from('comprovantes')
      .createSignedUrl(path, 3600)
    if (error) throw error
    return data.signedUrl
  }

  async function abrirImagem(comprovante) {
    try {
      const url = await gerarUrl(comprovante.comprovante_url)
      setImagemAberta({
        url,
        nome: comprovante.dizimistas?.nome || '?',
        mes: MESES_COMPLETOS[(comprovante.mes_referencia || 1) - 1],
        ano: comprovante.ano_referencia,
        valor: Number(comprovante.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      })
    } catch (err) {
      console.error('Erro ao abrir imagem:', err)
      alert('Não foi possível carregar o comprovante.')
    }
  }

  async function baixarIndividual(comprovante) {
    try {
      const url = await gerarUrl(comprovante.comprovante_url)
      const ext = comprovante.comprovante_url.split('.').pop() || 'jpg'
      const nomeArq = `${comprovante.dizimistas?.nome || 'dizimista'}_${MESES[comprovante.mes_referencia - 1]}${comprovante.ano_referencia}.${ext}`
        .replace(/\s+/g, '_')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')

      const a = document.createElement('a')
      a.href = url
      a.download = nomeArq
      a.click()
    } catch (err) {
      console.error('Erro ao baixar:', err)
      alert('Não foi possível baixar o comprovante.')
    }
  }

  async function baixarZip() {
    if (comprovantes.length === 0) return
    setBaixandoZip(true)
    try {
      const zip = new JSZip()
      const pasta = `Comprovantes_${MESES[mes - 1]}${ano}`

      // Baixa todos os arquivos em paralelo
      await Promise.all(comprovantes.map(async (c, i) => {
        try {
          const url = await gerarUrl(c.comprovante_url)
          const resp = await fetch(url)
          const blob = await resp.blob()
          const ext = c.comprovante_url.split('.').pop() || 'jpg'
          const nome = `${String(i + 1).padStart(2, '0')}_${c.dizimistas?.nome || 'dizimista'}.${ext}`
            .replace(/\s+/g, '_')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
          zip.file(`${pasta}/${nome}`, blob)
        } catch {
          // Se um arquivo falhar, continua com os outros
        }
      }))

      const conteudo = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(conteudo)
      a.download = `${pasta}_NSAparecida.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err)
      alert('Erro ao gerar o arquivo ZIP.')
    } finally {
      setBaixandoZip(false)
    }
  }

  function formatarData(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  function formatarValor(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const totalPix = comprovantes.reduce((s, c) => s + Number(c.valor), 0)

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <h1 className="text-base font-bold">📁 Comprovantes PIX</h1>
        <p className="text-blue-200 text-xs">Visualizar e baixar comprovantes por mês</p>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Filtro mês/ano */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 px-4 py-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Período</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Mês de referência</label>
              <select
                value={mes}
                onChange={e => setMes(Number(e.target.value))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50 text-sm font-semibold"
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Ano</label>
              <select
                value={ano}
                onChange={e => setAno(Number(e.target.value))}
                className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-500 bg-gray-50 text-sm font-semibold"
              >
                {[ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Totais e botão ZIP */}
        {buscou && comprovantes.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-100 px-4 py-3">
              <p className="text-xs text-gray-400 font-semibold">
                {comprovantes.length} comprovante{comprovantes.length !== 1 ? 's' : ''}
              </p>
              <p className="text-base font-bold text-blue-900 mt-0.5">{formatarValor(totalPix)}</p>
            </div>
            <button
              onClick={baixarZip}
              disabled={baixandoZip}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all shrink-0
                ${baixandoZip ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 active:scale-95'}`}
            >
              <span className="text-xl">{baixandoZip ? '⏳' : '📦'}</span>
              <span className="text-xs">{baixandoZip ? 'Gerando...' : 'Baixar ZIP'}</span>
            </button>
          </div>
        )}

        {/* Lista de comprovantes */}
        {carregando ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2 animate-pulse">📁</div>
            <p className="text-sm">Carregando comprovantes...</p>
          </div>
        ) : buscou && comprovantes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm font-semibold">Nenhum comprovante em {MESES_COMPLETOS[mes - 1]}/{ano}</p>
            <p className="text-xs mt-1">Comprovantes são salvos ao lançar um PIX.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comprovantes.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-xl shadow-sm border border-blue-100 px-4 py-3 flex items-center gap-3"
              >
                {/* Miniatura clicável */}
                <button
                  onClick={() => abrirImagem(c)}
                  className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shrink-0 hover:bg-blue-100 transition-colors overflow-hidden"
                >
                  🧾
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/dizimista/${c.dizimistas?.id}`)}
                    className="font-semibold text-blue-900 text-sm truncate block text-left hover:underline"
                  >
                    {c.dizimistas?.nome || '?'}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ref: {MESES_COMPLETOS[(c.mes_referencia || 1) - 1]}/{c.ano_referencia}
                    {' · '}{formatarData(c.data_registro)}
                  </p>
                  <p className="text-sm font-bold text-green-700 mt-0.5">{formatarValor(c.valor)}</p>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => abrirImagem(c)}
                    className="text-blue-600 text-xs border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50"
                  >
                    👁️ Ver
                  </button>
                  <button
                    onClick={() => baixarIndividual(c)}
                    className="text-gray-500 text-xs border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                  >
                    ⬇️ Baixar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal visualizador de imagem */}
      {imagemAberta && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col"
          onClick={() => setImagemAberta(null)}
        >
          {/* Header do modal */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-black/50 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <p className="font-bold text-sm">{imagemAberta.nome}</p>
              <p className="text-xs text-gray-300">
                {imagemAberta.mes}/{imagemAberta.ano} · {imagemAberta.valor}
              </p>
            </div>
            <button
              onClick={() => setImagemAberta(null)}
              className="text-white text-2xl leading-none hover:text-gray-300 ml-4"
            >
              ✕
            </button>
          </div>

          {/* Imagem */}
          <div
            className="flex-1 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={imagemAberta.url}
              alt="Comprovante PIX"
              className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            />
          </div>

          {/* Rodapé */}
          <div
            className="px-4 py-3 bg-black/50 text-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs text-gray-400">Toque fora da imagem para fechar</p>
          </div>
        </div>
      )}
    </div>
  )
}
