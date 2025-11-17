# PORTAL360 - Catálogo Digital de Produtos & E-Commerce

Clone do RediRedi - Plataforma completa de catálogo digital de produtos e e-commerce.

## 🎨 Design

- **Rosa**: `#EF4C7B` - Ações principais
- **Teal**: `#5ECFC5` - Ações secundárias
- **Navy**: `#3A4558` - Sidebar e elementos escuros

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para banco de dados
- **SQLite** - Banco de dados
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI

## 📁 Estrutura do Projeto

```
portal360/
├── app/
│   ├── dashboard/           # Dashboard administrativo
│   │   ├── page.tsx        # Dashboard principal
│   │   ├── produtos/       # Gestão de produtos
│   │   ├── pedidos/        # Gestão de pedidos
│   │   └── clientes/       # CRM - Gestão de clientes
│   ├── catalogo/           # Catálogo público para clientes
│   ├── layout.tsx          # Layout raiz
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   └── sidebar.tsx         # Sidebar do dashboard
├── lib/
│   ├── utils.ts            # Utilidades
│   └── prisma.ts           # Cliente Prisma
├── prisma/
│   └── schema.prisma       # Schema do banco de dados
└── tailwind.config.ts      # Configuração do Tailwind
```

## 📦 Páginas Principais

### 1. **Dashboard (Início)**
- Bem-vindo
- Resumo de vendas
- Link do catálogo: `[nome].portal360.com.br`
- Ações rápidas

### 2. **Produtos**
- Cadastro de produtos (CRUD completo)
- Categorias
- Controle de estoque
- Upload de fotos
- Busca e filtros

### 3. **Pedidos**
- Lista de pedidos
- Filtros por status
- Detalhes do pedido
- Status: Pendente, Confirmado, Processando, Enviado, Entregue, Cancelado

### 4. **Clientes (CRM)**
- Cadastro de clientes
- Histórico de compras
- Informações de contato
- Estatísticas por cliente

### 5. **Catálogo Público**
- Página pública para clientes
- URL personalizada: `[nome].portal360.com.br`
- Integração com WhatsApp
- Busca de produtos
- Filtros por categoria

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma generate
npx prisma db push

# Executar em desenvolvimento
npm run dev
```

## 🗄️ Banco de Dados

### Models Principais:

- **User** - Usuários/Lojistas
- **Product** - Produtos
- **Category** - Categorias de produtos
- **Order** - Pedidos
- **OrderItem** - Itens do pedido
- **Customer** - Clientes

## 🎯 Funcionalidades

✅ Dashboard administrativo completo
✅ CRUD de produtos
✅ Gestão de pedidos
✅ CRM de clientes
✅ Catálogo público responsivo
✅ Integração WhatsApp
✅ Busca e filtros
✅ Design moderno e responsivo
✅ Sidebar escura à esquerda

## 🌐 Acessar

- **Landing Page**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Catálogo Público**: `http://localhost:3000/catalogo`

## 📱 WhatsApp Integration

Os clientes podem fazer pedidos diretamente pelo WhatsApp através do botão no catálogo público.

## 🎨 Cores do Tema

```css
--portal-pink: #EF4C7B;
--portal-teal: #5ECFC5;
--portal-navy: #3A4558;
```

## 📝 Próximos Passos

- [ ] Implementar autenticação
- [ ] Adicionar upload de imagens para produtos
- [ ] Sistema de multi-tenancy para múltiplas lojas
- [ ] Relatórios e analytics
- [ ] API REST completa
- [ ] Notificações em tempo real
- [ ] Exportação de dados (PDF, Excel)

## 🤝 Contribuindo

Este é um projeto de demonstração. Sinta-se à vontade para fazer fork e adaptar para suas necessidades!

## 📄 Licença

MIT License - Use livremente!
