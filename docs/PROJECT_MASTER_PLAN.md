# GlucoGuard — Project Master Plan

**Full Project Title:** AI-Powered Continuous Glucose Monitoring & Intelligent Emergency Response System  
**Project Category:** Healthcare Simulation Software Prototype (Final-Year Engineering Project)  
**Supervisor / Lead Architect:** Supervisor AI  
**Authoritative Scope Source:** `docs/GlucoGuard_Implementation_Plan.md`  

---

## 1. Executive Summary & Project Vision

GlucoGuard is an end-to-end software simulation platform designed to demonstrate modern digital diabetes management, predictive AI analytics, and automated emergency escalation workflows without requiring physical medical hardware. 

The system creates a complete loop:
1. **Virtual CGM Simulator (M1)** produces realistic interstitial glucose telemetry.
2. **Data Pipeline (M2)** ingests, validates, and persists telemetry in MongoDB while broadcasting in real time via WebSockets.
3. **Real-time Patient Dashboard (M3)** renders live glucose curves, Time-in-Range (TIR) metrics, and status badges.
4. **AI Intelligence Engine (M4)** analyzes trends, detects anomalies, and forecasts short-term glucose trajectory.
5. **AI Diet Planner (M5)** and **AI Workout Planner (M6)** provide personalized lifestyle guidance with strict safety locks.
6. **Emergency Engine (M7)** detects critical hypoglycemic/hyperglycemic events, executes patient acknowledgment workflows, and escalates to caregivers and simulated SOS emergency dispatch.
7. **Caregiver & Doctor Portal (M8)** provides clinical oversight, multi-patient monitoring, and historical audit logs.

### Mandatory Prototype Disclaimers & Safety Rules
- **Educational Simulation Prototype:** All telemetry is computer-generated. No live patient data or physical sensor is used.
- **Explicit Data Tagging:** Every reading payload must include `"source": "simulation"`.
- **No Medical Prescriptions:** The software must NEVER calculate or recommend insulin doses, drug quantities, or titration advice.
- **Simulation of Critical Events:** Lack of patient acknowledgment must be treated strictly as an unacknowledged emergency simulation, never as clinical evidence of unconsciousness.
- **Simulated Emergency Response:** Ambulance dispatch and SOS calls are mocked simulations (log/webhook/map visualization). No real-world 911/emergency services are contacted.

---

## 2. System Architecture & High-Level Data Flow

```text
                               +-----------------------------+
                               |     M1: Virtual CGM         |
                               | (Scenario & Telemetry Engine)|
                               +--------------+--------------+
                                              |
                                              | HTTP POST /api/v1/cgm/readings
                                              v
                               +-----------------------------+
                               |     M2: Express.js API      |
                               | (Ingestion, Validation, Mongoose)
                               +-------+---------------+-----+
                                       |               |
               WebSocket (Socket.IO)   |               | REST / Batch Request
                                       v               v
               +-----------------------+--+         +--+------------------------+
               |  M3: Next.js Frontend    |         | M4: FastAPI AI Engine     |
               |  (Patient Live Dashboard)|         | (Scikit-Learn/Pandas/NumPy)|
               +--------------------------+         +--+------------------------+
                                       ^               |
                                       |               | Insights & Predictions
                                       +---------------+
                                       |
                   Critical Event Event Trigger
                                       v
               +----------------------------------+
               | M7: Emergency & Response Engine  |
               | (Patient Ack Timer -> Caregiver) |
               +-------+--------------------------+
                       |
                       +-------------------------------+
                       |                               |
                       v                               v
             +--------------------+          +--------------------+
             | M5/M6: Diet &      |          | M8: Caregiver &    |
             | Workout Planners   |          | Doctor Portal      |
             +--------------------+          +--------------------+
```

---

## 3. Detailed Module Specifications

### Module M1 — Virtual CGM Simulator
- **Purpose:** Emulate continuous interstitial glucose dynamics (ISF/plasma glucose lag, autoregressive drift, meal absorption, physical exercise drawdown, circadian cycles).
- **6 Virtual Patient Personas:**
  1. *VP-01: Healthy Individual (Non-Diabetic):* Tight glycemic regulation (80–110 mg/dL), swift post-meal recovery.
  2. *VP-02: Well-Managed Type 1:* Controlled baseline (100–140 mg/dL), moderate post-meal excursions (160–180 mg/dL).
  3. *VP-03: Brittle Type 1 (High Risk):* High glycemic variability (60–240 mg/dL), prone to rapid drops and nocturnal hypoglycemia (primary target for M7 emergency validation).
  4. *VP-04: Type 2 Diabetes (Insulin Resistant):* Elevated fasting levels (130–190 mg/dL), prolonged post-prandial plateau.
  5. *VP-05: Pre-Diabetes / Impaired Glucose Tolerance:* Normal fasting (100–120 mg/dL), prolonged spikes following high-carb intake.
  6. *VP-06: Active Athlete / Sports Profile:* Dynamic metabolic responsiveness (75–120 mg/dL), rapid exercise-induced drawdown.
