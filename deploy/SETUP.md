# Deploy na EC2 — Setup

Instância Amazon Linux (`ec2-user`), um único ambiente:

| Diretório        | Porta | Serviço |
| ---------------- | ----- | ------- |
| `/opt/fresh/app` | 8000  | `fresh` |

O Postgres roda em Docker Compose (container único, banco `fresh_quiz`). A
operação é feita por dois workflows independentes:

- **App**: publica o código. Nunca toca no banco.
- **Database**: destrói e recria o container do Postgres (schema + seed).

## 1. Security Group

Libere entrada na porta `8000` e **não** exponha a porta do Postgres
publicamente.

## 2. Conexão SSH

```bash
chmod 400 ~/macbook.pem
ssh -i ~/macbook.pem ec2-user@<IP_PUBLICO>
```

## 3. Deno

```bash
curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh
deno --version
```

## 4. Docker + Compose

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

O pacote do Amazon Linux não traz o `docker compose`. Instale o plugin de acordo
com a arquitetura (`uname -m`):

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)   # x86_64 ou aarch64
sudo curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

Saia e reconecte o SSH para o grupo `docker` valer.

## 5. Diretórios do app e sudoers

O workflow reinicia o serviço via `sudo systemctl restart`; libere só esse
comando sem senha.

```bash
sudo mkdir -p /opt/fresh/app
sudo chown -R ec2-user:ec2-user /opt/fresh

echo "ec2-user ALL=(ALL) NOPASSWD: /bin/systemctl restart fresh" | sudo tee /etc/sudoers.d/fresh >/dev/null
sudo chmod 440 /etc/sudoers.d/fresh
```

## 6. Unit do systemd

O arquivo está versionado em `deploy/fresh.service` e é enviado a cada deploy
para `$APP_DIR/deploy/`. Na primeira vez, instale-o:

```bash
sudo cp /opt/fresh/app/deploy/fresh.service /etc/systemd/system/fresh.service
sudo systemctl daemon-reload
sudo systemctl enable fresh
```

Sempre que o unit mudar no repositório, repita o `cp` + `daemon-reload`.

O serviço lê o `DATABASE_URL` do `.env`, escrito pelo App a cada publicação; não
crie manualmente.

## 7. Secrets do GitHub

Em _Settings → Secrets and variables → Actions_ (nível do repositório):

| Nome           | Valor                                              |
| -------------- | -------------------------------------------------- |
| `EC2_HOST`     | IPv4 público da instância                          |
| `EC2_USER`     | `ec2-user`                                         |
| `EC2_SSH_KEY`  | conteúdo do `.pem`                                 |
| `DATABASE_URL` | `postgres://fresh:fresh@localhost:5433/fresh_quiz` |

Não há variables obrigatórias; o diretório de deploy é fixo em `/opt/fresh/app`.

O secret opcional `EC2_SSH_HOST_FINGERPRINT` ativa a verificação da chave do
host SSH. Gere o valor com:

```bash
ssh-keyscan -t ed25519 <IP_PUBLICO> 2>/dev/null | ssh-keygen -lf -
```

e cadastre o `SHA256:...` retornado. Sem ele, os workflows confiam no
`ssh-keyscan` (TOFU), como antes. Se a instância for recriada, o fingerprint
muda e o deploy passa a falhar até o secret ser atualizado.

## 8. Database

_Actions → Database → Run workflow_, digitando `RESET` na confirmação. O
workflow:

1. Envia o `docker-compose.yml` e `db/` para a instância.
2. Roda `docker compose down -v` (remove container **e volume**) e
   `docker compose up -d --wait --wait-timeout 60`, recriando o Postgres do
   zero.
3. No init do container, `db/init/01-setup.sh` aplica todas as migrações de
   `db/migrations/` e o seed de `db/seed/`.
4. Reinicia o serviço (sem validar `/health`, que depende da versão da app).

Os passos 2 e 4 vêm de `deploy/scripts/reset-db.sh`, executado no servidor via
`bash -s` — o arquivo não é copiado, é lido pelo runner.

Isso **apaga todos os dados**. Use para provisionar do zero ou recomeçar uma
demonstração.

## 9. App

_Actions → App → Run workflow_, escolhendo o branch. É manual — não há deploy
automático por push. O workflow:

1. Roda `deno check`, testes e build; valida as migrações contra um Postgres de
   CI.
2. Envia só o código (`_fresh/`), o `deploy/` e o `.env` (com permissão `600`),
   reinicia o serviço e faz health check em `/health`. Se falhar, restaura a
   release anterior e reinicia, falhando o job.

O restart, o health check e o rollback vêm de `deploy/scripts/deploy-app.sh`,
executado no servidor via `bash -s`. Os scripts são validados por `shellcheck` e
os workflows por `actionlint` no workflow **CI**, disparado em push para `main`
e em pull requests.

O App não executa SQL. Reiniciar derruba as partidas em andamento (estado
efêmero), mas não altera o banco nem os dados do quiz.

## 10. Verificação

```bash
systemctl status fresh --no-pager
curl -I http://localhost:8000/health
docker compose -f /opt/fresh/app/docker-compose.yml ps
journalctl -u fresh -n 50 --no-pager
```

`active (running)` e `HTTP/1.1 200` indicam que o app está no ar; acesse
`http://<IP>:8000`.
