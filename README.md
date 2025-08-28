# ðŸŒ SystemUpdate Web Dashboard

> IMPORTANT: This legacy Flask + React dashboard is deprecated.
>
> - Active web implementation lives at `SystemUpdate/systemupdate-web/` (FastAPI microservices + Kong gateway).
> - Use docs there: `systemupdate-web/docs/SYSTEMUPDATE_WEB_ARCHITECTURE.md` and `systemupdate-web/docs/ROADMAP.md`.
> - Gateway is Kong (DB-less). Any Traefik mentions below are legacy and should be ignored.

## ðŸ“‹ Ø®Ù„Ø§ØµÙ‡ Ù¾Ø±ÙˆÚ˜Ù‡

SystemUpdate Web Dashboard ÛŒÚ© Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø­Ø±ÙÙ‡â€ŒØ§ÛŒ Ùˆ real-time Ø¨Ø±Ø§ÛŒ Ú©Ù†ØªØ±Ù„ Ùˆ monitoring Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø§Ù†Ø¯Ø±ÙˆÛŒØ¯ Ø§Ø³Øª. Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡ Ø´Ø§Ù…Ù„ Backend Ø¨Ø§ Flask Ùˆ Frontend Ø¨Ø§ React Ø§Ø³Øª.

---

## ðŸ—ï¸ Ù…Ø¹Ù…Ø§Ø±ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡

```text
SystemUpdate-Web/
â”œâ”€â”€ backend/                 # Flask Backend
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ __init__.py      # Flask app factory
â”‚   â”‚   â”œâ”€â”€ models/          # Database models
â”‚   â”‚   â”œâ”€â”€ routes/          # API endpoints
â”‚   â”‚   â”œâ”€â”€ services/        # Business logic
â”‚   â”‚   â””â”€â”€ utils/           # Helper functions
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â”œâ”€â”€ gunicorn.conf.py
â”‚   â””â”€â”€ run.py
â”œâ”€â”€ frontend/                # React Frontend
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/      # React components
â”‚   â”‚   â”œâ”€â”€ pages/           # Dashboard pages
â”‚   â”‚   â”œâ”€â”€ hooks/           # Custom hooks
â”‚   â”‚   â”œâ”€â”€ services/        # API calls
â”‚   â”‚   â””â”€â”€ utils/           # Helper functions
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ public/
â”œâ”€â”€ database/                # Database migrations
â”œâ”€â”€ logs/                    # Application logs
â””â”€â”€ backups/                 # Backup files
```

---

## ðŸš€ Ø±Ø§Ù‡â€ŒØ§Ù†Ø¯Ø§Ø²ÛŒ Ø³Ø±ÛŒØ¹

### **Backend Setup:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### **Frontend Setup:**

```bash
cd frontend
npm install
npm start
```

---

## ðŸ”§ ÙˆÛŒÚ˜Ú¯ÛŒâ€ŒÙ‡Ø§ÛŒ Ú©Ù„ÛŒØ¯ÛŒ

### **Backend Features:**

```markdown
- âœ… Flask API Ø¨Ø§ WebSocket support
- âœ… PostgreSQL database
- âœ… Redis caching
- âœ… JWT authentication
- âœ… Real-time device monitoring
- âœ… Data encryption/decryption
- âœ… Command execution
- âœ… Analytics and reporting
```

### **Frontend Features:**

```markdown
- âœ… React + TypeScript
- âœ… Material-UI components
- âœ… Real-time updates
- âœ… Device management
- âœ… Data visualization
- âœ… Command interface
- âœ… Analytics dashboard
```

---

## ðŸ“Š API Endpoints

### **Authentication:**

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
```

### **Devices:**

```text
GET    /api/devices              # Ø¯Ø±ÛŒØ§ÙØª Ù„ÛŒØ³Øª Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§
GET    /api/device/<id>          # Ø¯Ø±ÛŒØ§ÙØª Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø³ØªÚ¯Ø§Ù‡
POST   /api/device/<id>/command  # Ø§Ø±Ø³Ø§Ù„ Ø¯Ø³ØªÙˆØ± Ø¨Ù‡ Ø¯Ø³ØªÚ¯Ø§Ù‡
GET    /api/device/<id>/data     # Ø¯Ø±ÛŒØ§ÙØª Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ø¯Ø³ØªÚ¯Ø§Ù‡
```

### **Analytics:**

```text
GET    /api/analytics/overview   # Ø®Ù„Ø§ØµÙ‡ ØªØ­Ù„ÛŒÙ„ÛŒ
GET    /api/analytics/devices    # Ø¢Ù…Ø§Ø± Ø¯Ø³ØªÚ¯Ø§Ù‡â€ŒÙ‡Ø§
GET    /api/analytics/security   # Ú¯Ø²Ø§Ø±Ø´â€ŒÙ‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ
```

### **WebSocket Events:**

```text
device_connected                 # Ø§ØªØµØ§Ù„ Ø¯Ø³ØªÚ¯Ø§Ù‡ Ø¬Ø¯ÛŒØ¯
data_received                   # Ø¯Ø±ÛŒØ§ÙØª Ø¯Ø§Ø¯Ù‡ Ø¬Ø¯ÛŒØ¯
command_result                  # Ù†ØªÛŒØ¬Ù‡ Ø§Ø¬Ø±Ø§ÛŒ Ø¯Ø³ØªÙˆØ±
device_update                   # Ø¨Ø±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ ÙˆØ¶Ø¹ÛŒØª Ø¯Ø³ØªÚ¯Ø§Ù‡
```

---

## ðŸ”’ Ø§Ù…Ù†ÛŒØª

- âœ… JWT authentication
- âœ… HTTPS/SSL
- âœ… Data encryption
- âœ… Rate limiting
- âœ… Input validation
- âœ… SQL injection protection
- âœ… XSS protection

---

## ðŸ“ˆ Performance

- âœ… Redis caching
- âœ… Database optimization
- âœ… Connection pooling
- âœ… Async operations
- âœ… Real-time updates
- âœ… Efficient data transfer

---

## ðŸ§ª ØªØ³Øªâ€ŒÙ‡Ø§

### **Backend Tests:**

```bash
cd backend
python -m pytest tests/
```

### **Frontend Tests:**

```bash
cd frontend
npm test
```

---

## ðŸš€ Deployment

### **Production Setup:**

```bash
# Backend
gunicorn -c gunicorn.conf.py run:app

# Frontend
npm run build
```

### **Docker:**

```bash
docker-compose up -d
```

---

## ðŸ“š Ù…Ø³ØªÙ†Ø¯Ø§Øª

- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Security Guide](docs/SECURITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

**ðŸŽ¯ Ù¾Ø±ÙˆÚ˜Ù‡ Ø¢Ù…Ø§Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ development Ùˆ production deployment!**

