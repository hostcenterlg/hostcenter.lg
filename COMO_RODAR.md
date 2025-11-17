# 🚀 COMO RODAR O PORTAL360

## Passos para rodar o projeto:

### 1️⃣ Instalar dependências
```bash
npm install
```

### 2️⃣ Gerar o Prisma Client
```bash
npx prisma generate
```

### 3️⃣ Criar o banco de dados
```bash
npx prisma db push
```

### 4️⃣ Rodar o servidor
```bash
npm run dev
```

### 5️⃣ Acessar no navegador
- **Dashboard (Página Principal)**: http://localhost:3000
- **Produtos**: http://localhost:3000/produtos
- **Pedidos**: http://localhost:3000/pedidos
- **Clientes**: http://localhost:3000/clientes
- **Configurações**: http://localhost:3000/configuracoes
- **Catálogo Público**: http://localhost:3000/catalogo

---

## ✅ O que está funcionando:

✅ Dashboard com estatísticas e pedidos recentes
✅ Página de Produtos com tabela completa
✅ Página de Pedidos com filtros e status
✅ Página de Clientes (CRM)
✅ Página de Configurações
✅ Catálogo Público com carrinho e WhatsApp
✅ Sidebar com navegação
✅ Design com cores da marca (Rosa, Teal, Navy)

---

## 🎨 Cores do Projeto:

- **Rosa**: `#EF4C7B`
- **Teal**: `#5ECFC5`
- **Navy**: `#3A4558`

---

## 📱 Funcionalidades do Catálogo:

1. Adicione produtos ao carrinho
2. Clique em "Fazer Pedido via WhatsApp"
3. O pedido será formatado e enviado pelo WhatsApp

---

## 🛠️ Tecnologias:

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma + SQLite
- shadcn/ui

---

## ⚠️ Importante:

Se aparecer erro de "Prisma Client", rode:
```bash
npx prisma generate
```

Se aparecer erro de banco de dados, rode:
```bash
npx prisma db push
```
