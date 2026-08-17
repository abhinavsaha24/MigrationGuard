# MigrationGuard — Production Deployment Runbook

This guide covers the deployment of MigrationGuard onto a clean Ubuntu VPS.

## 1. VPS Requirements

- **OS**: Ubuntu 22.04 or 24.04 LTS
- **RAM**: Minimum 4GB (8GB recommended for database-heavy execution)
- **CPU**: 2+ cores
- **Disk**: 40GB+ NVMe/SSD

## 2. Ubuntu Setup & SSH Hardening

Update the system and secure SSH:

```bash
apt-get update && apt-get upgrade -y
# Disable password authentication
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

## 3. UFW Firewall Configuration

Expose only HTTP, HTTPS, and SSH ports.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

_Note: PostgreSQL (5432) and MinIO (9000/9001) are intentionally kept closed._

## 4. Install Docker

Install Docker Engine and Docker Compose:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## 5. Clone Repository

```bash
git clone https://github.com/your-org/MigrationGuard.git
cd MigrationGuard
```

## 6. Configure .env

Copy the example file and inject your secure secrets:

```bash
cp .env.example .env
nano .env
```

Ensure you generate strong random passwords for `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, and `JWT_SECRET`. Update `FRONTEND_ORIGIN` to your actual domain name.

## 7. DNS Configuration

Create `A` records in your DNS provider pointing to your VPS's public IP for:

- `@` (e.g. `example.com`)
- `www` (e.g. `www.example.com`)

## 8. Docker Compose Startup

Start the production stack. Docker will pull images, execute Prisma migrations, and start Fastify and Nginx automatically.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 9. Nginx Configuration & HTTPS

MigrationGuard's containerized Nginx is pre-configured to handle internal routing (`/api/` -> `backend:3000`). For HTTPS, it is strongly recommended to install Let's Encrypt (Certbot) directly on the host to act as the primary reverse proxy terminating TLS, and passing plain HTTP to the Docker container on port 80.

Install Certbot and Host Nginx:

```bash
apt-get install nginx certbot python3-certbot-nginx -y
```

Create `/etc/nginx/sites-available/migrationguard`:

```nginx
server {
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and acquire the certificate:

```bash
ln -s /etc/nginx/sites-available/migrationguard /etc/nginx/sites-enabled/
certbot --nginx -d example.com
```

## 10. PostgreSQL & MinIO Persistence

Both databases use Docker named volumes (`pgdata`, `miniodata`). These persist across container restarts. Do not use `docker compose down -v` on a production VPS unless you intend to destroy all data.

## 11. Backup Procedure

Set up a daily cron job to backup the PostgreSQL database via `pg_dump`:

```bash
#!/bin/bash
docker exec -t migrationguard-postgres-1 pg_dump -U your_db_user -d migrationguard_prod > /backups/mg_db_$(date +%F).sql
```

Add to crontab (`crontab -e`):

```cron
0 2 * * * /path/to/backup_script.sh
```

## 12. Restore Procedure

To restore a backup into a fresh database container:

```bash
cat /backups/mg_db_2024-01-01.sql | docker exec -i migrationguard-postgres-1 psql -U your_db_user -d migrationguard_prod
```

## 13. Health Checks & Verification

1. **Health Check**: Run `curl https://example.com/api/health` -> Expect `{"status":"ok","database":"connected"}`.
2. **Login**: Go to `https://example.com/login` and authenticate.
3. **Evidence Download**: Upload a presentation version and verify downloading works (checks backend S3 proxy).
4. **Run Verification**: Ensure background CLI worker logic properly executes within the backend constraints.

## 14. Security Verification

- Ensure `http://example.com:5432` times out (Postgres isolated).
- Ensure `http://example.com:9000` times out (MinIO isolated).
- Ensure `http://example.com:9001` times out (MinIO console isolated).

## 15. Rollback Procedure

If a deployment fails:

```bash
# Revert Git state
git checkout <previous_stable_hash>
# Rebuild containers
docker compose -f docker-compose.prod.yml up -d --build
```
