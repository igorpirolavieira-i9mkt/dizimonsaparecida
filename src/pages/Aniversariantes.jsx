// src/pages/Aniversariantes.jsx
// Tela que lista os dizimistas aniversariantes do mês atual
// Dados vêm da tabela `dizimistas` — campo data_nascimento
// Ano 1900 é placeholder — exibimos apenas DD/MM

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

// Nomes dos meses em português para exibição no seletor
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function Aniversariantes() {
  // Mês selecionado (1–12). Começa no mês atual.
  const hoje = new Date()
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1)

  const [aniversariantes, setAniversariantes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // Busca no Supabase todos os dizimistas ativos com
  // data_nascimento cujo MÊS bate com o mês selecionado
  async function buscarAniversariantes(mes) {
    setCarregando(true)
    setErro(null)

    try {
      // Buscamos todos os ativos e filtramos no client — conjunto pequeno (~63 pessoas)
      const { data, error } = await supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento, telefone')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null)
        .order('data_nascimento')

      if (error) throw error

      // Filtra pelo mês no client
      // data_nascimento vem no formato "1900-09-17" → mês = 9
      const filtrados = (data || []).filter(d => {
        const partes = d.data_nascimento.split('-')
        const mes_nasc = parseInt(partes[1], 10)
        return mes_nasc === mes
      })

      // Ordena por dia do mês
      filtrados.sort((a, b) => {
        const diaA = parseInt(a.data_nascimento.split('-')[2], 10)
        const diaB = parseInt(b.data_nascimento.split('-')[2], 10)
        return diaA - diaB
      })

      setAniversariantes(filtrados)
    } catch (e) {
      console.error('Erro ao buscar aniversariantes:', e)
      setErro('Não foi possível carregar os aniversariantes.')
    } finally {
      setCarregando(false)
    }
  }

  // Recarrega sempre que o mês selecionado muda
  useEffect(() => {
    buscarAniversariantes(mesSelecionado)
  }, [mesSelecionado])

  // Formata data_nascimento para DD/MM (ignora o ano 1900)
  function formatarDiaMes(data_nascimento) {
    if (!data_nascimento) return '—'
    const partes = data_nascimento.split('-')
    return `${partes[2]}/${partes[1]}`
  }

  // Extrai apenas o dia do mês
  function diaDoMes(data_nascimento) {
    if (!data_nascimento) return null
    return parseInt(data_nascimento.split('-')[2], 10)
  }

  // Verifica se o aniversário é hoje (mesmo dia e mês)
  function isHoje(data_nascimento) {
    if (!data_nascimento) return false
    const partes = data_nascimento.split('-')
    const mes_nasc = parseInt(partes[1], 10)
    const dia_nasc = parseInt(partes[2], 10)
    return mes_nasc === hoje.getMonth() + 1 && dia_nasc === hoje.getDate()
  }

  // Iniciais do nome para o avatar
  function iniciais(nome) {
    const partes = nome.trim().split(' ')
    if (partes.length === 1) return partes[0][0].toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  }

  // Cores do avatar — alterna pelo índice
  const cores = [
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-green-100 text-green-800',
    'bg-amber-100 text-amber-800',
    'bg-pink-100 text-pink-800',
    'bg-teal-100 text-teal-800',
  ]

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Cabeçalho */}
      <header className="manto-header bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <h1 className="text-base font-bold">🎂 Aniversariantes</h1>
        <p className="text-blue-200 text-xs">Comunidade Nossa Senhora Aparecida</p>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Seletor de mês — carrossel horizontal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
          <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">
            Selecionar mês
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {MESES.map((nome, idx) => {
              const numMes = idx + 1
              const ativo = numMes === mesSelecionado
              const ehMesAtual = numMes === hoje.getMonth() + 1
              return (
                <button
                  key={numMes}
                  onClick={() => setMesSelecionado(numMes)}
                  className={`
                    flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                    ${ativo
                      ? 'bg-manto text-white shadow-sm'
                      : ehMesAtual
                        ? 'bg-white text-manto border-2 border-dourado/50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {nome.substring(0, 3)}
                  {ehMesAtual && (
                    <span className={`block text-xs leading-tight ${ativo ? 'opacity-70' : 'text-dourado'}`}>
                      atual
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Título do mês + contador */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-manto uppercase tracking-wider">
            {MESES[mesSelecionado - 1]}
          </h2>
          {!carregando && (
            <span className="text-xs text-gray-500 bg-white rounded-full px-3 py-1 border border-gray-100 shadow-sm">
              {aniversariantes.length} pessoa{aniversariantes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Estado: carregando */}
        {carregando && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-manto border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-3 text-sm">Carregando...</p>
          </div>
        )}

        {/* Estado: erro */}
        {erro && (
          <div className="bg-ausente-light border border-ausente-border rounded-xl px-4 py-3 text-ausente text-sm">
            {erro}
          </div>
        )}

        {/* Estado: sem aniversariantes */}
        {!carregando && !erro && aniversariantes.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-10 text-center">
            <p className="text-4xl mb-3">🎈</p>
            <p className="text-gray-600 font-semibold text-sm">
              Nenhum aniversariante em {MESES[mesSelecionado - 1]}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Só aparecem dizimistas com data de nascimento cadastrada.
            </p>
          </div>
        )}

        {/* Lista de aniversariantes */}
        {!carregando && !erro && aniversariantes.length > 0 && (
          <div className="space-y-2">
            {aniversariantes.map((d, idx) => {
              const hoje_flag = isHoje(d.data_nascimento)
              const dia = diaDoMes(d.data_nascimento)
              const corAvatar = cores[idx % cores.length]

              return (
                <Link
                  key={d.id}
                  to={`/dizimista/${d.id}`}
                  className={`
                    block rounded-2xl border transition-all overflow-hidden
                    ${hoje_flag
                      ? 'border-dourado bg-dourado/5 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-manto/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 px-4 py-3 min-h-[64px]">
                    {/* Dia do mês em destaque */}
                    <div className={`
                      w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0
                      ${hoje_flag ? 'bg-dourado text-white' : 'bg-manto/5 text-manto'}
                    `}>
                      <span className="text-lg font-bold leading-none">{dia}</span>
                      <span className="text-[10px] opacity-70 leading-none mt-0.5">
                        {MESES[mesSelecionado - 1].substring(0, 3).toLowerCase()}
                      </span>
                    </div>

                    {/* Avatar com iniciais */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-bold flex-shrink-0 ${corAvatar}
                    `}>
                      {iniciais(d.nome)}
                    </div>

                    {/* Nome e detalhes */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${hoje_flag ? 'text-manto' : 'text-manto'}`}>
                        {d.nome}
                        {hoje_flag && (
                          <span className="ml-2 text-xs bg-dourado text-white px-2 py-0.5 rounded-full font-medium">
                            Hoje! 🎉
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatarDiaMes(d.data_nascimento)}
                        {d.telefone && (
                          <span className="ml-2">· {d.telefone}</span>
                        )}
                      </p>
                    </div>

                    {/* Seta */}
                    <span className="text-manto/30 text-lg flex-shrink-0">›</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Aviso sobre dados incompletos */}
        {!carregando && (
          <p className="text-xs text-gray-400 text-center pb-2">
            Só aparecem dizimistas com data de nascimento cadastrada.
            <br />
            Atualize os dados em Admin → Dizimistas.
          </p>
        )}

      </div>
    </div>
  )
}
