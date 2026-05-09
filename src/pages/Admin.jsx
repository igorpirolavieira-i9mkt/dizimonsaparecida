// src/pages/Admin.jsx
// Painel de administração — CRUD de dizimistas, importação em lote, exportação Excel

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

// Abas do painel
const ABAS = [
  { id: 'dizimistas', label: '👥 Dizimistas' },
  { id: 'importar',   label: '📥 Importar' },
  { id: 'exportar',   label: '📤 Exportar' },
]

// Formulário vazio para novo dizimista
const FORM_VAZIO = {
  nome: '',
  data_nascimento: '',
  telefone: '',
  email: '',
  ativo: true,
}

export default function Admin() {
  const [aba, setAba] = useState('dizimistas')

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">⚙️ Administração</h1>
          <p className="text-blue-200 text-xs">Gerenciar dizimistas</p>
        </div>
        <button
          onClick={async () => {
            if (window.confirm('Deseja sair do sistema?')) {
              await supabase.auth.signOut()
            }
          }}
          className="text-blue-200 text-xs border border-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 active:bg-blue-900 transition-colors"
        >
          Sair 🚪
        </button>
      </header>

      {/* Abas */}
      <div className="flex border-b border-manto/20 bg-white">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2
              ${aba === a.id
                ? 'text-manto border-dourado bg-dourado/5'
                : 'text-gray-400 border-transparent hover:text-manto/70'
              }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="max-w-lg mx-auto">
        {aba === 'dizimistas' && <AbaDizimistas />}
        {aba === 'importar'   && <AbaImportar />}
        {aba === 'exportar'   && <AbaExportar />}
      </div>
    </div>
  )
}

