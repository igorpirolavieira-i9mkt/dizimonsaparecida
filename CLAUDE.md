# App Dízimo — Comunidade Nossa Senhora Aparecida
# Instruções para o Claude Code

## Identidade do Projeto

**Nome:** App Dízimo NS Aparecida  
**Coordenador:** Igor Pirola Vieira  
**Comunidade:** Nossa Senhora Aparecida — Paróquia São Tiago Maior, Guarapari/ES  
**Repositório:** https://github.com/igorpirolavieira-i9mkt/dizimonsaparecida  
**Stack:** React 18 + Vite + Tailwind CSS + Supabase + React Router DOM v6  
**Deploy:** Vercel  

---

## ⚠️ REGRAS CRÍTICAS — LEIA ANTES DE QUALQUER COISA

1. **NUNCA usar `NEXT_PUBLIC_`** — este projeto é React + Vite, não Next.js
2. **SEMPRE usar `VITE_`** como prefixo nas variáveis de ambiente
3. **NUNCA usar `@supabase/ssr`** — usar apenas `@supabase/supabase-js` com `createClient` simples
4. **NUNCA commitar `.env.local`** — está no `.gitignore`
5. **Sempre mobile-first** — o app é usado no celular durante a coleta de dízimo
6. **Todos os textos em português brasileiro**
7. **Datas no formato DD/MM** (ignorar o ano 1900 que é placeholder)
8. **Valores no formato R$ 0,00**

---

## Variáveis de Ambiente (.env.local)

```
VITE_SUPABASE_URL=https://zjvauqkhivtjwhrurcgs.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_adk_vseW2Xwd2nE45s1joA_rhC9kEHy
VITE_CHAVE_PIX=27997051725
VITE_NOME_RECEBEDOR=Paróquia São Tiago Maior
VITE_CIDADE_PIX=Guarapari
```

---

## Cliente Supabase

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Banco de Dados (Supabase — já criado)

### Tabela: dizimistas
| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| nome | text |
| data_nascimento | date (ano 1900 = placeholder, exibir só DD/MM) |
| telefone | text |
| email | text |
| ativo | boolean |
| criado_em | timestamptz |
| atualizado_em | timestamptz |

### Tabela: contribuicoes
| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| dizimista_id | uuid (FK → dizimistas) |
| ano_referencia | integer |
| mes_referencia | integer (1–12) |
| valor | numeric(10,2) |
| forma_pagamento | text ('dinheiro' ou 'pix') |
| comprovante_url | text (path no Storage) |
| data_registro | timestamptz |
| registrado_por | uuid (FK → auth.users) |
| observacao | text |

### Storage
- Bucket: `comprovantes` (privado)
- Path: `/{dizimista_id}/{ano}/{mes}/{timestamp}.jpg`

---

## Regras de Negócio — NUNCA violar

| # | Regra |
|---|---|
| 1 | `mes_referencia` ≠ data de pagamento. Retroativo e adiantado são normais. |
| 2 | Relatório financeiro/canhoto usa `data_registro` (data real do lançamento). |
| 3 | Perfil do fiel usa `mes_referencia` (mês que foi pago). |
| 4 | Múltiplas contribuições no mesmo `mes_referencia` são SOMADAS. |
| 5 | Meses sem contribuição = ausência (não é zero, é vazio). |
| 6 | Upload de comprovante obrigatório quando `forma_pagamento = 'pix'`. |
| 7 | PIX estático — chave 27997051725, sem valor fixo. |
| 8 | Dizimistas inativos não aparecem na busca, histórico preservado. |
| 9 | Consulta pública: fiel vê apenas próprio histórico, sem login, sem edição. |

---

## Estrutura de Pastas