- **Manual Event Injection Engine (Dynamic Spikes & Lows):**
  - *Meal Spike:* Injects rapid carbohydrate absorption (+$60$ to $+100$ mg/dL peak in 20–30 min with exponential clearance).
  - *Hypo Event Drop:* Triggers steep decline (rate $<-2.5$ mg/dL/min crossing 70 down to $50–55$ mg/dL) for emergency alarm testing.
  - *Intense Exercise:* Accelerates glucose utilization (rate $-1.5$ mg/dL/min).
  - *Rescue Carbs:* Simulates fast-acting oral glucose intervention (restoring normoglycemia within 15 min).
  - *Reset / Normalization:* Gradually restores persona to natural baseline.
- **Operational Modes:**
  - *Demo Mode:* 1 reading generated every 3 to 5 seconds (for instant visualization).
  - *Real-time Mode:* 1 reading generated every 5 minutes (clinical CGM emulation).
- **Core Simulator Controls:**
  - `start(personaId, mode)`, `pause()`, `resume()`, `stop()`, `injectEvent(eventType)`, `setSpeed(intervalMs)`.
- **Output Schema:**
  - Enforces physiological clamping ($40$ to $400$ mg/dL), rate of change calculation, trend arrows ($\uparrow\uparrow, \uparrow, \rightarrow, \downarrow, \downarrow\downarrow$), and mandatory `"source": "simulation"`.

### Module M2 — Data Collection and Processing
- **Purpose:** Centralized, resilient data ingestion pipeline, validation, and historical persistence.
- **Key Features:**
  - RESTful endpoints (`/api/v1/cgm/readings`) with strict payload validation (Joi or Zod).
  - Mongoose data models: `Users`, `Devices`, `GlucoseReadings`, `Meals`, `Activities`, `Alerts`, `Recommendations`.
  - Duplicate detection, missing reading detection, and out-of-order buffering.
  - Real-time event broadcasting to authenticated clients via Socket.IO.

### Module M3 — Real-Time Monitoring Dashboard
- **Purpose:** Responsive patient UI for real-time visualization of metabolic state.
- **Key Features:**
  - Current simulated glucose gauge with color-coded safety bands (Low <70, Normal 70–180, High >180 mg/dL).
  - Trend velocity arrows (Single/Double Rising, Single/Double Falling, Stable).
  - Dynamic interactive chart using Recharts with configurable time horizons (1h, 3h, 6h, 24h).
  - Time-in-Range (TIR) metrics: % Very Low, % Low, % In Target (70–180), % High, % Very High.
  - Persistent visual indicator: "SIMULATION MODE ACTIVE".

### Module M4 — AI Intelligence Engine
- **Purpose:** Microservice delivering trend classification, short-term trajectory forecasting, and anomaly detection.
- **Submodules:**
  - *Submodule A (Trend Analysis):* Computes finite-difference rate of change ($dG/dt$) and directional momentum.
  - *Submodule B (Forecasting):* Baseline regression models (Ridge / Random Forest) predicting glucose at $+15$, $+30$, $+45$ minutes.
  - *Submodule C (Anomaly Detection):* Unsupervised Isolation Forest to detect abnormal velocity spikes or uncharacteristic sensor fluctuations.
  - *Submodule D (Personalized Correlation):* Cross-correlates logged carbohydrates and workouts with subsequent glycemic excursions.
- **Safety & Methodological Rigor:** Strict chronological train/test splitting to prevent lookahead leakage; baseline models evaluated first; performance reported with MAE and RMSE.

### Module M5 — AI Diet Planner
- **Purpose:** Nutritional guidance and meal planning informed by historical post-prandial glycemic patterns.
- **Key Features:**
  - Food and macronutrient logging (Carbohydrates, Protein, Fat, Glycemic Index).
  - Pattern identification: flags meals associated with severe post-meal spikes.
  - Balanced meal alternatives emphasizing lower glycemic load and adequate dietary fiber.
  - Non-prescriptive recommendation text: directs users to discuss dietary changes with certified diabetes educators.

### Module M6 — AI Workout Planner
- **Purpose:** Safe physical activity recommendations tailored to current and anticipated glucose levels.
- **Key Features:**
  - Activity logging (duration, intensity, cardiovascular vs resistance).
  - Dynamic safety interlocks:
    - **Hypoglycemia Interlock:** Physical activity is strictly discouraged if glucose is $<90$ mg/dL or falling rapidly.
    - **Hyperglycemia Interlock:** Intense exercise is locked out if glucose exceeds $250$ mg/dL (risk of ketosis).
  - Post-exercise recovery tracking and bedtime snack advisories.

