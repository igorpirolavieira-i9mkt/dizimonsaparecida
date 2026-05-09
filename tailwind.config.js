/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidade NS Aparecida
        manto: {
          DEFAULT: '#1A3A6B', // azul manto principal
          dark:    '#0F2347', // azul escuro (hover, gradiente)
          light:   '#254D8F', // azul médio
          50:      '#EEF3FA', // fundo suave
        },
        dourado: {
          DEFAULT: '#C9A84C', // dourado principal
          light:   '#E8C96A', // dourado claro
          dark:    '#A8892E', // dourado escuro (hover)
          10:      'rgba(201,168,76,0.10)', // fundo dourado suave
        },
        // Semântica de pagamento
        pago: {
          DEFAULT: '#16A34A', // verde — dinheiro em mãos
          light:   '#DCFCE7',
          border:  '#86EFAC',
        },
        pix: {
          DEFAULT: '#0D9488', // teal — PIX/digital
          light:   '#CCFBF1',
          border:  '#5EEAD4',
        },
        ausente: {
          DEFAULT: '#DC2626', // vermelho — ausência
          light:   '#FEE2E2',
          border:  '#FCA5A5',
        },
        pendente: {
          DEFAULT: '#D97706', // âmbar — pendência
          light:   '#FEF3C7',
          border:  '#FCD34D',
        },
      },
    },
  },
  plugins: [],
}
