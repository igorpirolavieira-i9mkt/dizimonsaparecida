// src/pages/Pix.jsx
// Gerador de QR Code PIX estático — chave fixa, fiel digita o valor

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { gerarPayloadPix } from '../lib/pix'

// Variáveis de ambiente do .env.local
const CHAVE_PIX    = import.meta.env.VITE_CHAVE_PIX    || ''
const NOME_RECEBEDOR = import.meta.env.VITE_NOME_RECEBEDOR || ''
const CIDADE_PIX   = import.meta.env.VITE_CIDADE_PIX   || ''

export default function Pix() {
  const [copiado, setCopiado] = useState(false)
  const [mostrarQr, setMostrarQr] = useState(true)

  // Payload PIX sem valor fixo (fiel digita no app do banco)
  const payload = gerarPayloadPix({
    chave: CHAVE_PIX,
    nome: NOME_RECEBEDOR,
    cidade: CIDADE_PIX,
    descricao: 'Dizimo NS Aparecida',
  })

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Fallback para dispositivos mais antigos
      const el = document.createElement('textarea')
      el.value = payload
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">

      {/* Header */}
      <header className="bg-manto text-white px-4 py-3 shadow-md sticky top-0 z-10 border-b-[3px] border-dourado">
        <h1 className="text-base font-bold">📱 Gerador PIX</h1>
        <p className="text-blue-200 text-xs">QR Code para recebimento do dízimo</p>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

          {/* Informações do recebedor */}
          <div className="bg-manto text-white px-5 py-4 text-center border-b-[3px] border-dourado">
            <div className="text-3xl mb-2">⛪</div>
            <p className="font-bold text-base">{NOME_RECEBEDOR || 'Paróquia São Tiago Maior'}</p>
            <p className="text-blue-200 text-sm mt-0.5">Comunidade Nossa Senhora Aparecida</p>
            <p className="text-dourado text-xs mt-1 font-semibold">Chave PIX: {CHAVE_PIX}</p>
          </div>

          {/* Toggle QR / Copia-e-cola */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setMostrarQr(true)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2
                ${mostrarQr ? 'text-manto border-manto bg-manto/5' : 'text-gray-400 border-transparent'}`}
            >
              📷 QR Code
            </button>
            <button
              onClick={() => setMostrarQr(false)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-b-2
                ${!mostrarQr ? 'text-manto border-manto bg-manto/5' : 'text-gray-400 border-transparent'}`}
            >
              📋 Copia e Cola
            </button>
          </div>

          <div className="px-5 py-6">
            {mostrarQr ? (
              /* QR Code */
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-3 rounded-xl border-2 border-dourado/30 shadow-sm">
                  <QRCodeSVG
                    value={payload}
                    size={220}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Aponte a câmera do celular para o QR Code.<br />
                  O valor do dízimo é digitado pelo próprio fiel.
                </p>
              </div>
            ) : (
              /* Copia e cola */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-dourado uppercase tracking-wider">Código PIX (copia e cola):</p>
                <div className="bg-gray-50 rounded-xl border border-gray-200 px-3 py-3">
                  <p className="text-xs text-gray-600 break-all font-mono leading-relaxed select-all">
                    {payload}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Toque em "Copiar" e cole no campo PIX do aplicativo do seu banco.
                </p>
              </div>
            )}

            {/* Botão copiar (sempre visível) */}
            <button
              onClick={copiar}
              className={`mt-4 w-full py-4 rounded-xl font-bold text-base text-white shadow-md transition-all active:scale-95
                ${copiado ? 'bg-pago' : 'bg-manto hover:bg-manto-dark'}`}
            >
              {copiado ? '✅ Código copiado!' : '📋 Copiar código PIX'}
            </button>
          </div>
        </div>

        {/* Aviso de valor livre */}
        <div className="bg-manto/5 border border-manto/20 rounded-xl px-4 py-3">
          <p className="text-xs text-manto font-semibold">ℹ️ PIX sem valor fixo</p>
          <p className="text-xs text-manto/80 mt-1">
            O QR Code não inclui valor — cada fiel digita o montante do seu dízimo
            diretamente no app do banco. Após o pagamento, lance a contribuição no sistema.
          </p>
        </div>

        {/* Instruções de uso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 space-y-2">
          <p className="text-xs font-bold text-dourado uppercase tracking-wider">Como usar</p>
          {[
            ['1', 'Mostrar o QR Code para o fiel durante a coleta'],
            ['2', 'Fiel escaneia com o app do banco e digita o valor'],
            ['3', 'Fiel mostra o comprovante ao responsável'],
            ['4', 'Responsável lança a contribuição no sistema com o comprovante'],
          ].map(([num, texto]) => (
            <div key={num} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-dourado/20 text-dourado-dark text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {num}
              </span>
              <p className="text-sm text-gray-600">{texto}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
