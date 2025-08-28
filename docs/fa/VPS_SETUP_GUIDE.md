# راهنمای راه‌اندازی VPS برای SystemUpdate

## مشخصات پیشنهادی
- Ubuntu 22.04، 2vCPU/4GB RAM (حداقل)

## آماده‌سازی سرور
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git vim htop nginx certbot python3-certbot-nginx
```

## Docker و Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## دامنه و SSL
- رکوردهای DNS: @/www/api → IP سرور
- صدور TLS با Certbot و پیکربندی Nginx برای proxy به frontend/backend
