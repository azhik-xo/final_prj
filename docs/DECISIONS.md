# GlucoGuard — Architectural Decision Records (ADRs)

This document formalizes the key architectural, technical, and safety decisions adopted for GlucoGuard.

---

## Index of Decisions

- [ADR-001: Monorepo Structure and Directory Organization](#adr-001-monorepo-structure-and-directory-organization)
- [ADR-002: Virtual CGM Simulator Architecture and Transport Boundary](#adr-002-virtual-cgm-simulator-architecture-and-transport-boundary)
- [ADR-003: Database Persistence and Time-Series Indexing Strategy](#adr-003-database-persistence-and-time-series-indexing-strategy)
- [ADR-004: Real-time Telemetry Push via Socket.IO](#adr-004-real-time-telemetry-push-via-socketio)
- [ADR-005: AI Service Decoupling and Baseline Modeling Strategy](#adr-005-ai-service-decoupling-and-baseline-modeling-strategy)
- [ADR-006: Emergency Response Two-Tier Escalation and SOS Simulation](#adr-006-emergency-response-two-tier-escalation-and-sos-simulation)
- [ADR-007: Clinical Safety Boundaries and Non-Device Disclaimer Policy](#adr-007-clinical-safety-boundaries-and-non-device-disclaimer-policy)
- [ADR-008: Senior & Geriatric Accessibility UX Protocol](#adr-008-senior--geriatric-accessibility-ux-protocol)

---

### ADR-001: Monorepo Structure and Directory Organization
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  The original implementation plan suggested top-level directories (`frontend/`, `backend/`, `ai-engine/`). Modern multi-service applications benefit from standard workspace management (`apps/` for deployable applications, `services/` for standalone microservices, and dedicated `docs/` and `infrastructure/` roots).
- **Decision:**  
  Adopt a unified Git monorepo structure:
  - `apps/web`: Next.js frontend with Tailwind CSS and Recharts.
  - `apps/api`: Node.js/Express backend handling ingestion, database access, business logic, and WebSockets.
  - `services/ai-engine`: Python/FastAPI microservice for ML analytics and forecasting.
  - `docs`: Governance, architectural specifications, task matrices, and review logs.
  - `infrastructure`: Docker Compose, deployment scripts, and environment variable templates.
  - `.github/workflows`: Automated testing and linting CI pipelines.
- **Trade-offs:**  
  *Pros:* Clean domain separation, synchronized versioning across apps, shared TypeScript/JavaScript contracts where applicable.  
  *Cons:* Requires workspace tooling configuration at the root level.

---

### ADR-002: Virtual CGM Simulator Architecture and Transport Boundary
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  The Virtual CGM Simulator (M1) must generate realistic telemetry without requiring physical hardware, but must be architected such that a real physical CGM hardware integration could replace it seamlessly in the future.
- **Decision:**  
  Implement the simulator logic in `apps/api/src/simulator/` as a modular engine with two operational modes:
  1. *Standalone Runner:* Can run as a separate Node.js process / CLI sending HTTP POST requests to `/api/v1/cgm/readings`.
  2. *API-Integrated Worker:* Can be toggled, configured, and controlled directly via administrative/developer endpoints (`/api/v1/simulator/start`, `/pause`, `/inject-scenario`).
  In all cases, readings must pass through the identical ingestion API contract used by actual CGM devices and include `"source": "simulation"`.
- **Trade-offs:**  
  *Pros:* Perfectly mimics real device hardware networking behavior; zero coupling between the generation math and the storage logic.  
  *Cons:* Minor network overhead when simulator runs against local REST endpoints.

---

### ADR-003: Database Persistence and Time-Series Indexing Strategy
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  Continuous glucose telemetry generates high-frequency sequential timestamped records. Fast range queries (e.g. past 24 hours, time-in-range aggregates) are critical for both the live dashboard and AI model ingestion.
- **Decision:**  
  Use MongoDB with Mongoose ODM. Schema for `GlucoseReadings` will implement compound indexing on `{ deviceId: 1, timestamp: -1 }` and `{ userId: 1, timestamp: -1 }`. Readings older than configured retention limits can utilize MongoDB TTL or time-series bucket patterns.
- **Trade-offs:**  
  *Pros:* Schema flexibility for dietary and activity metadata; native JSON support; high write throughput.  
  *Cons:* Requires disciplined indexing to prevent performance degradation on large historical datasets.

---

### ADR-004: Real-time Telemetry Push via Socket.IO
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  The patient dashboard and caregiver portal require instant updates when new readings arrive or critical events occur. Polling creates unnecessary server load and introduces unacceptable latency for emergency alerts.
- **Decision:**  
  Implement Socket.IO on `apps/api` with authenticated room-based subscriptions (`patient:<userId>` and `device:<deviceId>`). The dashboard connects upon mount and updates live charts without page refreshes.
- **Trade-offs:**  
  *Pros:* Bi-directional, low-latency, built-in reconnection and fallback mechanisms.  
  *Cons:* Requires stateful connection management on the backend.

---

### ADR-005: AI Service Decoupling and Baseline Modeling Strategy
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  Glucose prediction and anomaly detection require scientific computing packages (Pandas, NumPy, Scikit-learn). Jumping directly into complex recurrent neural networks (e.g. LSTM/Transformers) without benchmarks creates debugging overhead and opaque predictions.
- **Decision:**  
  Host the AI engine as an isolated FastAPI microservice (`services/ai-engine`). All ML experiments must follow a benchmark-first strategy:
  1. Establish deterministic rule-based and linear/ridge regression baselines.
  2. Progress to ensemble methods (Random Forest, XGBoost) and Isolation Forest for anomaly detection.
  3. Enforce strict temporal train/test splits (no lookahead data leakage).
  4. Track and log MAE and RMSE metrics for all regression models.
- **Trade-offs:**  
  *Pros:* Fast development, transparent model explainability, microservice isolation.  
  *Cons:* Requires inter-service HTTP communication between Node.js and Python.

---

### ADR-006: Emergency Response Two-Tier Escalation and SOS Simulation
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  Critical hypoglycemia (<54 mg/dL) or rapid decline (<-2.5 mg/dL/min) requires rapid intervention. However, unnecessary caregiver panics and false emergency dispatches must be prevented.
- **Decision:**  
  Implement a strict two-stage escalation workflow:
  1. *Stage 1 (Patient Local Alert):* Immediate audio-visual modal warning on the patient dashboard with a 60-second countdown acknowledgment timer.
  2. *Stage 2 (Caregiver Notification & SOS Simulation):* If unacknowledged within 60 seconds, dispatch push notification to registered caregivers. Concurrently trigger a simulated SOS dispatch screen displaying simulated GPS coordinates via Google Maps API.
  **Safety Invariant:** The SOS dispatch is 100% simulated (logged to database and visualized in UI); it will never trigger physical emergency calls. Unresponsiveness must not be diagnosed as unconsciousness.
- **Trade-offs:**  
  *Pros:* Realistic demonstration of emergency protocols with zero legal or clinical hazard.  
  *Cons:* Simulated behavior must be prominently stated to prevent user confusion.

---

### ADR-007: Clinical Safety Boundaries and Non-Device Disclaimer Policy
- **Status:** **APPROVED**
- **Date:** 2026-11-15
- **Context:**  
  As a software-based healthcare simulation prototype for an academic engineering degree, strict boundaries are required to avoid misrepresentation as a certified medical device.
- **Decision:**  
  1. Every API response containing simulated data must include `"source": "simulation"` and an HTTP response header `X-GlucoGuard-Disclaimer: Simulation-Only`.
  2. Every frontend view must feature a persistent, non-dismissible banner: *"SIMULATION ONLY — NOT A CLINICAL MEDICAL DEVICE"*.
  3. System recommendations (Diet & Workout) must include safety guardrails (exercise lockouts for glucose <90 mg/dL or >250 mg/dL) and advisory text to consult healthcare professionals.
  4. Under no circumstances will the system compute or recommend insulin dosages or medication adjustments.
- **Trade-offs:**  
  *Pros:* Absolute ethical, legal, and academic safety compliance.  
  *Cons:* Explicitly limits scope to simulation and educational demonstration.

---

### ADR-008: Senior & Geriatric Accessibility UX Protocol
- **Status:** **APPROVED**
- **Date:** 2026-11-18
- **Context:**  
  Continuous glucose monitoring dashboards designed for clinicians or younger tech-literate patients contain complex time-series coordinate charts, calculus velocity notation ($dG/dt$), and multi-step regression statistics ($R^2$, MAE, RMSE). Geriatric and visually impaired patients face significant cognitive and sensory barriers interpreting these numbers, potentially leading to anxiety or missed critical glycemic events.
- **Decision:**  
  Introduce a first-class, accessible **Senior / Easy-Care Mode** on the Patient Dashboard:
  1. *Dual Display Modality:* Persistent, high-contrast toggle between **Clinical View** (full telemetry graphs, multi-horizon AI CI bounds, velocity) and **Senior View** (simplified, plain language, giant typography).
  2. *Plain-Language Translations:* Convert rate of change and category codes into unambiguous, reassuring vernacular (e.g. *"Sugar is steady & safe"*, *"Sugar dropping quickly — have juice now"*).
  3. *Giant High-Contrast Typography:* Primary interstitial reading displayed in 72px+ bold font with WCAG AAA compliant contrast ratios.
  4. *Visual Traffic Light Gauge:* Replace coordinate graphs with a 3-zone color-coded status bar (Red: Too Low, Green: Safe Zone, Amber: Too High) and an intuitive pointer.
  5. *Audio Readout (Text-to-Speech):* Integrated browser Web Speech API (`speechSynthesis`) allowing one-touch audio narration of glucose status and immediate instructions.
  6. *Immediate Actionable Checklist ("What Should I Do Right Now?"):* Clear 3-step numbered guidance tailored to the patient's current glycemic status.
  7. *One-Touch Caregiver SOS / Help Call:* Clear simulated emergency contact action card.
  8. *Visual Design Rule:* Strictly use Lucide React icons, zero emojis, clean clinical SaaS layout.
- **Trade-offs:**  
  *Pros:* Significantly enhances digital inclusion, reduces patient cognitive strain, and provides life-saving clarity for elder users.  
  *Cons:* Requires maintaining two complementary layout templates in the frontend.

