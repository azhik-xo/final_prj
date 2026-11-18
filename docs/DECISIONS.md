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
- [ADR-009: Nutritional Glycemic Impact Modeling and Diet Planning Safety Protocol](#adr-009-nutritional-glycemic-impact-modeling-and-diet-planning-safety-protocol)
- [ADR-010: Physical Activity Glycemic Modeling & Clinical Safety Interlocks Protocol](#adr-010-physical-activity-glycemic-modeling--clinical-safety-interlocks-protocol)
- [ADR-011: Emergency Detection, Multi-Stage Escalation Protocol & Simulated SOS Dispatch](#adr-011-emergency-detection-multi-stage-escalation-protocol--simulated-sos-dispatch)
- [ADR-012: Multi-Role Clinical Oversight Architecture & Ambulatory Glucose Profile (AGP) Standard](#adr-012-multi-role-clinical-oversight-architecture--ambulatory-glucose-profile-agp-standard)

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

---

### ADR-009: Nutritional Glycemic Impact Modeling and Diet Planning Safety Protocol
- **Status:** **APPROVED**
- **Date:** 2026-11-18
- **Context:**  
  Module M5 (AI Diet Planner) must predict post-prandial glycemic impact $\Delta G$ based on macronutrient composition (net carbohydrates, dietary fiber, protein, fat) and Glycemic Index (GI). However, diabetes nutrition guidance carries clinical risks: inaccurate modeling or unauthorized insulin dosage suggestions could lead to medical harm or regulatory non-compliance.
- **Decision:**  
  1. *Pharmacokinetic-Informed Glycemic Excursion Model:*  
     Implement a deterministic, physiologically grounded post-prandial predictor in `services/ai-engine/models/diet_analyzer.py`:
     $$\Delta G_{\text{peak}} = (\text{Net Carbs} \times \text{GI Factor}) - (\text{Fiber} \times 0.5) + (\text{Fat/Protein buffering})$$
     Clamped within physiologically realistic bounds ($+0$ to $+150$ mg/dL excursion, peak at $30–75$ min).
  2. *Diabetic-Plate Preset Nutritional Database:*  
     Curate verified reference foods (oatmeal, brown rice bowl, grilled chicken salad, lentils/dosa, white bread, sugar sodas) with standardized carb/protein/fat/fiber counts and GI categories.
  3. *Strict Non-Prescription Safety Boundary (Non-Negotiable):*  
     Under NO circumstances will the system compute or advise insulin-to-carb ratios (ICR), correction boluses, or drug doses. Recommendations are strictly educational dietary swaps (e.g. low-GI substitutions, portion timing, fiber enrichment).
  4. *Simulation & Clinical Disclaimer:*  
     Every API response and frontend view must feature prominent simulation notices and advice to consult certified diabetes educators or endocrinologists.
- **Trade-offs:**  
  *Pros:* Transparent, explainable metabolic impact forecasting without clinical liability.  
  *Cons:* Cannot replace individualized clinical insulin bolus calculators.

---

### ADR-010: Physical Activity Glycemic Modeling & Clinical Safety Interlocks Protocol
- **Status:** **APPROVED**
- **Date:** 2026-11-18
- **Context:**  
  Physical activity stimulates GLUT4 translocation and dramatically accelerates glucose uptake in skeletal muscle. In diabetic patients, performing exercise while glucose is already low or dropping induces acute, potentially fatal severe hypoglycemia. Conversely, intense anaerobic exertion during acute hyperglycemia ($>250$ mg/dL) can precipitate diabetic ketoacidosis (DKA) due to counter-regulatory catecholamine surges.
- **Decision:**  
  Implement deterministic clinical safety interlocks and physiological exercise drawdown modeling in Module M6:
  1. *Hard Hypoglycemia Lockout ($<90$ mg/dL or $dG/dt < -1.5$ mg/dL/min):*  
     Physical activity is STRICTLY LOCKED OUT in the UI and API. Guidance directs the user to consume 15g fast-acting carbohydrates and wait for glucose to rise above $100$ mg/dL.
  2. *Hyperglycemia / Ketosis Lockout ($>250$ mg/dL):*  
     Strenuous and anaerobic workouts are LOCKED OUT. Recommends gentle walking and hydration only.
  3. *Safe Exercise Window ($90–250$ mg/dL):*  
     Authorizes exercise and calculates expected glucose drawdown:
     $$\Delta G_{\text{drawdown}} = -1.0 \times \text{Duration} \times \text{IntensityFactor} \times (\text{MET} / 3.5)$$
     Clamped to $[-120, 0]$ mg/dL.
  4. *Closed-Loop Simulation Bridge:*  
     Logging a workout bridges to the running Virtual CGM Simulator to trigger realistic `exercise` drawdown telemetry.
  5. *Zero Emojis & Non-Clinical Disclaimer:*  
     Strictly Lucide React library icons only, with non-device educational simulation notices.
- **Trade-offs:**  
  *Pros:* Enforces real-world clinical safety guidelines (ADA standards of care for exercise) and prevents simulation of dangerous diabetic behaviors.  
  *Cons:* Strict lockouts prevent users from logging hypothetical workouts during simulated lows without overriding.


---

### ADR-011: Emergency Detection, Multi-Stage Escalation Protocol & Simulated SOS Dispatch
- **Status:** **APPROVED**
- **Date:** 2026-11-18
- **Context:**  
  Module M7 (Emergency Response Engine) handles life-threatening glycemic excursions: severe hypoglycemia ($<54$ mg/dL), acute precipitous drops ($dG/dt < -2.5$ mg/dL/min), and severe hyperglycemia ($>300$ mg/dL). Rapid escalation is required when a patient fails to respond, while preventing panic or real-world emergency service misdirection.
- **Decision:**  
  1. *Clinical Severity Classification:*  
     - **CRITICAL HYPO:** Glucose $<54$ mg/dL or ($<70$ mg/dL with $dG/dt < -2.5$ mg/dL/min). Immediate Tier 1 escalation.
     - **WARNING HYPO:** Glucose $54–69$ mg/dL.
     - **CRITICAL HYPER:** Glucose $>300$ mg/dL.
     - **WARNING HYPER:** Glucose $250–300$ mg/dL.
  2. *Three-Tier Deterministic Escalation Protocol:*  
     - **Stage 1 (Patient Alarm & 60s Countdown):** Immediate high-contrast visual flashing alert with audible siren toggle and 60-second countdown modal ("I Am Safe / Acknowledge").
     - **Stage 2 (Caregiver SOS Notification):** If the 60-second countdown reaches 0 without acknowledgment, or if glucose drops below $50$ mg/dL, escalate to caregiver notification over Socket.IO and simulated SMS/Push notification.
     - **Stage 3 (Simulated EMS / Ambulance SOS Dispatch):** If unacknowledged, launch simulated emergency services dispatch with real-time tracking, simulated ambulance ETA, and location coordinates.
  3. *Strict Non-Device & Healthcare Simulation Safeguards:*  
     - Mandatory `"source": "simulation"` on all alerts, logs, and UI modals.
     - 100% simulated dispatch: No real emergency services (911/112) or actual telecom gateways are contacted.
     - Unacknowledged status is explicitly labeled as "Unacknowledged Emergency Simulation", never clinical confirmation of unconsciousness.
  4. *Alert Cooldown & Suppression:*  
     - 15-minute suppression window for alerts of the same severity level to prevent notification flooding, with immediate override if clinical severity worsens.
  5. *UI Design Standards:*  
     - Strict zero-emoji policy; exclusively Lucide React icons (`Siren`, `ShieldAlert`, `PhoneCall`, `Ambulance`, `CheckCircle2`, `Clock`, `MapPin`, `Volume2`, `VolumeX`).
- **Trade-offs:**  
  *Pros:* Realistic, high-impact demonstration of clinical closed-loop emergency response without safety liabilities.  
  *Cons:* Requires simulated caregiver and ambulance dispatch mock state.

---

### ADR-012: Multi-Role Clinical Oversight Architecture & Ambulatory Glucose Profile (AGP) Standard
- **Status:** **APPROVED**
- **Date:** 2026-11-18
- **Context:**  
  Module M8 provides specialized interfaces for secondary stakeholders: family caregivers and endocrinologists/clinicians. Caregivers need continuous remote visibility into patient glycemic stability and emergency notifications. Clinicians require standardized, evidence-based reporting conforming to the international consensus on Ambulatory Glucose Profile (AGP) analysis (Battelino et al., Diabetes Care 2019), including Time-in-Range (TIR) targets, Glycemic Variability ($CV$), and Glucose Management Indicator ($GMI$).
- **Decision:**  
  1. *Role-Based Multi-Stakeholder Modalities:*  
     - Provide dedicated, specialized views for:
       * **Caregiver Portal (`/caregiver`):** Patient roster, real-time glycemic status cards, active emergency alerts, and caregiver acknowledgment.
       * **Doctor / Clinical AGP Portal (`/doctor`):** Comprehensive AGP clinical summary, standard TIR targets, percentile curves, and physician consultation notes.
  2. *Standard Clinical Metrics & AGP Algorithms:*  
     - **Time-in-Range (TIR):**
       * In Range ($70–180$ mg/dL): Clinical Target $>70\%$.
       * Below Range ($54–69$ mg/dL): Clinical Target $<4\%$.
       * Very Low ($<54$ mg/dL): Clinical Target $<1\%$.
       * Above Range ($181–250$ mg/dL): Clinical Target $<25\%$.
       * Very High ($>250$ mg/dL): Clinical Target $<5\%$.
     - **Glycemic Variability ($CV$):**
       $$CV = \left(\frac{\sigma}{\mu}\right) \times 100\% \quad (\text{Target } \le 36\%)$$
     - **Glucose Management Indicator ($GMI$ / est. HbA1c):**
       $$GMI = 3.31 + 0.02392 \times \mu \quad (\text{in } \%)$$
     - **Percentile Modal Distribution:**
       Calculates 10th, 25th, 50th (median), 75th, and 90th percentiles across time of day.
  3. *Physician Consultation Notes & Caregiver Acknowledgment:*  
     - Mongoose schema `ClinicalNote` storing physician observations, treatment recommendations (educational lifestyle/diet only, strictly no drug/insulin titration), and consultation timestamps.
  4. *Strict Non-Prescription & Simulation Safeguards:*  
     - No insulin dosage calculation or prescription advice (ADR-007).
     - Mandatory `"source": "simulation"` on all AGP payloads and clinical models.
     - Strictly zero emojis in code or UI; exclusively Lucide React icons (`Stethoscope`, `Users`, `Activity`, `FileText`, `CheckCircle2`, `AlertTriangle`, `HeartPulse`, `Clock`, `ShieldAlert`, `Download`, `TrendingUp`, `Plus`).
- **Trade-offs:**  
  *Pros:* Aligns with global endocrinology guidelines (ADA/EASD consensus) and demonstrates true multi-stakeholder hospital-grade utility.  
  *Cons:* AGP calculations require sufficient simulated reading density for statistical validity.