### Module M7 — Emergency Detection and Response Engine
- **Purpose:** Multi-tier critical event escalation engine with acknowledgment timeouts and simulated emergency dispatch.
- **Key Features:**
  - Alert trigger rules: Severe Hypoglycemia ($<54$ mg/dL), Rapid Drop ($<-2.5$ mg/dL/min), Critical Hyperglycemia ($>300$ mg/dL).
  - Two-Stage Acknowledgment:
    - *Stage 1 (Patient):* Modal banner + high-priority audible alert on patient UI. 60-second countdown timer.
    - *Stage 2 (Caregiver Escalation):* If unacknowledged, instant notification push to designated caregivers with patient GPS coordinates.
    - *Stage 3 (SOS Simulation):* Simulated ambulance/emergency dispatch visualization with Google Maps API location display and simulated status tracking.
  - Alert de-duplication and cooldown logic to prevent notification storms.

### Module M8 — Caregiver and Doctor Portal
- **Purpose:** Multi-tenant clinical and caregiver oversight interface.
- **Key Features:**
  - Role-Based Access Control (RBAC): Distinct views for `patient`, `caregiver`, and `doctor`.
  - Caregiver view: Patient list, live status indicator, emergency history, and emergency acknowledgment button.
  - Doctor view: AGP (Ambulatory Glucose Profile) style report, daily/weekly TIR breakdowns, glycemic variability indices (CV, SD), and clinical notes entry.

---

## 4. Monorepo Technical Architecture

The project is structured as a unified monorepo:

```text
final-prj/
├── apps/
│   ├── web/                     # Next.js 14+ (App Router), Tailwind CSS, Recharts, Socket.IO Client
│   └── api/                     # Node.js, Express.js, Socket.IO Server, Mongoose, Joi/Zod
├── services/
│   └── ai-engine/               # Python 3.10+, FastAPI, Scikit-learn, Pandas, NumPy, Uvicorn
├── docs/                        # Complete project documentation and governance
│   ├── GlucoGuard_Implementation_Plan.md  # Authoritative source plan
│   ├── PROJECT_MASTER_PLAN.md             # This comprehensive architecture document
│   ├── TASKS.md                           # Master task tracking matrix
│   ├── DECISIONS.md                       # Architectural Decision Records (ADRs)
│   └── REVIEW_LOG.md                      # Formal QA and code review audit log
├── infrastructure/              # Dockerfiles, docker-compose.yml, environment variable templates
├── .github/
│   └── workflows/               # CI test verification workflows
├── AGENTS.md                    # Agent collaboration protocol
└── README.md                    # Root onboarding guide
```

---

## 5. Twelve-Week Implementation Roadmap

| Week | Focus Area | Key Deliverables | Milestone Checkpoint |
|---|---|---|---|
| **Week 1** | **Project Setup & Architecture** | Monorepo scaffolding, base Express API, Next.js init, MongoDB schemas, API contracts | Milestone 0: Infrastructure Ready |
| **Week 2** | **Virtual CGM Simulator (M1)** | Telemetry generation engine, 6 scenarios, historical data generator, REST transmission | Milestone 1: Virtual CGM Operational |
| **Week 3** | **Backend Integration (M2)** | Ingestion endpoints, validation middleware, MongoDB storage, Socket.IO real-time broadcast | Milestone 2: Data Pipeline Operational |
| **Week 4** | **Monitoring Dashboard (M3)** | Live patient dashboard, interactive Recharts, Time-in-Range gauges, simulation controls | Milestone 3: Real-Time UI Live |
| **Week 5–6** | **AI Intelligence Engine (M4)** | FastAPI microservice, synthetic/benchmarked dataset preparation, trend analysis, forecasting baseline, anomaly detector | Milestone 4: AI Insights Operational |
| **Week 7** | **AI Diet Planner (M5)** | Meal logging, nutrition database mapping, post-prandial correlation, recommendation engine | Milestone 5: Diet Planner Integrated |
| **Week 8** | **AI Workout Planner (M6)** | Activity tracker, exercise scheduler, glucose safety interlocks | Milestone 6: Workout Safety Active |
| **Week 9–10** | **Emergency Engine (M7)** | Critical threshold detector, patient countdown modal, caregiver push, simulated SOS dispatch with Google Maps | Milestone 7: Emergency Escalation Verified |
| **Week 11** | **Caregiver & Doctor Portal (M8)**| Role-based authentication, multi-patient monitoring, AGP report generator, doctor notes | Milestone 8: Multi-Role Portals Live |
| **Week 12** | **E2E Testing & Hardening** | Full end-to-end integration testing, security audit, latency validation, deployment config | Milestone 9: Final Release Ready |

---

## 6. Quality Assurance & Verification Standards

1. **Unit Testing:** Every core logic module (simulator calculations, rate-of-change formulas, safety interlocks) must achieve $>80\%$ test coverage.
2. **Integration Testing:** Ingestion API routes must be tested against simulated edge cases (rapid drop, corrupted readings, duplicate timestamps).
3. **AI Evaluation Standards:**
   - Regression models evaluated on Root Mean Square Error (RMSE) and Mean Absolute Error (MAE).
   - Anomaly detection evaluated on precision, recall, and false alarm rate.
   - Strictly zero data leakage between temporal train/test sets.
4. **Safety Verification:** Mandatory regression tests verifying that exercise recommendations are blocked when glucose is $<90$ mg/dL and that no insulin dosage values are emitted by any endpoint.