```
src/
├── components/
│   ├── BuscaDizimista.jsx       ✅ pronto (embutido no Home.jsx)
│   ├── FormContribuicao.jsx     ✅ pronto (embutido no Home.jsx)
│   ├── FormMultiplosMeses.jsx   ⬜ a construir
│   ├── PerfilDizimista.jsx      ✅ pronto
│   ├── ResumoMensal.jsx         ⬜ a construir
│   ├── RelatorioDia.jsx         ⬜ a construir
│   ├── ComprovantePix.jsx       ⬜ a construir
│   ├── GeradorPix.jsx           ⬜ a construir
│   ├── ImportacaoLote.jsx       ⬜ a construir
│   ├── AdminPanel.jsx           ⬜ a construir
│   └── NavBar.jsx               ✅ pronto
├── lib/
│   ├── supabase.js              ✅ pronto
│   └── pix.js                   ⬜ a construir (gerador de payload PIX estático)
├── pages/
│   ├── Login.jsx                ✅ pronto
│   ├── Home.jsx                 ✅ pronto (busca + formulário de contribuição)
│   ├── Dizimista.jsx            ✅ pronto (perfil individual)
│   ├── Resumo.jsx               ⬜ a construir
│   ├── RelatorioDia.jsx         ⬜ a construir
│   ├── Comprovantes.jsx         ⬜ a construir
│   ├── Pix.jsx                  ⬜ a construir
│   ├── Admin.jsx                ⬜ a construir
│   └── Consulta.jsx             ⬜ a construir
├── App.jsx                      ✅ pronto (rotas + proteção de acesso)
└── main.jsx                     ✅ pronto
```

---

## Rotas do App

| Rota | Página | Status | Acesso |
|---|---|---|---|
| `/login` | Login.jsx | ✅ pronto | público |
| `/` | Home.jsx | ✅ pronto | autenticado |
| `/dizimista/:id` | Dizimista.jsx | ✅ pronto | autenticado |
| `/resumo` | Resumo.jsx | ⬜ pendente | autenticado |
| `/relatorio-dia` | RelatorioDia.jsx | ⬜ pendente | autenticado |
| `/comprovantes` | Comprovantes.jsx | ⬜ pendente | autenticado |
| `/pix` | Pix.jsx | ⬜ pendente | autenticado |
| `/admin` | Admin.jsx | ⬜ pendente | autenticado |
| `/consulta` | Consulta.jsx | ⬜ pendente | público |

---

## Próximos Passos (em ordem de prioridade)

1. **`FormMultiplosMeses.jsx`** — modal para lançar vários meses de uma vez (retroativo/adiantado)
2. **`Admin.jsx` + `AdminPanel.jsx`** — CRUD de dizimistas + importação em lote + exportação Excel
3. **`Resumo.jsx`** — totais mensais + quem não pagou
4. **`RelatorioDia.jsx`** — canhoto da mitra por período + exportação Excel
5. **`lib/pix.js`** — gerador de payload PIX BR Code (EMV)
6. **`Pix.jsx`** — QR Code + copia-e-cola
7. **`Comprovantes.jsx`** — lista de comprovantes PIX + download ZIP
8. **`Consulta.jsx`** — tela pública sem login para o fiel consultar seu histórico
9. **Deploy** no Vercel + teste em celular

---

## Padrões de Código

- Componentes funcionais com hooks (`useState`, `useEffect`)
- `async/await` para todas as chamadas ao Supabase
- Estado de loading (`carregando`) e erro (`erro`) em toda operação de banco
- Tailwind CSS para 100% do estilo — sem CSS externo
- Cores predominantes: `blue-900` (azul escuro) e `white`
- Feedback visual com mensagens de sucesso/erro sempre que o usuário fizer uma ação
- Comentários no código — o coordenador não é desenvolvedor de formação

---

## Dependências já instaladas

```json
{
  "@supabase/supabase-js": "latest",
  "react-router-dom": "^6",
  "xlsx": "latest",
  "qrcode.react": "latest",
  "jszip": "latest",
  "tailwindcss": "latest"
}
```

---

## Como o Claude Code deve agir neste projeto

Quando Igor pedir para construir ou ajustar algo:

1. **Leia os arquivos existentes** antes de criar novos — para manter consistência
2. **Gere o arquivo completo e funcional** — sem fragmentos incompletos
3. **Salve diretamente** no caminho correto dentro de `src/`
4. **Atualize o `App.jsx`** se uma nova rota for criada
5. **Não quebre o que já funciona** — Login, Home e Dizimista estão prontos
6. **Rode `npm run dev`** para testar se o app sobe sem erros após qualquer mudança
7. **Nunca use `NEXT_PUBLIC_`** — sempre `VITE_`
