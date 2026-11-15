# Projeto Integrador — API de Psicologia

[![CI](https://github.com/VinSouzza/MindUp_PI/actions/workflows/ci.yml/badge.svg?branch=mongoDb)](https://github.com/VinSouzza/MindUp_PI/actions/workflows/ci.yml)

API Node.js/Express para agendamentos online e conversas entre usuários e voluntários. O projeto foi migrado de MySQL/Knex para MongoDB/Mongoose.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt
- Socket.IO
- EJS/arquivos estáticos em `public/`

## Requisitos

- Node.js 18 ou superior
- MongoDB Atlas ou MongoDB local

Para usar transações com MongoDB local, o servidor precisa rodar como replica set. O código também funciona em um `mongod` standalone, usando operações compensatórias quando a transação não está disponível.

O passo a passo para Atlas, MongoDB local com replica set e solução de problemas está em [`MONGODB_SETUP.md`](MONGODB_SETUP.md).

## Instalação

```bash
npm install
cp .env.example .env
```

Edite o `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/psi
JWT_SECRET=troque-por-um-segredo-forte
CORS_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
```

Para Atlas, use a connection string fornecida pelo painel:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/psi
```

## Banco de dados

Crie os índices e os dados de demonstração:

```bash
npm run seed
```

O seed limpa as coleções e cria:

- 5 usuários (todos com senha `123456`)
- 4 disponibilidades
- 3 agendamentos
- 3 conversas
- 5 mensagens

Para sincronizar apenas os índices, sem apagar os dados:

```bash
npm run db:sync-indexes
```

As coleções são `usuario`, `disponibilidade`, `agendamento`, `conversas` e `mensagem`. Os campos mantêm os nomes antigos (`nome_usr`, `id_vol`, etc.) para preservar o contrato da API; cada documento também expõe `_id` e o identificador antigo (`id_usr`, `id_dis`, `id_agn`, `id_con`, `id_men`).

A exclusão de um usuário remove seus dados dependentes (disponibilidades, agendamentos, conversas e mensagens). A exclusão de uma disponibilidade também remove os agendamentos vinculados, mantendo o comportamento de cascade do MySQL antigo.

## Scripts

- `npm start` — inicia o servidor
- `npm run dev` — inicia com nodemon
- `npm run seed` — recria os dados de demonstração
- `npm run db:sync-indexes` — sincroniza os índices do MongoDB
- `npm test` — executa o smoke test nos modos standalone e replica set
- `npm run test:smoke` — executa o smoke test em um MongoDB standalone em memória
- `npm run test:smoke:replset` — executa o mesmo smoke test em um replica set em memória

O smoke test sobe um MongoDB temporário com `mongodb-memory-server`, usa a porta `3123` e não altera o banco configurado no `.env`. Na primeira execução, o pacote pode baixar o binário do MongoDB. Ele cobre login, autorização, disponibilidade, agendamento, confirmação, cancelamento, conversas, mensagens, Socket.IO, duplicidades e exclusão em cascata.

Não há scripts de lint ou typecheck no projeto no momento.

## Rotas principais

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login e geração do JWT |
| POST | `/auth/registrar` | Cadastro público de `usuario` ou `voluntario` |
| GET | `/usuario` | Lista usuários |
| GET | `/usuario/:id` | Busca usuário por ID |
| POST | `/usuario` | Cria usuário |
| PUT | `/usuario/:id` | Atualiza usuário (self ou admin) |
| DELETE | `/usuario/:id` | Exclui usuário (self ou admin) |
| GET | `/disponibilidade/disponiveis` | Horários disponíveis |
| GET | `/disponibilidade/minhas` | Horários do voluntário logado |
| GET | `/disponibilidade/:id` | Disponibilidades de um voluntário |
| POST | `/disponibilidade` | Cria horário (voluntário) |
| PUT | `/disponibilidade/:id` | Atualiza horário (dono) |
| PATCH | `/disponibilidade/cancelar/:id` | Cancela horário (dono) |
| PATCH | `/disponibilidade/reativar/:id` | Reativa horário (dono) |
| DELETE | `/disponibilidade/:id` | Exclui horário e agendamentos vinculados |
| POST | `/agendamento` | Cria um agendamento |
| GET | `/agendamento/voluntario/:id` | Agendamentos do voluntário |
| GET | `/agendamento/usuario/:id` | Agendamentos do usuário |
| PATCH | `/agendamento/confirmar/:id` | Voluntário confirma |
| PATCH | `/agendamento/desconfirmar/:id` | Voluntário desconfirma |
| PATCH | `/agendamento/cancelar/:id` | Usuário ou voluntário cancela |
| DELETE | `/agendamento/:id` | Usuário exclui o próprio agendamento |
| POST | `/conversa` | Inicia uma conversa |
| GET | `/conversa/minhas` | Conversas do usuário logado |
| GET | `/conversa/:id` | Busca conversa por ID |
| GET | `/mensagem/conversa/:id_con` | Histórico de mensagens |
| PATCH | `/mensagem/:id_men/visualizar` | Marca mensagem como visualizada |

Rotas protegidas exigem `Authorization: Bearer <token>`.

## Socket.IO

O cliente conecta enviando o JWT em `auth.token` ou na query `?token=`. Eventos principais:

- `entrar_conversa` (`id_con`)
- `sair_conversa` (`id_con`)
- `enviar_mensagem` (`{ id_con, conteudo }`)
- `mensagem_recebida` (`{ id_men, id_con, id_remetente, conteudo_men, enviada_em }`)
- `erro`

As salas usam o formato `conversa_<id_con>`.

## Frontend

O frontend está em `frront/` e também é servido pelo Express na mesma porta da API
(`http://localhost:3000/login.html`). Nesse modo não há CORS nem configuração extra.
Para usar o Live Server, mantenha a API em `http://localhost:3000` e inclua a origem
exata (por exemplo `http://127.0.0.1:5500`) em `CORS_ORIGIN`; a variável aceita uma
lista separada por vírgulas e o Socket.IO usa a mesma lista.

O cadastro público (`POST /auth/registrar`) aceita `nome_usr`, `email_usr`, `senha_usr`
(mínimo 8 caracteres), `perfil_usr` (`usuario` ou `voluntario`) e, opcionalmente,
`contato_usr`, `faixa_etaria_usr`, `cidade_usr`, `estado_usr` e `especialidade_vol`.

## Arquivos legados

`database/migrations/`, `database/seeds/` e `knexfile.js` pertencem à versão MySQL e não são mais usados. Podem ser removidos quando a migração estiver validada.

## Licença

MIT
