# Portal360

Portal360 é uma plataforma de e-commerce com catálogo digital de produtos e vendas via WhatsApp.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Prisma** - ORM para banco de dados
- **SQLite** - Banco de dados
- **Tailwind CSS** - Framework CSS
- **shadcn/ui** - Componentes UI

## 📋 Características

- Catálogo digital de produtos
- Categorização de produtos
- Vendas via WhatsApp
- Gerenciamento de loja
- Interface responsiva

## 🛠️ Configuração do Projeto

### Instalar dependências

```bash
npm install
```

### Configurar banco de dados

```bash
# Gerar o Prisma Client
npx prisma generate

# Criar o banco de dados
npx prisma db push

# (Opcional) Seed do banco
npx prisma db seed
```

### Executar em desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📂 Estrutura do Projeto

```
src/
├── app/              # App Router do Next.js
├── components/       # Componentes React
├── lib/             # Utilitários e configurações
└── styles/          # Estilos globais

prisma/
└── schema.prisma    # Schema do banco de dados
```

## 📦 Modelos do Banco de Dados

- **Category** - Categorias de produtos
- **Product** - Produtos do catálogo
- **Store** - Configurações da loja

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
