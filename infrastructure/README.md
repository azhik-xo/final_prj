# GlucoGuard Infrastructure & Deployment

This directory contains container definitions and orchestration configurations for the GlucoGuard platform.

## Services
- `mongo`: MongoDB 7.0 database service for glucose readings and patient history.
- `api`: Node.js Express backend API (`apps/api`).
- `ai-engine`: Python FastAPI microservice (`services/ai-engine`).
- `web`: Next.js web application (`apps/web`).

## Running with Docker Compose
```bash
docker compose up -d
```

