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
deno task db:migrate
deno task db:seed
deno task dev
```

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

## Ciclo da partida

- Host cria a sala em `/host` e compartilha o código.
- Jogadores entram pela página inicial com um apelido.
- O host conduz: começar, revelar resposta, próxima pergunta ou encerrar antes
  do fim ("Encerrar quiz").
- Ao final, "Jogar novamente" devolve a sala ao lobby zerando placar e respostas
  — os jogadores conectados permanecem na sala.
- "Sair da sala" (host) e "Sair" (jogador) limparam os cookies da sessão.

## API

| Método | Rota                       | Descrição                                    |
| ------ | -------------------------- | -------------------------------------------- |
| POST   | `/api/games`               | Cria sala (define cookie de host).           |
| POST   | `/api/games/:code/join`    | Entra na sala (define cookies do jogador).   |
| GET    | `/api/games/:code/state`   | Estado atual da partida.                     |
| GET    | `/api/games/:code/events`  | Stream SSE com o estado em tempo real.       |
| POST   | `/api/games/:code/start`   | Inicia a primeira pergunta (host).           |
| POST   | `/api/games/:code/answer`  | Registra a resposta do jogador.              |
| POST   | `/api/games/:code/next`    | Revela resposta ou avança a pergunta (host). |
| POST   | `/api/games/:code/finish`  | Encerra o quiz antecipadamente (host).       |
| POST   | `/api/games/:code/restart` | Volta ao lobby zerando placar (host).        |
| POST   | `/api/games/:code/leave`   | Limpa os cookies da sessão.                  |
