# Fresh Quiz

Jogo de perguntas em tempo real sobre fundamentos da web, construído com Fresh,
Preact, SSE e PostgreSQL.

## Requisitos

- Deno 2+
- Docker e Docker Compose

## Desenvolvimento

```bash
cp .env.example .env
docker compose up -d
deno task dev
```

Ao criar o container do Postgres, o `docker-entrypoint-initdb.d` aplica
automaticamente as migrações de `db/migrations/` e o seed
(`db/seed/001_web_basics.sql`). Para recriar o banco do zero:

```bash
docker compose down -v && docker compose up -d
```

Se preferir rodar as tarefas manualmente (por exemplo, contra um banco já
existente), use `deno task db:migrate` e `deno task db:seed`.

O Postgres é publicado na porta `5433` da máquina para não conflitar com outros
projetos locais; ajuste `DATABASE_URL` em `.env` se necessário.

Abra `http://localhost:5173/` para entrar em uma partida ou `/host` para criar
uma sala.

## Comandos

- `deno task dev`: inicia o servidor de desenvolvimento.
- `deno task db:migrate`: cria o schema PostgreSQL.
- `deno task db:seed`: insere o quiz de fundamentos da web.
- `deno task check`: executa formatação, lint e typecheck.
- `deno task test`: executa os testes.
- `deno task build`: gera a build de produção.

O quiz inicial contém perguntas de HTML, CSS, HTTP, JavaScript, seletores CSS e
APIs.

## Deploy

Produção roda em uma EC2 (Amazon Linux) com o app sob `systemd` e o Postgres via
Docker Compose na mesma instância. O deploy é manual: _Actions → Deploy → Run
workflow_ builda o projeto, envia a build e reinicia o serviço. O guia de
provisionamento está em [`deploy/SETUP.md`](deploy/SETUP.md).

## Ciclo da partida

- Host cria a sala em `/host` com um apelido e compartilha o código.
- Jogadores entram pela página inicial com um apelido.
- O nome do host aparece em destaque, em seção separada do ranking, para todos.
- O host acompanha a votação ao vivo (com timer até a revelação) e começa o
  quiz; a resposta de cada pergunta é revelada automaticamente quando o tempo
  acaba. Depois da revelação, o host avança para a próxima pergunta (ou para o
  resultado final) ou encerra antes do fim ("Encerrar quiz").
- Ao final, "Jogar novamente" devolve a sala ao lobby zerando placar e respostas
  — os jogadores conectados permanecem na sala.
- "Sair da sala" (host) e "Sair" (jogador) limparam os cookies da sessão.

## API

| Método | Rota                       | Descrição                                  |
| ------ | -------------------------- | ------------------------------------------ |
| POST   | `/api/games`               | Cria sala (define cookie de host).         |
| POST   | `/api/games/:code/join`    | Entra na sala (define cookies do jogador). |
| GET    | `/api/games/:code/state`   | Estado atual da partida.                   |
| GET    | `/api/games/:code/events`  | Stream SSE com o estado em tempo real.     |
| POST   | `/api/games/:code/start`   | Inicia a primeira pergunta (host).         |
| POST   | `/api/games/:code/answer`  | Registra a resposta do jogador.            |
| POST   | `/api/games/:code/next`    | Avança a pergunta revelada (host).         |
| POST   | `/api/games/:code/finish`  | Encerra o quiz antecipadamente (host).     |
| POST   | `/api/games/:code/restart` | Volta ao lobby zerando placar (host).      |
| POST   | `/api/games/:code/leave`   | Limpa os cookies da sessão.                |
