/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Tipografia NS Aparecida
      fontFamily: {
        sans:  ['Nunito', 'system-ui', 'Segoe UI', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Times New Roman', 'serif'],
      },

      colors: {
        // Azul manto — manto de Nossa Senhora
        manto: {
          DEFAULT: '#1A3A6B',
          dark:    '#0F2347',
          light:   '#254D8F',
          50:      '#EEF3FA',
        },
        // Azul céu e acentos
        'azul-ceu':   '#2D6BA8',
        'azul-claro': '#5B9BD5',
        'azul-palido':'#D6E8F7',

        // Dourado real — coroa da Rainha
        dourado: {
          DEFAULT: '#C9A84C',
          light:   '#E8C96A',
          dark:    '#A8892E',
          claro:   '#F0D98C',   // texto sobre azul-manto
          palido:  '#FBF3D8',
          10:      'rgba(201,168,76,0.10)',
        },

        // Neutros
        'cinza-borda': '#E5E1D8',
        'cinza-medio': '#B0ADA5',

        // Semântica de pagamento
        pago: {
          DEFAULT: '#16A34A',
          strong:  '#15803D',
          light:   '#DCFCE7',
          border:  '#86EFAC',
        },
        pix: {
          DEFAULT: '#0D9488',
          strong:  '#0F766E',
          light:   '#CCFBF1',
          border:  '#5EEAD4',
        },
        ausente: {
          DEFAULT: '#DC2626',
          strong:  '#991B1B',
          light:   '#FEE2E2',
          border:  '#FCA5A5',
        },
        pendente: {
          DEFAULT: '#D97706',
          strong:  '#92400E',
          light:   '#FEF3C7',
          border:  '#FCD34D',
        },
      },

      // Sombras discretas (papel-fino)
      boxShadow: {
        xs:      '0 1px 2px rgba(15,35,71,0.04)',
        sm:      '0 1px 3px rgba(15,35,71,0.06), 0 1px 2px rgba(15,35,71,0.04)',
        md:      '0 4px 8px rgba(15,35,71,0.07), 0 2px 4px rgba(15,35,71,0.04)',
        lg:      '0 10px 20px rgba(15,35,71,0.10), 0 3px 6px rgba(15,35,71,0.04)',
        dourado: '0 2px 8px rgba(201,168,76,0.40)',
        manto:   '0 6px 16px rgba(26,58,107,0.20)',
      },

      // Gradientes de marca
      backgroundImage: {
        'gradient-manto':  'linear-gradient(160deg, #0F2347 0%, #1A3A6B 60%, #254D8F 100%)',
        'faixa-dourada':   'linear-gradient(90deg, #C9A84C, #F0D98C, #C9A84C)',
      },
    },
  },
  plugins: [],
}
