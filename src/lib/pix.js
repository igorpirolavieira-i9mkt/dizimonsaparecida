// src/lib/pix.js
// Gerador de payload PIX BR Code (padrão EMV — Banco Central do Brasil)
// Documentação: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf

/**
 * Gera um campo EMV no formato: ID + tamanho (2 dígitos) + valor
 */
function campo(id, valor) {
  const tamanho = String(valor.length).padStart(2, '0')
  return `${id}${tamanho}${valor}`
}

/**
 * Calcula o CRC16-CCITT do payload (polinômio 0x1021)
 */
function crc16(payload) {
  let crc = 0xFFFF
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Gera o payload PIX estático (sem valor fixo)
 *
 * @param {Object} opcoes
 * @param {string} opcoes.chave       — chave PIX (CPF, CNPJ, telefone, e-mail ou aleatória)
 * @param {string} opcoes.nome        — nome do recebedor (máx 25 chars)
 * @param {string} opcoes.cidade      — cidade do recebedor (máx 15 chars)
 * @param {number} [opcoes.valor]     — valor em reais (omitir = valor livre)
 * @param {string} [opcoes.txid]      — identificador da transação (máx 25 chars, default '***')
 * @param {string} [opcoes.descricao] — descrição da transação (máx 72 chars)
 * @returns {string} payload pronto para gerar QR Code
 */
export function gerarPayloadPix({ chave, nome, cidade, valor, txid = '***', descricao = '' }) {
  // Normaliza strings (remove acentos e caracteres especiais)
  const limpar = str => str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 @._\-]/g, '')
    .trim()

  const nomeClean   = limpar(nome).slice(0, 25)
  const cidadeClean = limpar(cidade).slice(0, 15)
  const txidClean   = txid === '***' ? '***' : limpar(txid).slice(0, 25) || '***'

  // Campo 26 — Merchant Account Information (dados do PIX)
  const gui = campo('00', 'BR.GOV.BCB.PIX')    // GUI obrigatório
  const chaveCampo = campo('01', chave)           // chave PIX
  const descCampo = descricao ? campo('02', limpar(descricao).slice(0, 72)) : ''
  const merchantInfo = campo('26', gui + chaveCampo + descCampo)

  // Campo 54 — valor (opcional; omitir = fiel digita o valor)
  const valorCampo = valor && valor > 0
    ? campo('54', Number(valor).toFixed(2))
    : ''

  // Monta o payload sem o CRC (campo 63)
  const semCrc =
    campo('00', '01')           // Payload Format Indicator
    + campo('01', '12')         // Point of Initiation Method: 12 = estático (reutilizável)
    + merchantInfo              // Merchant Account Information
    + campo('52', '0000')       // Merchant Category Code (0000 = não especificado)
    + campo('53', '986')        // Transaction Currency: 986 = BRL
    + valorCampo                // Transaction Amount (opcional)
    + campo('58', 'BR')         // Country Code
    + campo('59', nomeClean)    // Merchant Name
    + campo('60', cidadeClean)  // Merchant City
    + campo('62', campo('05', txidClean)) // Additional Data Field — txid
    + '6304'                    // CRC16 tag + tamanho fixo 04 (valor calculado abaixo)

  return semCrc + crc16(semCrc)
}
