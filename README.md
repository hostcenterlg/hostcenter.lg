# Portal360 - Catálogo de Produtos e E-commerce

![Portal360](https://img.shields.io/badge/Portal360-E--commerce-EF4C7B?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)

**Portal360** é um clone do RediRedi - uma plataforma completa de catálogo de produtos e e-commerce. Permite que lojistas gerenciem seus produtos, pedidos e clientes, além de disponibilizar um catálogo público para que os clientes possam visualizar produtos e fazer pedidos via WhatsApp.

## 🎨 Cores da Marca

- **Rosa**: `#EF4C7B` - Cor primária
- **Teal**: `#5ECFC5` - Cor secundária
- **Navy**: `#3A4558` - Cor de fundo/sidebar

## ✨ Funcionalidades

### 📊 Dashboard (Página Inicial)
- Bem-vindo personalizado
- Resumo de vendas com estatísticas
- Link do catálogo público: `[nome].portal360.com.br`
- Pedidos recentes
- Indicadores visuais de performance

### 📦 Produtos
- Cadastro completo de produtos
- Organização por categorias
- Controle de estoque
- Gerenciamento de fotos
- Preços e preços promocionais
- Status ativo/inativo

### 🛒 Pedidos
- Lista completa de pedidos
- Filtros por status
- Status dos pedidos:
  - Pendente
  - Confirmado
  - Processando
  - Enviado
  - Entregue
  - Cancelado
- Visualização detalhada
- Ações rápidas (confirmar, cancelar)

### 👥 Clientes (CRM)
- Cadastro de clientes
- Histórico completo de compras
- Informações de contato
- Total gasto por cliente
- Integração com WhatsApp

### 🌐 Catálogo Público
- Página pública para clientes
- URL personalizada: `[nome].portal360.com.br`
- Visualização de produtos por categoria
- Busca de produtos
- Carrinho de compras
- Integração com WhatsApp para pedidos
- Design responsivo

### ⚙️ Configurações
- Dados da loja
- Personalização de cores
- Logo da loja
- Configuração do WhatsApp
- Slug/URL personalizada

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Banco de Dados**: SQLite com Prisma ORM
- **Estilização**: Tailwind CSS
- **Componentes**: shadcn/ui
- **Ícones**: Lucide React

## 📁 Estrutura do Projeto

```
portal360/
├── app/
│   ├── (admin)/              # Rotas administrativas
│   │   ├── layout.tsx        # Layout com sidebar
│   │   ├── page.tsx          # Dashboard
│   │   ├── produtos/         # Gerenciamento de produtos
│   │   ├── pedidos/          # Gerenciamento de pedidos
│   │   ├── clientes/         # CRM de clientes
│   │   └── configuracoes/    # Configurações da loja
│   ├── catalogo/             # Catálogo público
│   │   └── page.tsx
│   ├── globals.css           # Estilos globais
│   └── layout.tsx            # Layout raiz
├── components/
│   ├── ui/                   # Componentes UI (shadcn)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── label.tsx
│   └── sidebar.tsx           # Componente de navegação
├── lib/
│   ├── prisma.ts             # Cliente Prisma
│   └── utils.ts              # Utilitários
├── prisma/
│   └── schema.prisma         # Schema do banco de dados
└── package.json
```

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

### Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositório>
cd hostcenter.lg
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
```bash
npx prisma generate
npx prisma db push
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse a aplicação:
- **Painel Administrativo**: http://localhost:3000
- **Catálogo Público**: http://localhost:3000/catalogo

## 📊 Schema do Banco de Dados

### Store (Loja)
- Informações da loja
- Configurações
- Relação com produtos, pedidos e clientes

### Product (Produto)
- Nome, descrição, preço
- Estoque
- Imagens (JSON)
- Categoria
- Status (ativo/inativo)

### Order (Pedido)
- Número do pedido
- Status
- Total
- Relação com cliente e itens

### OrderItem (Item do Pedido)
- Quantidade
- Preço no momento da compra
- Relação com produto

### Customer (Cliente)
- Dados pessoais
- Endereço
- Histórico de pedidos

### Category (Categoria)
- Organização de produtos

## 🎯 Próximos Passos

- [ ] Implementar autenticação de usuários
- [ ] Adicionar upload de imagens
- [ ] Criar API para gerenciamento de dados
- [ ] Implementar relatórios e analytics
- [ ] Adicionar sistema de multi-tenancy (múltiplas lojas)
- [ ] Integração com gateways de pagamento
- [ ] Notificações por e-mail
- [ ] Sistema de cupons de desconto

## 📱 Integração WhatsApp

O Portal360 permite que clientes façam pedidos diretamente pelo WhatsApp. Os produtos adicionados ao carrinho são formatados e enviados como mensagem para o número configurado nas configurações da loja.

## 🎨 Design System

O projeto utiliza um design system baseado em:
- Sidebar escura (Navy) à esquerda
- Cores vibrantes (Pink e Teal) para CTAs e destaques
- Layout moderno e responsivo
- Componentes reutilizáveis do shadcn/ui

## 📄 Licença

Este projeto é um clone educacional do RediRedi para fins de aprendizado.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

Desenvolvido com ❤️ usando Next.js 14 e TypeScript