// ===========================================================
// ABA: DIZIMISTAS — listagem + CRUD
// ===========================================================
function AbaDizimistas() {
  const [dizimistas, setDizimistas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('ativos') // 'ativos' | 'inativos' | 'todos'
  const [modal, setModal] = useState(null) // null | { modo: 'criar'|'editar', dados: {} }
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    carregarDizimistas()
  }, [filtroAtivo])

  async function carregarDizimistas() {
    setCarregando(true)
    try {
      let query = supabase
        .from('dizimistas')
        .select('id, nome, data_nascimento, telefone, email, ativo, criado_em')
        .order('nome')

      if (filtroAtivo === 'ativos')   query = query.eq('ativo', true)
      if (filtroAtivo === 'inativos') query = query.eq('ativo', false)

      const { data, error } = await query
      if (error) throw error
      setDizimistas(data || [])
    } catch (err) {
      console.error('Erro ao carregar:', err)
    } finally {
      setCarregando(false)
    }
  }

  // Filtra pelo campo de busca local (sem nova query)
  const listaFiltrada = dizimistas.filter(d =>
    d.nome.toLowerCase().includes(busca.toLowerCase())
  )

  function formatarData(data) {
    if (!data) return '—'
    const [, mes, dia] = data.split('-')
    return `${dia}/${mes}`
  }

  function abrirCriar() {
    setModal({ modo: 'criar', dados: { ...FORM_VAZIO } })
    setMensagem(null)
  }

  function abrirEditar(d) {
    setModal({
      modo: 'editar',
      dados: {
        id: d.id,
        nome: d.nome || '',
        // Exibe a data no formato YYYY-MM-DD para o input date
        data_nascimento: d.data_nascimento || '',
        telefone: d.telefone || '',
        email: d.email || '',
        ativo: d.ativo,
      }
    })
    setMensagem(null)
  }

  async function salvar() {
    if (!modal.dados.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Nome é obrigatório.' })
      return
    }

    setSalvando(true)
    setMensagem(null)
    try {
      const payload = {
        nome: modal.dados.nome.trim(),
        data_nascimento: modal.dados.data_nascimento || null,
        telefone: modal.dados.telefone.trim() || null,
        email: modal.dados.email.trim() || null,
        ativo: modal.dados.ativo,
      }

      if (modal.modo === 'criar') {
        const { error } = await supabase.from('dizimistas').insert(payload)
        if (error) throw error
        setMensagem({ tipo: 'sucesso', texto: 'Dizimista cadastrado com sucesso!' })
      } else {
        const { error } = await supabase
          .from('dizimistas')
          .update({ ...payload, atualizado_em: new Date().toISOString() })
          .eq('id', modal.dados.id)
        if (error) throw error
        setMensagem({ tipo: 'sucesso', texto: 'Dados atualizados!' })
      }

      await carregarDizimistas()
      setTimeout(() => {
        setModal(null)
        setMensagem(null)
      }, 1500)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  async function alternarAtivo(d) {
    const novoStatus = !d.ativo
    const confirmMsg = novoStatus
      ? `Reativar ${d.nome}?`
      : `Desativar ${d.nome}? Ele não aparecerá mais nas buscas.`
    if (!window.confirm(confirmMsg)) return

    try {
      const { error } = await supabase
        .from('dizimistas')
        .update({ ativo: novoStatus, atualizado_em: new Date().toISOString() })
        .eq('id', d.id)
      if (error) throw error
      await carregarDizimistas()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Barra de ações */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Buscar nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-manto/20 bg-white text-sm focus:outline-none focus:border-manto"
        />
        <button
          onClick={abrirCriar}
          className="bg-manto text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-manto-dark active:scale-95 transition-all shrink-0"
        >
          + Novo
        </button>
      </div>

      {/* Filtro ativos/inativos */}
      <div className="flex gap-1">
        {[['ativos','Ativos'],['inativos','Inativos'],['todos','Todos']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFiltroAtivo(val)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${filtroAtivo === val
                ? 'bg-manto text-white'
                : 'bg-white text-gray-500 border border-gray-200'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          <p className="text-sm">Carregando...</p>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-sm">Nenhum dizimista encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
            {listaFiltrada.length} dizimista{listaFiltrada.length !== 1 ? 's' : ''}
          </p>
          {listaFiltrada.map(d => (
            <div key={d.id} className={`bg-white rounded-xl shadow-sm border px-4 py-3 flex items-center gap-3
              ${!d.ativo ? 'opacity-60 border-gray-200' : 'border-dourado/20'}`}>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-manto text-sm truncate">{d.nome}</p>
                <div className="flex gap-3 mt-0.5">
                  {d.data_nascimento && (
                    <span className="text-xs text-gray-400">🎂 {formatarData(d.data_nascimento)}</span>
                  )}
                  {d.telefone && (
                    <span className="text-xs text-gray-400">📱 {d.telefone}</span>
                  )}
                </div>
              </div>
              {/* Ações */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => abrirEditar(d)}
                  className="text-manto text-xs border border-manto/30 rounded-lg px-2 py-1 hover:bg-manto/5"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => alternarAtivo(d)}
                  className={`text-xs border rounded-lg px-2 py-1 transition-colors
                    ${d.ativo
                      ? 'text-ausente border-ausente-border hover:bg-ausente-light'
                      : 'text-pago border-pago-border hover:bg-pago-light'
                    }`}
                >
                  {d.ativo ? '🚫' : '✅'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-5 py-4 bg-manto text-white border-b-[3px] border-dourado">
              <h2 className="font-bold">
                {modal.modo === 'criar' ? '+ Novo Dizimista' : '✏️ Editar Dizimista'}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-blue-200 text-xl hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Formulário */}
            <div className="px-5 py-4 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">
                  Nome completo <span className="text-ausente">*</span>
                </label>
                <input
                  type="text"
                  value={modal.dados.nome}
                  onChange={e => setModal(m => ({ ...m, dados: { ...m.dados, nome: e.target.value } }))}
                  placeholder="Nome do dizimista"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm"
                  autoFocus
                />
              </div>

              {/* Data de nascimento */}
              <div>
                <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">
                  Data de nascimento <span className="text-gray-300 normal-case">(dia e mês)</span>
                </label>
                <input
                  type="date"
                  value={modal.dados.data_nascimento}
                  onChange={e => setModal(m => ({ ...m, dados: { ...m.dados, data_nascimento: e.target.value } }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Use o ano 1900 se quiser apenas o dia/mês.</p>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={modal.dados.telefone}
                  onChange={e => setModal(m => ({ ...m, dados: { ...m.dados, telefone: e.target.value } }))}
                  placeholder="(27) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">E-mail</label>
                <input
                  type="email"
                  value={modal.dados.email}
                  onChange={e => setModal(m => ({ ...m, dados: { ...m.dados, email: e.target.value } }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto text-sm"
                />
              </div>

              {/* Ativo (só na edição) */}
              {modal.modo === 'editar' && (
                <div className="flex items-center gap-3 bg-manto/5 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={modal.dados.ativo}
                    onChange={e => setModal(m => ({ ...m, dados: { ...m.dados, ativo: e.target.checked } }))}
                    className="w-5 h-5 rounded accent-manto"
                  />
                  <label htmlFor="ativo" className="text-sm font-semibold text-manto cursor-pointer">
                    Dizimista ativo (aparece nas buscas)
                  </label>
                </div>
              )}

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
                  onClick={() => setModal(null)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all
                    ${salvando ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark active:scale-95'}`}
                >
                  {salvando ? '⏳ Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===========================================================
// ABA: IMPORTAR — upload de planilha Excel com dizimistas
// ===========================================================
function AbaImportar() {
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState([]) // linhas lidas da planilha
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null) // { inseridos, erros }
  const inputRef = useRef(null)

  function lerArquivo(file) {
    setArquivo(file)
    setResultado(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const dados = XLSX.utils.sheet_to_json(ws, { defval: '' })
        setPreview(dados.slice(0, 5)) // mostra apenas as 5 primeiras linhas
      } catch (err) {
        console.error('Erro ao ler planilha:', err)
        setPreview([])
      }
    }
    reader.readAsBinaryString(file)
  }

  async function importar() {
    if (!arquivo) return
    setImportando(true)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const dados = XLSX.utils.sheet_to_json(ws, { defval: '' })

        let inseridos = 0
        let erros = 0

        // Processa em lotes de 20 para não sobrecarregar o banco
        for (let i = 0; i < dados.length; i += 20) {
          const lote = dados.slice(i, i + 20).map(row => ({
            // Aceita colunas: nome, data_nascimento, telefone, email
            nome: String(row['nome'] || row['Nome'] || row['NOME'] || '').trim(),
            data_nascimento: formatarDataImportacao(row['data_nascimento'] || row['Data Nascimento'] || row['nascimento'] || ''),
            telefone: String(row['telefone'] || row['Telefone'] || row['TELEFONE'] || '').trim() || null,
            email: String(row['email'] || row['Email'] || row['E-mail'] || '').trim().toLowerCase() || null,
            ativo: true,
          })).filter(r => r.nome.length > 0) // ignora linhas sem nome

          if (lote.length === 0) continue

          const { error } = await supabase.from('dizimistas').insert(lote)
          if (error) {
            console.error('Erro no lote:', error)
            erros += lote.length
          } else {
            inseridos += lote.length
          }
        }

        setResultado({ inseridos, erros })
        setArquivo(null)
        setPreview([])
        if (inputRef.current) inputRef.current.value = ''
      } catch (err) {
        console.error('Erro na importação:', err)
        setResultado({ inseridos: 0, erros: -1 })
      } finally {
        setImportando(false)
      }
    }
    reader.readAsBinaryString(arquivo)
  }

  function formatarDataImportacao(val) {
    if (!val) return null
    // Se já for string no formato YYYY-MM-DD
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    // Se for Date object (xlsx com cellDates: true)
    if (val instanceof Date && !isNaN(val)) {
      return val.toISOString().split('T')[0]
    }
    // Se for string DD/MM/YYYY
    if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/')
      return `${y}-${m}-${d}`
    }
    // Se for string DD/MM (sem ano — usa 1900 como placeholder)
    if (typeof val === 'string' && /^\d{2}\/\d{2}$/.test(val)) {
      const [d, m] = val.split('/')
      return `1900-${m}-${d}`
    }
    return null
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Instruções */}
      <div className="bg-manto/5 border border-manto/20 rounded-xl px-4 py-3">
        <p className="text-xs font-bold text-manto mb-2">📋 Formato esperado da planilha:</p>
        <div className="overflow-x-auto">
          <table className="text-xs text-manto/80 w-full">
            <thead>
              <tr className="font-bold border-b border-manto/20">
                <td className="py-1 pr-3">nome</td>
                <td className="py-1 pr-3">data_nascimento</td>
                <td className="py-1 pr-3">telefone</td>
                <td className="py-1">email</td>
              </tr>
            </thead>
            <tbody>
              <tr className="text-manto/60">
                <td className="py-1 pr-3">Maria Silva</td>
                <td className="py-1 pr-3">15/03 ou 15/03/1985</td>
                <td className="py-1 pr-3">(27) 99999-0000</td>
                <td className="py-1">maria@...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-manto/70 mt-2">Apenas a coluna <strong>nome</strong> é obrigatória.</p>
      </div>

      {/* Upload */}
      <div>
        <label className={`flex flex-col items-center gap-2 px-4 py-6 rounded-xl border-2 cursor-pointer transition-all
          ${arquivo
            ? 'border-pago-border bg-pago-light'
            : 'border-dashed border-manto/30 bg-white hover:bg-manto/5'
          }`}>
          <span className="text-3xl">{arquivo ? '📊' : '📥'}</span>
          <div className="text-center">
            <p className="text-sm font-semibold text-manto">
              {arquivo ? arquivo.name : 'Toque para selecionar a planilha'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">.xlsx ou .xls</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => e.target.files[0] && lerArquivo(e.target.files[0])}
          />
        </label>
      </div>

      {/* Preview das primeiras linhas */}
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">
            Prévia ({preview.length} de {preview.length} linhas mostradas)
          </p>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="text-xs w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {Object.keys(preview[0]).slice(0, 4).map(k => (
                    <td key={k} className="px-3 py-2 font-bold text-gray-500">{k}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    {Object.values(row).slice(0, 4).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-gray-600 max-w-[100px] truncate">
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado da importação */}
      {resultado && (
        <div className={`rounded-xl px-4 py-4 text-sm
          ${resultado.erros === -1
            ? 'bg-red-50 border border-red-200 text-red-700'
            : resultado.erros > 0
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
          {resultado.erros === -1 ? (
            <p className="font-bold">❌ Erro ao processar a planilha. Verifique o formato.</p>
          ) : (
            <>
              <p className="font-bold">✅ Importação concluída</p>
              <p className="mt-1">{resultado.inseridos} dizimista{resultado.inseridos !== 1 ? 's' : ''} cadastrado{resultado.inseridos !== 1 ? 's' : ''}</p>
              {resultado.erros > 0 && (
                <p className="mt-0.5">⚠️ {resultado.erros} registro{resultado.erros !== 1 ? 's' : ''} com erro (possivelmente duplicados)</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Botão importar */}
      {arquivo && !resultado && (
        <button
          onClick={importar}
          disabled={importando}
          className={`w-full py-4 rounded-xl font-bold text-white text-base shadow-md transition-all
            ${importando ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark active:scale-95'}`}
        >
          {importando ? '⏳ Importando...' : '📥 Importar Dizimistas'}
        </button>
      )}
    </div>
  )
}

// ===========================================================
// ABA: EXPORTAR — download de planilha Excel
// ===========================================================
function AbaExportar() {
  const [exportando, setExportando] = useState(false)
  const [tipo, setTipo] = useState('dizimistas') // 'dizimistas' | 'contribuicoes'
  const [ano, setAno] = useState(new Date().getFullYear())

  async function exportar() {
    setExportando(true)
    try {
      if (tipo === 'dizimistas') {
        await exportarDizimistas()
      } else {
        await exportarContribuicoes(ano)
      }
    } catch (err) {
      console.error('Erro ao exportar:', err)
      alert('Erro ao exportar. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

  async function exportarDizimistas() {
    const { data, error } = await supabase
      .from('dizimistas')
      .select('nome, data_nascimento, telefone, email, ativo, criado_em')
      .order('nome')
    if (error) throw error

    const linhas = (data || []).map(d => ({
      Nome: d.nome,
      'Aniversário': d.data_nascimento
        ? (() => { const [, m, dia] = d.data_nascimento.split('-'); return `${dia}/${m}` })()
        : '',
      Telefone: d.telefone || '',
      Email: d.email || '',
      Ativo: d.ativo ? 'Sim' : 'Não',
      Cadastrado: d.criado_em
        ? new Date(d.criado_em).toLocaleDateString('pt-BR')
        : '',
    }))

    gerarExcel(linhas, 'Dizimistas_NSAparecida')
  }

  async function exportarContribuicoes(anoRef) {
    const { data, error } = await supabase
      .from('contribuicoes')
      .select('dizimistas(nome), ano_referencia, mes_referencia, valor, forma_pagamento, data_registro, observacao')
      .eq('ano_referencia', anoRef)
      .order('data_registro', { ascending: false })
    if (error) throw error

    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const linhas = (data || []).map(c => ({
      Dizimista: c.dizimistas?.nome || '',
      Mês: MESES[(c.mes_referencia || 1) - 1],
      Ano: c.ano_referencia,
      'Valor (R$)': Number(c.valor).toFixed(2).replace('.', ','),
      'Forma Pagamento': c.forma_pagamento === 'pix' ? 'PIX' : 'Dinheiro',
      'Data Registro': c.data_registro
        ? new Date(c.data_registro).toLocaleDateString('pt-BR')
        : '',
      Observação: c.observacao || '',
    }))

    gerarExcel(linhas, `Contribuicoes_${anoRef}_NSAparecida`)
  }

  function gerarExcel(dados, nomeArquivo) {
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')

    // Ajusta largura das colunas automaticamente
    const colunas = Object.keys(dados[0] || {})
    ws['!cols'] = colunas.map(col => ({
      wch: Math.max(col.length, ...dados.map(r => String(r[col] || '').length), 10)
    }))

    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Tipo de exportação */}
      <div>
        <p className="text-xs font-bold text-dourado uppercase tracking-wider mb-2">O que exportar?</p>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors
            ${tipo === 'dizimistas' ? 'border-manto bg-manto/5' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="tipo"
              value="dizimistas"
              checked={tipo === 'dizimistas'}
              onChange={() => setTipo('dizimistas')}
              className="accent-manto"
            />
            <div>
              <p className="text-sm font-semibold text-manto">👥 Lista de Dizimistas</p>
              <p className="text-xs text-gray-400">Todos os cadastros com dados de contato</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors
            ${tipo === 'contribuicoes' ? 'border-manto bg-manto/5' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="tipo"
              value="contribuicoes"
              checked={tipo === 'contribuicoes'}
              onChange={() => setTipo('contribuicoes')}
              className="accent-manto"
            />
            <div>
              <p className="text-sm font-semibold text-manto">💰 Contribuições por Ano</p>
              <p className="text-xs text-gray-400">Todos os lançamentos do ano selecionado</p>
            </div>
          </label>
        </div>
      </div>

      {/* Seletor de ano (só para contribuições) */}
      {tipo === 'contribuicoes' && (
        <div>
          <label className="block text-xs font-semibold text-dourado uppercase tracking-wider mb-1">Ano de referência</label>
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-manto bg-gray-50 font-semibold text-sm"
          >
            {[2023, 2024, 2025, 2026].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      {/* Aviso */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs text-gray-500">
          📎 O arquivo será baixado no formato <strong>.xlsx</strong> (Excel).
          Compatível com Excel, Google Sheets e LibreOffice.
        </p>
      </div>

      {/* Botão exportar */}
      <button
        onClick={exportar}
        disabled={exportando}
        className={`w-full py-4 rounded-xl font-bold text-white text-base shadow-md transition-all
          ${exportando ? 'bg-gray-400 cursor-not-allowed' : 'bg-manto hover:bg-manto-dark active:scale-95'}`}
      >
        {exportando ? '⏳ Gerando...' : '📤 Baixar Planilha Excel'}
      </button>
    </div>
  )
}
