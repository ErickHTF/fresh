# Deploy na EC2 — Setup

Instância Amazon Linux (`ec2-user`). Dois ambientes na mesma instância,
compartilhando o mesmo banco:

| Ambiente | Diretório            | Porta | Serviço     |
| -------- | -------------------- | ----- | ----------- |
| prod     | `/opt/fresh/app`     | 8000  | `fresh`     |
| dev      | `/opt/fresh/app-dev` | 8001  | `fresh-dev` |

O Postgres roda em Docker Compose (container único, banco `fresh_quiz`) e é
compartilhado pelos dois ambientes. A operação é feita por dois workflows
independentes:

- **App**: publica o código em `dev` ou `prod`. Nunca toca no banco.
- **Database**: destrói e recria o container do Postgres (schema + seed).

## 1. Security Group

Libere entrada nas portas `8000` (prod) e `8001` (dev) e **não** exponha a porta
do Postgres publicamente.

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

Os workflows reiniciam os serviços via `sudo systemctl restart`; libere só esses
comandos sem senha.

```bash
sudo mkdir -p /opt/fresh/app /opt/fresh/app-dev
sudo chown -R ec2-user:ec2-user /opt/fresh

echo "ec2-user ALL=(ALL) NOPASSWD: /bin/systemctl restart fresh, /bin/systemctl restart fresh-dev" | sudo tee /etc/sudoers.d/fresh >/dev/null
sudo chmod 440 /etc/sudoers.d/fresh
```

## 6. Units do systemd

Os arquivos estão versionados em `deploy/fresh.service` e
`deploy/fresh-dev.service` e são enviados a cada deploy para `$APP_DIR/deploy/`.
Na primeira vez, instale os dois:

```bash
sudo cp /opt/fresh/app/deploy/fresh.service /etc/systemd/system/fresh.service
sudo cp /opt/fresh/app/deploy/fresh-dev.service /etc/systemd/system/fresh-dev.service
sudo systemctl daemon-reload
sudo systemctl enable fresh fresh-dev
```

Sempre que os units mudarem no repositório, repita o `cp` + `daemon-reload`.

Cada serviço lê o `DATABASE_URL` do respectivo `.env`, escrito pelo App a cada
publicação; não crie manualmente.

## 7. Secrets do GitHub

Em _Settings → Secrets and variables → Actions_ (nível do repositório):

| Nome           | Valor                                              |
| -------------- | -------------------------------------------------- |
| `EC2_HOST`     | IPv4 público da instância                          |
| `EC2_USER`     | `ec2-user`                                         |
| `EC2_SSH_KEY`  | conteúdo do `.pem`                                 |
| `DATABASE_URL` | `postgres://fresh:fresh@localhost:5433/fresh_quiz` |

Variables opcionais (nível do repositório): `APP_DIR_PROD` (padrão
`/opt/fresh/app`) e `APP_DIR_DEV` (padrão `/opt/fresh/app-dev`).

## 8. Database

_Actions → Database → Run workflow_, digitando `RESET` na confirmação. O
workflow:

1. Envia o `docker-compose.yml` e `db/` para a instância.
2. Roda `docker compose down -v` (remove container **e volume**) e
   `docker compose up -d`, recriando o Postgres do zero.
3. No init do container, `db/init/01-setup.sh` aplica todas as migrações de
   `db/migrations/` e o seed de `db/seed/`.
4. Reinicia os serviços (sem validar `/health`, que depende da versão da app).

Isso **apaga todos os dados** e afeta os dois ambientes, pois o banco é único.
Use para provisionar do zero ou recomeçar uma demonstração.

## 9. App

_Actions → App → Run workflow_, escolhendo o branch e o ambiente (`dev` ou
`prod`). Ambos são manuais — não há deploy automático por push. O workflow:

1. Roda `deno check`, testes e build; valida as migrações contra um Postgres de
   CI.
2. Envia só o código (`_fresh/`) e o `.env`, reinicia o serviço e faz health
   check em `/health`. Se falhar, restaura a release anterior e reinicia,
   falhando o job.

O App não executa SQL. Reiniciar derruba as partidas em andamento (estado
efêmero), mas não altera o banco nem os dados do quiz.

## 10. Verificação

```bash
systemctl status fresh fresh-dev --no-pager
curl -I http://localhost:8000/health
curl -I http://localhost:8001/health
docker compose -f /opt/fresh/app/docker-compose.yml ps
journalctl -u fresh -n 50 --no-pager
journalctl -u fresh-dev -n 50 --no-pager
```

`active (running)` e `HTTP/1.1 200` indicam que os apps estão no ar; em
produção, acesse `http://<IP>:8000` (prod) e `http://<IP>:8001` (dev).
