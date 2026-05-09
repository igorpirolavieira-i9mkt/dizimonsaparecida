// src/components/NavBar.jsx
// Navegação inferior estilo mobile — aparece em todas as telas autenticadas

import { useNavigate, useLocation } from 'react-router-dom'

const ITENS = [
  { rota: '/',             icone: '🏠', label: 'Início' },
  { rota: '/resumo',       icone: '📊', label: 'Resumo' },
  { rota: '/relatorio-dia',icone: '📋', label: 'Canhoto' },
  { rota: '/comprovantes', icone: '📁', label: 'Compr.' },
  { rota: '/admin',        icone: '⚙️', label: 'Admin' },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex items-stretch max-w-lg mx-auto">
        {ITENS.map(item => {
          const ativo = pathname === item.rota
          return (
            <button
              key={item.rota}
              onClick={() => navigate(item.rota)}
              className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-semibold transition-colors
                ${ativo
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-gray-400 hover:text-blue-600'
                }`}
            >
              <span className="text-xl mb-0.5">{item.icone}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      {/* Área segura para iPhone com home indicator */}
      <div className="h-safe-bottom bg-white" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
