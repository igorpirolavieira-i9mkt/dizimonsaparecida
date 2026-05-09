// src/components/NavBar.jsx
// Design system NS Aparecida: fundo branco, borda cinza, ativo em azul-manto
// UX: área de toque mínima 52px, label só na aba ativa, ícone maior na ativa

import { useNavigate, useLocation } from 'react-router-dom'

const ITENS = [
  { rota: '/',                 icone: '🏠', label: 'Início'   },
  { rota: '/resumo',           icone: '📊', label: 'Resumo'   },
  { rota: '/relatorio-dia',    icone: '📋', label: 'Canhoto'  },
  { rota: '/aniversariantes',  icone: '🎂', label: 'Aniver.'  },
  { rota: '/admin',            icone: '⚙️', label: 'Admin'    },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-50 border-t border-cinza-borda shadow-manto">
      <div className="flex items-stretch max-w-lg mx-auto">
        {ITENS.map(item => {
          const ativo = pathname === item.rota
          return (
            <button
              key={item.rota}
              onClick={() => navigate(item.rota)}
              // min-h-[52px] — área de toque mínima para coleta no celular
              className={`flex-1 flex flex-col items-center justify-center min-h-[52px] px-1 py-2 font-semibold transition-colors
                ${ativo ? 'text-manto' : 'text-cinza-medio hover:text-manto/60'}`}
            >
              {/* Ícone maior na aba ativa */}
              <span className={`transition-all leading-none ${ativo ? 'text-2xl mb-1' : 'text-xl'}`}>
                {item.icone}
              </span>
              {/* Label visível apenas na aba ativa — menos poluição visual */}
              {ativo && <span className="text-[11px] font-bold leading-none text-manto">{item.label}</span>}
            </button>
          )
        })}
      </div>
      {/* Área segura iPhone */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} className="bg-white" />
    </nav>
  )
}
