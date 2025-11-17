# Rediredi Clone

Um clone moderno do Reddit criado com Next.js 14, TypeScript, Tailwind CSS e Prisma.

## Funcionalidades

- Interface moderna e responsiva
- Sistema de posts e comentários
- Sistema de votos (upvote/downvote)
- Comunidades (subreddits)
- Autenticação de usuários
- Banco de dados SQLite com Prisma

## Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utility-first
- **Prisma** - ORM para banco de dados
- **Radix UI** - Componentes UI acessíveis
- **SQLite** - Banco de dados

## Como executar

1. Instale as dependências:
```bash
npm install
```

2. Configure o banco de dados:
```bash
npx prisma generate
npx prisma db push
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no navegador

## Estrutura do Projeto

```
├── app/                 # Páginas Next.js (App Router)
├── components/          # Componentes React
│   └── ui/             # Componentes UI reutilizáveis
├── lib/                # Utilitários e configurações
├── prisma/             # Schema e migrações do banco
├── public/             # Arquivos estáticos
└── ...                 # Arquivos de configuração
```

## Licença

MIT