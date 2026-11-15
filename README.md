# GlucoGuard

**AI-Powered Continuous Glucose Monitoring & Intelligent Emergency Response System**

> ⚠️ **MANDATORY HEALTHCARE SIMULATION NOTICE**  
> GlucoGuard is a software-based healthcare simulation prototype and final-year engineering project. It is **NOT** a clinical medical device. All glucose telemetry is generated synthetically by the Virtual CGM Simulator (`"source": "simulation"`). The system does not measure live human physiology, does not prescribe insulin or medication dosages, does not provide clinical diagnostic confirmation of unconsciousness, and does not dispatch real-world emergency services (911/112).

---

## 1. System Overview

GlucoGuard demonstrates an intelligent closed-loop diabetes management platform:
1. **Virtual CGM Simulator (`apps/api/src/simulator`)**: Emulates continuous interstitial glucose dynamics across normal, post-meal, hypoglycemic, and hyperglycemic conditions.
2. **Backend API (`apps/api`)**: Node.js and Express ingestion pipeline with Mongoose schemas and Socket.IO real-time data broadcasting.
3. **AI Intelligence Engine (`services/ai-engine`)**: Python FastAPI microservice providing rate-of-change analysis, short-term trajectory forecasting, and anomaly detection.
4. **Patient Dashboard (`apps/web`)**: Next.js App Router (JavaScript/JSX) real-time interface with live glucose curves, Time-in-Range (TIR) metrics, and simulation controls.
5. **Emergency Escalation Engine**: Automated two-stage patient acknowledgment timer, caregiver escalation alerts, and simulated SOS dispatch with interactive map visualization.
6. **Caregiver & Doctor Portal**: Role-based access control (RBAC) supporting multi-patient oversight and AGP clinical reports.

---

## 2. Monorepo Repository Structure

```text
final-prj/
├── apps/
│   ├── web/                     # Next.js Frontend (Patient & Clinical Dashboards)
│   └── api/                     # Node.js + Express + Socket.IO Backend API
├── services/
│   └── ai-engine/               # FastAPI + Scikit-learn AI Microservice
├── docs/                        # Specifications, Tasks, ADRs, Review Logs
├── infrastructure/              # Docker Compose & deployment templates
├── .gitignore                   # Global ignore patterns
├── package.json                 # Root npm workspace configuration
└── README.md                    # Root project onboarding guide
```

---

## 3. Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Python**: 3.10+ (with `venv` and `pip`)
- **MongoDB**: Local instance or MongoDB Atlas URI (optional for initial mocks)

### Setup & Installation

1. **Install Node.js dependencies across workspaces:**
   ```bash
   npm install
   ```

2. **Setup AI Engine Python virtual environment:**
   ```bash
   cd services/ai-engine
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env` in `apps/api`, `apps/web`, and `services/ai-engine`.

4. **Run Unit Tests:**
   ```bash
   npm test
   ```

5. **Start Development Servers:**
   - Backend API: `npm run dev:api` (Runs on `http://localhost:5000`)
   - AI Engine: `cd services/ai-engine && uvicorn main:app --reload --port 8000` (Runs on `http://localhost:8000`)
   - Web Frontend: `npm run dev:web` (Runs on `http://localhost:3000`)

---

## 4. Governance & Architecture Protocols

See [`AGENTS.md`](./AGENTS.md) and [`docs/PROJECT_MASTER_PLAN.md`](./docs/PROJECT_MASTER_PLAN.md) for agent collaboration boundaries, clinical safety protocols, and module specifications.

