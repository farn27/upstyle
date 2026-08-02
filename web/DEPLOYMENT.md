# Bizgrow — Deployment Guide

Panduan lengkap deploy Bizgrow ke production menggunakan Docker.

---

## Prasyarat

- VPS Linux (Ubuntu 22.04 / Debian 12 recommended) — min 2 vCPU, 4 GB RAM
- Docker + Docker Compose v2
- Domain + SSL certificate (Let's Encrypt)
- MySQL 8+ atau layanan cloud (PlanetScale / TiDB Cloud / Railway)
- Upstash Redis account (free tier cukup)

---

## Quick Start (VPS)

### 1. Install Docker di VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 2. Clone project ke VPS

```bash
sudo mkdir -p /opt/bizgrow
sudo chown $USER:$USER /opt/bizgrow
cd /opt/bizgrow
git clone https://github.com/YOUR_ORG/bizgrow.git .
cd web
```

### 3. Setup environment

```bash
cp .env.example .env
nano .env   # Isi semua variabel yang wajib
```

Variabel **wajib** di production:
```env
ORIGIN=https://app.bizgrow.id
DATABASE_URL=mysql://user:pass@mysql:3306/finance_engine_db
AUTH_SECRET=<random 32 char>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
GROQ_API_KEY=gsk_...
CSRF_SECRET=<random 32 char>
ENCRYPTION_KEY=<random 64 char hex>
SOCKET_API_KEY=<random 32 char>
```

### 4. Setup SSL certificate

```bash
# Install certbot
sudo apt install certbot -y

# Generate certificate (ganti dengan domain kamu)
sudo certbot certonly --standalone -d app.bizgrow.id

# Copy ke docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/app.bizgrow.id/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/app.bizgrow.id/privkey.pem docker/nginx/ssl/

# Auto-renew (cron)
echo "0 12 * * * certbot renew --quiet && docker exec bizgrow_nginx nginx -s reload" | sudo crontab -
```

### 5. Update nginx domain

```bash
# Edit docker/nginx/nginx.conf
# Ganti: server_name bizgrow.id app.bizgrow.id;
# Dengan domain kamu
```

### 6. Start semua services

```bash
# Build dan start
make prod

# Atau manual:
docker compose up -d --build

# Check status
make health
```

### 7. Jalankan database migration

```bash
# Pertama kali — push schema ke MySQL
make migrate

# Jika butuh migration business_plans
make migrate-bp
```

---

## Arsitektur Deployment

```
Internet
    │
    ▼
[Nginx :80/:443]  ← SSL termination, rate limiting
    │
    ├──► [SvelteKit App :3000]  ← Web + API
    │
    └──► [Socket.io Server :13337/:13338]  ← Realtime events
         
[MySQL :3306]  ← Database (internal network only)
[Upstash Redis]  ← Session, cache, rate limit (external)
```

---

## Commands

```bash
# Start production
make prod

# Start development (dengan hot reload)
make dev

# Stop semua
make stop

# Lihat logs
make logs
make logs-app
make logs-socket

# Masuk ke container
make shell

# Database
make migrate
make db-backup

# Health check
make health

# Cleanup (hati-hati! menghapus semua data)
make clean
```

---

## Auto Deploy (CI/CD)

Setiap push ke branch `main` akan otomatis:
1. Run lint + type check
2. Build Docker images
3. Push ke GitHub Container Registry
4. SSH ke VPS dan rolling update

### Setup GitHub Secrets

Di GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `SSH_HOST` | IP VPS kamu |
| `SSH_USER` | User SSH (misal: `ubuntu`) |
| `SSH_PRIVATE_KEY` | Private key SSH |
| `SSH_PORT` | Port SSH (default: `22`) |

### Setup VPS untuk CI/CD

```bash
# Di VPS, pastikan direktori ada
sudo mkdir -p /opt/bizgrow/web
sudo chown $USER:$USER /opt/bizgrow

# Login ke GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Buat docker-compose.yml di VPS (atau git pull)
# File .env sudah ada di VPS (tidak di git)
```

---

## Scaling

### Scale app horizontally

```bash
# Jalankan 3 instance app
docker compose up -d --scale app=3
```

Pastikan Nginx sudah dikonfigurasi dengan `upstream` multiple servers.

### Scale socket horizontally

Socket.io butuh **sticky sessions** (ip_hash di nginx sudah dikonfigurasi).
Untuk multi-server Socket.io, perlu Redis adapter (sudah disiapkan di kode).

---

## Backup

### Database backup otomatis

```bash
# Buat cron backup harian (di VPS)
echo "0 2 * * * cd /opt/bizgrow/web && make db-backup" | crontab -

# Backup disimpan di direktori project dengan nama backup_YYYYMMDD_HHMMSS.sql
```

### Restore backup

```bash
docker exec -i bizgrow_mysql mysql -u root -p finance_engine_db < backup_20260801_020000.sql
```

---

## Monitoring

### Check logs real-time

```bash
# Semua service
docker compose logs -f

# Per service
docker compose logs -f app
docker compose logs -f socket
docker compose logs -f mysql
docker compose logs -f nginx
```

### Health endpoints

```bash
# App health
curl http://localhost:3000/health

# Socket health
curl http://localhost:13338/health
```

---

## Troubleshooting

### Container tidak bisa start

```bash
docker compose logs app       # Lihat error
docker inspect bizgrow_app    # Detail container
```

### Database connection error

```bash
# Cek MySQL running
docker compose ps mysql

# Cek connection dari app container
docker exec bizgrow_app sh -c "wget -qO- http://mysql:3306 2>&1"
```

### Socket.io tidak konek

```bash
# Cek port terbuka
docker compose ps socket

# Test health API
curl http://localhost:13338/health
```

### Permission denied di uploads

```bash
docker exec bizgrow_app sh -c "chmod 755 /app/build/uploads"
```

---

## Production Checklist

Sebelum go-live:

- [ ] `NODE_ENV=production` di .env
- [ ] `ORIGIN` diset ke domain HTTPS
- [ ] SSL certificate terpasang
- [ ] `AUTH_SECRET` dan `CSRF_SECRET` sudah random string kuat
- [ ] `ENCRYPTION_KEY` sudah di-set dan di-backup dengan aman
- [ ] MySQL password sudah diganti dari default
- [ ] `DB_LOGGER=false`
- [ ] Rate limiting sudah dikonfigurasi di nginx
- [ ] Backup database sudah berjalan
- [ ] Health check endpoint merespons
- [ ] Domain DNS sudah pointing ke VPS
- [ ] Firewall: hanya port 80, 443, 22 yang terbuka ke publik
