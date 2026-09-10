# Deploy na EC2 — Setup

Instância Amazon Linux (`ec2-user`). App em `/opt/fresh/app`, servido pelo
`systemd` na porta 8000, Postgres via Docker Compose na mesma instância.

## 1. Security Group

Regras de **entrada**:

| Tipo              | Porta | Origem                  | Observação                     |
| ----------------- | ----- | ----------------------- | ------------------------------ |
| TCP personalizado | 8000  | `0.0.0.0/0`             | app (acesso direto)            |
| SSH               | 22    | `0.0.0.0/0` (ou seu IP) | acesso do deploy/administração |
| HTTP              | 80    | `0.0.0.0/0`             | opcional, com Nginx/Caddy      |
| HTTPS             | 443   | `0.0.0.0/0`             | opcional, com Nginx/Caddy      |

A **8000** expõe o app direto (`http://<IP>:8000`). Com proxy reverso, troque-a
por 80/443 e mantenha a 8000 acessível apenas localmente.

Regra de **saída**: `Todos` para `0.0.0.0/0`.

Remova qualquer regra que exponha a **5432** (Postgres) para `0.0.0.0/0`; o
banco só precisa ser acessível de dentro da instância.

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

## 5. Pasta do app e sudoers

O workflow reinicia o serviço via `sudo systemctl restart fresh`; libere só esse
comando sem senha.

```bash
sudo mkdir -p /opt/fresh/app
sudo chown ec2-user:ec2-user /opt/fresh/app

echo "ec2-user ALL=(ALL) NOPASSWD: /bin/systemctl restart fresh" | sudo tee /etc/sudoers.d/fresh >/dev/null
sudo chmod 440 /etc/sudoers.d/fresh
```

## 6. Unit do systemd

```bash
sudo tee /etc/systemd/system/fresh.service >/dev/null <<'EOF'
[Unit]
Description=Fresh Quiz
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/fresh/app
EnvironmentFile=/opt/fresh/app/.env
ExecStart=/usr/local/bin/deno serve -A --host 0.0.0.0 --port 8000 _fresh/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable fresh
```

O `.env` (com `DATABASE_URL`) é escrito pelo workflow a cada deploy; não crie
manualmente.

## 7. Secrets do GitHub

Em _Settings → Secrets and variables → Actions_:

| Nome           | Valor                                              |
| -------------- | -------------------------------------------------- |
| `EC2_HOST`     | IPv4 público da instância                          |
| `EC2_USER`     | `ec2-user`                                         |
| `EC2_SSH_KEY`  | conteúdo do `.pem`                                 |
| `DATABASE_URL` | `postgres://fresh:fresh@localhost:5433/fresh_quiz` |

Variable opcional: `APP_DIR` (padrão `/opt/fresh/app`).

## 8. Deploy

_Actions → Deploy → Run workflow_. O job builda, envia `_fresh/`, `db/` e
`docker-compose.yml`, aplica as migrações idempotentes e reinicia o serviço.

## 9. Verificação

```bash
systemctl status fresh --no-pager
curl -I http://localhost:8000
journalctl -u fresh -n 50 --no-pager
```

`active (running)` e `HTTP/1.1 200` indicam que o app está no ar; em produção,
acesse `http://<IP>:8000`.
