# Installation

Prereqs: Docker Desktop, Node 20+, Python 3.11+, Git.

1) Clone and env
```bash
git clone <repo>
cd SystemUpdate-Web
cp .env.example .env
```
2) Start stack
```bash
docker compose up -d
```
3) Frontend: http://localhost:3000
4) Backend health: http://localhost:5000/health

Windows setup details: ../WINDOWS_SETUP.md
