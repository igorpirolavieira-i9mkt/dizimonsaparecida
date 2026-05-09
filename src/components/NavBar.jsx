// src/components/NavBar.jsx
// UX Otimizado: área de toque mínima 52px, label apenas na aba ativa, ícone maior na ativa

import { useNavigate, useLocation } from 'react-router-dom'

const ITENS = [
  { rota: '/',              icone: '🏠', label: 'Início'  },
  { rota: '/resumo',        icone: '📊', label: 'Resumo'  },
  { rota: '/relatorio-dia', icone: '📋', label: 'Canhoto' },
  { rota: '/comprovantes',  icone: '📁', label: 'Compr.'  },
  { rota: '/admin',         icone: '⚙️', label: 'Admin'   },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-manto z-50 border-t-[3px] border-dourado shadow-lg">
      <div className="flex items-stretch max-w-lg mx-auto">
        {ITENS.map(item => {
          const ativo = pathname === item.rota
          return (
            <button
              key={item.rota}
              onClick={() => navigate(item.rota)}
              // min-h-[52px] — área de toque mínima para coleta no celular
              className={`flex-1 flex flex-col items-center justify-center min-h-[52px] px-1 py-2 font-semibold transition-colors
                ${ativo ? 'text-dourado' : 'text-blue-300 hover:text-dourado-light'}`}
            >
              {/* Ícone maior na aba ativa */}
              <span className={`transition-all leading-none ${ativo ? 'text-2xl mb-1' : 'text-xl'}`}>
                {item.icone}
              </span>
              {/* Label visível apenas na aba ativa — menos poluição visual */}
              {ativo && <span className="text-[11px] leading-none">{item.label}</span>}
            </button>
          )
        })}
      </div>
      {/* Área segura iPhone */}
      <div style={{ height: 'env(safe-area-inset-bottom)' }} className="bg-manto" />
    </nav>
  )
}
