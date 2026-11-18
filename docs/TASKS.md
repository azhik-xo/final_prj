# GlucoGuard — Task Tracking Matrix

**Project Title:** AI-Powered Continuous Glucose Monitoring & Intelligent Emergency Response System  
**Lead Architect & QA Supervisor:** Supervisor AI  
**Authoritative Source Plan:** `docs/GlucoGuard_Implementation_Plan.md`  

---

## 1. Task Management Workflow & Status Definitions

- **`BACKLOG`**: Task defined and scoped, but blocked by prerequisites or future scheduling.
- **`READY`**: All dependencies met, acceptance criteria defined; ready for Developer AI to implement.
- **`IN_PROGRESS`**: Active development underway by Developer AI.
- **`IN_REVIEW`**: Implementation complete, verified locally by Developer AI, awaiting Supervisor AI formal review.
- **`CHANGES_REQUESTED`**: Supervisor AI identified defects, missing acceptance criteria, or architectural deviations.
- **`APPROVED`**: Formally reviewed, code verified against files and test executions by Supervisor AI.
- **`BLOCKED`**: Progress halted due to external dependency, environment failure, or missing specification.

---

## 2. Master Task List

| Task ID | Module | Title | Dependencies | Status | Assignee |
|---|---|---|---|---|---|
| **`TASK-INT-01`** | **M2+M3** | Real-Time E2E Pipeline: MongoDB, Socket.IO Gateway & Interactive Next.js Dashboard | `TASK-M1-01` | **APPROVED** | Developer AI |
| **`TASK-M4-FULL`** | **M4** | AI Intelligence Engine: Trend Analytics, Short-Term Forecasting (15/30/45m) & Anomaly Detection | `TASK-INT-01` | **APPROVED** | Developer AI |
| **`TASK-M3-SENIOR`** | **M3** | Senior & Accessibility Mode: Simplified Elder View, Giant Typography, Plain Language Guidance & Voice Readout | `TASK-INT-01` | **APPROVED** | Developer AI |
| **`TASK-M3-VOICE-TA`** | **M3** | Senior Voice Localization: Optional Tamil Voice Readout (தமிழ் குரல்) & Bilingual TTS Engine | `TASK-M3-SENIOR` | **APPROVED** | Developer AI |
| **`TASK-M3-VOICE-FIX`** | **M3** | Resilient Multi-Tier Tamil TTS Engine: Asynchronous Voice Hydration & Phonetic Fallback | `TASK-M3-VOICE-TA` | **APPROVED** | Developer AI |
| **`TASK-M5-FULL`** | **M5** | AI Diet Planner: Macronutrient Logging, Glycemic Impact Prediction & Nutritional Swaps | `TASK-M4-FULL` | **APPROVED** | Developer AI |
| **`TASK-M0-01`** | **M0** | Monorepo Workspace Initialization & Tooling Setup | None | **APPROVED** | Developer AI |
| **`TASK-M0-02`** | **M0** | Base Docker & Environment Orchestration Setup | `TASK-M0-01` | **BACKLOG** | Developer AI |
| **`TASK-M1-01`** | **M1** | Virtual CGM Simulator Engine with 6 Personas & Event Injection | None | **APPROVED** | Developer AI |
| **`TASK-M1-02`** | **M1** | 6 Simulation Scenarios & Historical Seed Generator | `TASK-M1-01` | **BACKLOG** | Developer AI |
| **`TASK-M1-03`** | **M1** | Virtual CGM HTTP Client & Transmission Controls | `TASK-M1-02`, `TASK-M2-01` | **BACKLOG** | Developer AI |
| **`TASK-M2-01`** | **M2** | Express Ingestion API & Payload Validation | `TASK-M0-01` | **BACKLOG** | Developer AI |
| **`TASK-M2-02`** | **M2** | MongoDB Mongoose Schemas & Time-Series Persistence | `TASK-M2-01` | **BACKLOG** | Developer AI |
| **`TASK-M2-03`** | **M2** | Socket.IO Real-time Gateway & Event Dispatcher | `TASK-M2-02` | **BACKLOG** | Developer AI |
| **`TASK-M3-01`** | **M3** | Next.js Dashboard Foundation & Real-Time Socket Client | `TASK-M0-01`, `TASK-M2-03` | **BACKLOG** | Developer AI |
| **`TASK-M3-02`** | **M3** | Recharts Glucose Stream, Trend Arrows & TIR Gauges | `TASK-M3-01` | **BACKLOG** | Developer AI |
| **`TASK-M3-03`** | **M3** | Interactive Simulator Control Panel & Scenario Switcher | `TASK-M3-02`, `TASK-M1-03` | **BACKLOG** | Developer AI |
| **`TASK-M4-01`** | **M4** | FastAPI Service Foundation & Data Preprocessing Pipeline | `TASK-M0-01` | **BACKLOG** | Developer AI |
| **`TASK-M4-02`** | **M4** | Rate of Change & Glucose Trend Classifier | `TASK-M4-01` | **BACKLOG** | Developer AI |
| **`TASK-M4-03`** | **M4** | Short-Term Forecasting Baseline Model (15/30/45 min) | `TASK-M4-02` | **BACKLOG** | Developer AI |
| **`TASK-M4-04`** | **M4** | Isolation Forest Anomaly Detection Engine | `TASK-M4-03` | **BACKLOG** | Developer AI |
| **`TASK-M5-01`** | **M5** | Meal Logging Data Model & Macronutrient Database | `TASK-M2-02` | **BACKLOG** | Developer AI |
| **`TASK-M5-02`** | **M5** | AI Diet Recommendation & Post-Prandial Analyzer | `TASK-M5-01`, `TASK-M4-02` | **BACKLOG** | Developer AI |
| **`TASK-M6-01`** | **M6** | Activity Logging & Exercise Tracking Model | `TASK-M2-02` | **BACKLOG** | Developer AI |
| **`TASK-M6-02`** | **M6** | AI Workout Planner with Hypo/Hyper Safety Lockouts | `TASK-M6-01`, `TASK-M4-02` | **BACKLOG** | Developer AI |
| **`TASK-M7-01`** | **M7** | Critical Glycemic Event & Rapid Drop Detection Rule Engine | `TASK-M2-02` | **BACKLOG** | Developer AI |
| **`TASK-M7-02`** | **M7** | Two-Tier Patient Acknowledgment Countdown Workflow | `TASK-M7-01`, `TASK-M3-01` | **BACKLOG** | Developer AI |
| **`TASK-M7-03`** | **M7** | Caregiver Push Notification & Simulated SOS Dispatch | `TASK-M7-02` | **BACKLOG** | Developer AI |
| **`TASK-M8-01`** | **M8** | Role-Based Access Control (Patient, Caregiver, Doctor) | `TASK-M2-02` | **BACKLOG** | Developer AI |
| **`TASK-M8-02`** | **M8** | Caregiver Patient Roster & Live Status Oversight | `TASK-M8-01`, `TASK-M7-03` | **BACKLOG** | Developer AI |
| **`TASK-M8-03`** | **M8** | Doctor Clinical AGP Report & Historical Notes Portal | `TASK-M8-01`, `TASK-M3-02` | **BACKLOG** | Developer AI |
| **`TASK-M9-01`** | **M9** | End-to-End Simulation Testing & Security Audit | All previous | **BACKLOG** | Developer AI |

---

## 3. Detailed Specifications for Active & Priority Tasks

### `TASK-M3-SENIOR`: Senior & Accessibility Mode: Simplified Elder View, Giant Typography, Plain Language Guidance & Voice Readout
- **Module:** M3 (Real-Time Patient Dashboard)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-INT-01`, `TASK-M4-FULL`
- **Architectural Reference:** `ADR-008`
- **Description:**  
  Develop a dedicated, high-contrast, elder-friendly accessibility interface for the Patient Dashboard:
  1. **Mode Switcher in Patient Dashboard (`apps/web/src/app/page.js`):**
     - Add a clean header toggle: "Clinical View" vs "Senior Care View".
     - Persist choice in browser `localStorage` (default to active mode or senior mode when toggled).
  2. **Dedicated Component `apps/web/src/components/SeniorGlucoseView.jsx`:**
     - **Gigantic Sugar Metric:** Bold 72px–80px glucose number with high-contrast text and colored halo.
     - **Clear Plain-Language Status:**
       * $<70$ mg/dL: Crimson red alert: *"LOW SUGAR WARNING — HAVE JUICE OR SWEETS NOW"*
       * $70–180$ mg/dL: Emerald green: *"YOUR SUGAR IS HEALTHY & SAFE"*
       * $>180$ mg/dL: Amber alert: *"HIGH SUGAR ALERT — DRINK WATER & REST"*
     - **Visual Traffic Light Gauge Bar:** 3-segment horizontal bar (Low, Safe Target, High) with an intuitive position marker for visual clarity without complex graph axes.
     - **Plain-Language Trend Indicator:**
       * Replacing derivative rate numbers with human sentences: *"Sugar is calm and steady"*, *"Sugar dropping quickly"*, or *"Sugar rising after food"*.
     - **Web Speech Audio Readout (Text-to-Speech):**
       * One-touch button with `Volume2` icon (*"Listen to Sugar Status"*).
       * Utilizes native `window.speechSynthesis` to speak: *"Your current glucose is 125 milligrams per deciliter. Your sugar is in the healthy safe zone and currently steady."*
     - **Actionable Guidance Card ("What Should I Do Right Now?"):**
       * 3 clear, numbered steps tailored to current status (e.g. hydrate, rest, 15g fast-acting carbs if low).
     - **Simplified AI Forecast Summary:**
       * Translates complex multi-horizon curves into clear conversational guidance (e.g. *"AI Forecast: Sugar projected to stay safe around 130 mg/dL over the next 30 minutes"*).
     - **One-Touch Caregiver SOS / Help Card:**
       * Caregiver contact card: *"Primary Contact: Sarah (Daughter) · Call +91 98765 43210"* with quick call action.
  3. **Strict Non-Emoji Rule:**
     - Use ONLY Lucide React icons (`Volume2`, `VolumeX`, `Phone`, `ShieldCheck`, `AlertCircle`, `CheckCircle2`, `ArrowUp`, `ArrowDown`, `Minus`, `Heart`, `Info`, `SlidersHorizontal`, `Eye`).
  4. **Verification & Tests:**
     - Add unit tests in `apps/web/tests/page.test.js` or `tests/seniorView.test.js` verifying senior view toggle, speech synthesis trigger fallback, and plain-language interpretations.
- **Acceptance Criteria:**
  1. Toggle smoothly switches between Clinical View and Senior View without full page reload.
  2. Senior View displays giant typography (minimum 64px for glucose value).
  3. Plain-language status and action checklist reflect real-time glucose values correctly.
  4. Voice readout triggers `speechSynthesis.speak` with correct clinical message.
  5. Zero emojis in source code.
  6. All Jest frontend tests and Next.js production builds pass.

### `TASK-M3-VOICE-TA`: Senior Voice Localization: Optional Tamil Voice Readout (தமிழ் குரல்) & Bilingual TTS Engine
- **Module:** M3 (Real-Time Patient Dashboard)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-M3-SENIOR`
- **Architectural Reference:** `ADR-008`
- **Description:**  
  Add optional Tamil audio voice readout (தமிழ் குரல்) to `SeniorGlucoseView.jsx` to make the continuous glucose monitoring accessible to elderly Tamil-speaking patients:
  1. **Bilingual Voice Switcher in Senior View:**
     - Add language switcher toggle: **"English"** vs **"தமிழ்" (Tamil)** with Lucide `Languages` icon.
     - Persist voice language selection in `localStorage` (`glucoguard_voice_lang: 'en' | 'ta'`).
  2. **Authentic Spoken Tamil Clinical Narration:**
     - Map glucose status to clear, natural, respectful spoken Tamil:
       * **Safe (70–180 mg/dL):** *"உங்கள் சர்க்கரை அளவு {val}. இது சரியான மற்றும் ஆரோக்கியமான பாதுகாப்பான அளவில் உள்ளது. சர்க்கரை அளவு சீராக உள்ளது. ஒரு டம்ளர் நல்ல தண்ணீர் குடிக்கவும்."*
       * **Low (<70 mg/dL):** *"எச்சரிக்கை! உங்கள் சர்க்கரை அளவு குறைவாக உள்ளது ({val}). உடனே அரை டம்ளர் பழச்சாறு அல்லது இனிப்பு சாக்லேட் சாப்பிடவும். அமைதியாக உட்காருங்கள், படிக்கட்டுகளில் ஏற வேண்டாம்."*
       * **Very Low (<54 mg/dL):** *"அவசர எச்சரிக்கை! சர்க்கரை அளவு அபாயகரமான மிகக் குறைவாக உள்ளது ({val}). உடனே இனிப்பு குடிக்கவும், குடும்பத்தினரை அழைக்கவும்."*
       * **High (>180 mg/dL):** *"கவனிக்கவும்! சர்க்கரை அளவு அதிகமாக உள்ளது ({val}). ஒன்று அல்லது இரண்டு டம்ளர் தண்ணீர் குடிக்கவும். இனிப்பு உணவுகளை தவிர்க்கவும், அமைதியாக ஓய்வெடுக்கவும்."*
       * **Very High (>250 mg/dL):** *"எச்சரிக்கை! சர்க்கரை அளவு மிக அதிகமாக உள்ளது ({val}). நிறைய தண்ணீர் குடித்து ஓய்வெடுக்கவும், குடும்பத்தினருக்கு தெரிவிக்கவும்."*
     - Map trend directions to natural Tamil:
       * Dropping fast: *"சர்க்கரை அளவு வேகமாக குறைகிறது."*
       * Dropping slow: *"சர்க்கரை அளவு மெதுவாக குறைகிறது."*
       * Steady: *"சர்க்கரை அளவு சீராக உள்ளது."*
       * Rising slow: *"சர்க்கரை அளவு மெதுவாக உயர்கிறது."*
       * Rising fast: *"சர்க்கரை அளவு வேகமாக உயர்கிறது."*
  3. **TTS Audio Synthesis Engine:**
     - When `voiceLang === 'ta'`:
       * Set `utterance.lang = 'ta-IN'` (or `ta_IN` / `ta`).
       * Search `window.speechSynthesis.getVoices()` for available Tamil voices (e.g. Google தமிழ், Microsoft Valluvar) and set `utterance.voice` if found.
       * Set senior-friendly speaking pace (`utterance.rate = 0.85`).
     - Button label dynamically updates:
       * English: *"Listen to Sugar Status (Voice Readout)"*
       * Tamil: *"சர்க்கரை அளவை தமிழில் கேட்க (Voice Readout)"*
  4. **Strict Rules:**
     - Zero emojis in UI or source code (use Lucide library icons: `Languages`, `Volume2`, `VolumeX`).
  5. **Verification & Tests:**
     - Update unit tests in `apps/web/tests/seniorView.test.js` to test Tamil voice toggle, `ta-IN` language setting, and Tamil utterance text.
- **Acceptance Criteria:**
  1. Language switcher toggles cleanly between English and Tamil.
  2. Selecting Tamil sets `SpeechSynthesisUtterance.lang = 'ta-IN'` and generates the correct Tamil narration text.
  3. Spoken Tamil phrases are grammatically natural, respectful, and clinically safe.
  4. All Jest frontend tests pass and Next.js builds with exit code 0.

### `TASK-M3-VOICE-FIX`: Resilient Multi-Tier Tamil TTS Engine: Asynchronous Voice Hydration & Phonetic Fallback
- **Module:** M3 (Real-Time Patient Dashboard)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-M3-VOICE-TA`
- **Architectural Reference:** `ADR-008`
- **Description:**  
  Resolve the failure where Tamil voice is silent on client browsers (especially Windows / Chromium without native Tamil TTS voices installed):
  1. **Root Cause Analysis:**
     - `window.speechSynthesis.getVoices()` is asynchronous and returns `[]` on initial render in Chromium.
     - Windows standard installations do not bundle Tamil TTS voices (`ta-IN`) by default. Default English voices fail or produce silence when reading Tamil Unicode characters.
  2. **Multi-Tier Voice Synthesis Solution:**
     - **Tier 1 (Asynchronous Voice Hydration):** Listen to `speechSynthesis.onvoiceschanged` and populate available voices in state. Search for native Tamil voices (`ta-IN`, `ta`, `Tamil`, `தமிழ்`, `Google தமிழ்`, `Microsoft Valluvar`).
     - **Tier 2 (Native Voice Synthesis):** If a native Tamil voice is detected, bind `utterance.voice` to that voice and synthesize native Tamil Unicode text (`உங்கள் சர்க்கரை அளவு {val}...`).
     - **Tier 3 (Phonetic Spoken Tamil Fallback):** If NO native Tamil voice exists in the user's browser/OS, seamlessly synthesize **Phonetic Spoken Tamil (Tanglish)** using the platform's default voice:
       * Safe: *"Ungal sugar alavu {val}. Idhu sariyaana safe zone-il ulladhu. Sugar calm and steady-aaga ulladhu. Oru glass thanneer kudiyungal."*
       * Low: *"Warning! Ungal sugar alavu kuraivaaga ulladhu ({val}). Udanae fruit juice alladhu sweet saappidavum. Amaithiyaaga utkaarungal."*
       * High: *"Kavanikkavum! Ungal sugar alavu adhiga-maaga ulladhu ({val}). Rendu glass thanneer kudiyungal. Sweets thavirkkavum, nandraaga rest edukkavum."*
       * Enables 100% of Windows/Mac/Linux/Android devices to speak fluent, understandable Tamil without requiring manual OS language pack installations.
     - **Tier 4 (Automatic Error Fallback):** On `utterance.onerror`, catch `language-unavailable` or speech errors and instantly retry with the phonetic fallback.
     - **Tier 5 (Chrome Audio State Recovery):** Call `window.speechSynthesis.cancel()` and `window.speechSynthesis.resume()` before speak to resolve Chrome's audio suspension deadlock.
  3. **UI Enhancements:**
     - Display a subtle status indicator below the voice button: e.g. *"Tamil Voice: Active"* (or identifying Native vs Phonetic mode).
     - Strictly zero emojis in source code or UI.
  4. **Verification & Tests:**
     - Add unit tests verifying both native Tamil utterance path and phonetic Tamil fallback path when no native voice is present.
     - Ensure all 17+ Jest tests pass and Next.js builds clean.
- **Acceptance Criteria:**
  1. Voice readout plays audibly in Tamil even when the OS does not have a native Tamil TTS voice package installed.
  2. If native Tamil voice exists, native script is used; otherwise phonetic spoken Tamil is used.
  3. `speechSynthesis.onvoiceschanged` is properly listened to and cached.
  4. Chrome audio suspension is prevented with `resume()`.
  5. All tests pass with zero regressions.

### `TASK-M5-FULL`: AI Diet Planner: Macronutrient Logging, Glycemic Impact Prediction & Nutritional Swaps
- **Module:** M5 (AI Diet Planner)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-M4-FULL`
- **Architectural Reference:** `ADR-007`, `ADR-009`
- **Description:**  
  Develop end-to-end nutritional management and meal-impact forecasting across the monorepo:
  1. **FastAPI AI Engine Submodule (`services/ai-engine/models/diet_analyzer.py`):**
     - Reference food database of common diabetic-plate items with macronutrients (Net Carbs, Protein, Fat, Fiber, Glycemic Index category).
     - Deterministic physiological excursion estimator:
       * Estimated peak excursion $\Delta G_{\text{peak}} = (\text{Net Carbs} \times \text{GI Factor}) - (\text{Fiber} \times 0.5) + (\text{Fat/Protein delay factor})$.
       * Estimated peak time: Low GI ($60–75$ min), Med GI ($45–60$ min), High GI ($30–45$ min).
       * Post-meal trajectory projection curve ($0$ to $120$ min).
       * Intelligent low-GI healthy alternatives / swaps generator (e.g. White Rice $\rightarrow$ Quinoa / Brown Rice, Soda $\rightarrow$ Infused Sparkling Water).
     - Endpoints in `services/ai-engine/routes/diet_routes.py`:
       * `POST /api/v1/ai/diet/analyze`: Predicts glycemic spike from meal ingredients.
       * `GET /api/v1/ai/diet/foods`: Returns reference food library with macros.
       * `GET /api/v1/ai/diet/recommendations`: Recommends diabetic-safe swaps and snack ideas.
  2. **Express Backend Endpoints & Persistence (`apps/api`):**
     - Mongoose schema `apps/api/src/models/meal.model.js`:
       * Fields: `userId`, `name`, `mealType` (breakfast/lunch/dinner/snack), `carbs`, `protein`, `fat`, `fiber`, `glycemicIndex`, `calories`, `estimatedSpikeMgDl`, `source` ("simulation"), `timestamp`.
     - Controller & Routes in `apps/api/src/routes/diet.routes.js` mounted at `/api/v1/diet`:
       * `POST /api/v1/diet/meals`: Logs meal, queries AI engine for spike prediction, persists in MongoDB, and emits `cgm:event` with `meal_spike` simulation bridge.
       * `GET /api/v1/diet/meals`: Returns logged meals for patient.
       * `GET /api/v1/diet/recommendations`: Returns AI meal swaps.
  3. **Next.js Web UI (`apps/web/src/app/diet/page.js`):**
     - Top navigation link "Diet Planner" in `apps/web/src/app/layout.js`.
     - Interactive Meal Logger:
       * 1-Click quick presets: (Oatmeal with Almonds, Brown Rice Bowl, Grilled Chicken Salad, Dosa with Sambar, White Bread with Jam, Sweet Soda).
       * Custom meal entry modal/form.
       * Real-time AI Glycemic Excursion Gauge: Displays predicted spike $\Delta G$ (e.g. "+42 mg/dL in 45 min") before eating!
       * Macro distribution breakdown (Carbs, Protein, Fat, Fiber bar meters).
       * Logged Meals Table/Cards with glycemic ratings.
       * Diabetic Meal Swaps Card: shows lower-carb/lower-GI healthy alternatives.
  4. **Strict Rules:**
     - ZERO insulin dosage calculations or titration prescriptions (ADR-007).
     - ZERO emojis in source code or UI (use Lucide React icons: `Utensils`, `Apple`, `Sparkles`, `Plus`, `Clock`, `Flame`, `ShieldAlert`, `CheckCircle2`, `ArrowRight`, `BookOpen`).
     - Non-clinical simulation disclaimer prominent on all responses and views.
  5. **Verification & Tests:**
     - Python unit tests in `services/ai-engine/tests/test_diet_engine.py`.
     - Node integration tests in `apps/api/tests/diet.test.js`.
     - Jest component tests in `apps/web/tests/diet.test.js`.
     - Next.js production build exits code 0.
- **Acceptance Criteria:**
  1. `POST /api/v1/diet/meals` validates input, computes estimated spike, and stores in MongoDB.
  2. AI engine returns predictable, physiologically bounded excursions ($0–150$ mg/dL).
  3. Web UI allows quick preset logging and custom logging with real-time predicted spike preview.
  4. No emojis in code or UI; all unit and integration tests pass across all 3 stacks.

### `TASK-M4-FULL`: AI Intelligence Engine: Trend Analytics, Short-Term Forecasting (15/30/45m) & Anomaly Detection
- **Module:** M4 (AI Intelligence Engine)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-INT-01`
- **Description:**  
  Implement the AI Intelligence Engine in `services/ai-engine/` using Python, FastAPI, Scikit-learn, Pandas, and NumPy:
  1. **Submodule A (Trend Analytics & Velocity):**
     - Smooth finite-difference rate of change ($dG/dt$) and acceleration ($d^2G/dt^2$).
     - Categorize trajectory momentum.
  2. **Submodule B (Short-Term Glucose Forecasting):**
     - Implement benchmark-first machine learning models:
       * Linear/Ridge Regression with Polynomial Features (Baseline)
       * Random Forest Regressor / Gradient Boosting for non-linear kinetics
     - Multi-step forecasting for $+15$, $+30$, and $+45$ minutes ahead.
     - Calculate prediction intervals (confidence bounds).
     - Clinical threshold breach detector: predicts if glucose will cross $<70$ mg/dL (hypo) or $>180$ mg/dL (hyper) within the next 45 minutes and computes estimated time-to-breach.
     - Evaluate and log MAE and RMSE metrics on held-out temporal slices (strict zero-leakage validation).
  3. **Submodule C (Anomaly Detection):**
     - Unsupervised Isolation Forest model to flag unphysiological rates of change or sensor telemetry artifacts.
  4. **FastAPI Service Endpoints (`services/ai-engine`):**
     - `POST /api/v1/ai/predict`: Evaluates recent sequence of readings and outputs multi-step forecasts, confidence intervals, trajectory trend, and early breach warning.
     - `POST /api/v1/ai/anomaly`: Detects anomalies in latest reading relative to recent historical window.
  5. **Backend & Frontend Integration:**
     - In `apps/api`: Integrate `ai.service.js` to automatically fetch predictions when readings are ingested or requested, and emit `cgm:prediction` over Socket.IO.
     - In `apps/web`:
       * Render the dotted forecast line extending $+15$, $+30$, $+45$ minutes into the future directly on the Recharts graph!
       * Display an **AI Predictive Early-Warning Card** on the dashboard with projected glucose, time-to-breach countdown, and model performance metrics (MAE/RMSE).
       * Strictly adhere to UI guidelines: No emojis, only clean Lucide library icons, human-designed clinical SaaS layout.
- **Acceptance Criteria:**
  1. Microservice endpoints `POST /api/v1/ai/predict` and `POST /api/v1/ai/anomaly` operational with Pydantic validation and `"source": "simulation"`.
  2. Model outputs forecasts at $+15$, $+30$, and $+45$ minutes with bounded physiological values ($[40, 400]$ mg/dL).
  3. Anomaly detection identifies extreme sudden spikes or drops.
  4. Unit and integration tests pass in Python (`pytest`) and Node (`node --test`).
  5. Dashboard Recharts displays future trajectory line alongside real-time points without rendering glitches.
- **Expected Deliverables:**
  - `services/ai-engine/models/forecaster.py`
  - `services/ai-engine/models/anomaly_detector.py`
  - `services/ai-engine/models/trend_analyzer.py`
  - `services/ai-engine/routes/prediction_routes.py`
  - `services/ai-engine/tests/test_ai_engine.py`
  - `apps/api/src/services/ai.service.js`
  - `apps/web/src/components/AIPredictionCard.jsx`
  - Updated `apps/web/src/components/GlucoseChart.jsx` (with forecast trajectory)
- **Verification Evidence:**
  - `pytest` passes all tests with 0 failures.
  - Calling `/api/v1/ai/predict` returns valid forecasts and confidence bounds.
  - Dotted forecast line renders on `http://localhost:3000`.

---

### `TASK-INT-01`: Real-Time E2E Pipeline: MongoDB, Socket.IO Gateway & Interactive Next.js Dashboard
- **Module:** M2 (Data Pipeline) + M3 (Real-Time Dashboard)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** `TASK-M1-01`
- **Description:**  
  Bridge the Virtual CGM Simulator (M1) with the Express Backend (M2) and Next.js Frontend (M3):
  1. Configure MongoDB Atlas connection using provided credentials with Mongoose schema for `GlucoseReading`.
  2. Implement Socket.IO on Express server emitting `cgm:reading`, `cgm:status`, and `cgm:event`.
  3. Provide REST endpoints to control the simulator from the browser:
     - `GET /api/v1/simulator/status`
     - `GET /api/v1/simulator/personas`
     - `POST /api/v1/simulator/start` (personaId, intervalMs)
     - `POST /api/v1/simulator/pause`
     - `POST /api/v1/simulator/resume`
     - `POST /api/v1/simulator/stop`
     - `POST /api/v1/simulator/inject` (eventType)
     - `GET /api/v1/cgm/history?deviceId=...&limit=50`
  4. Ingest each reading into MongoDB and broadcast simultaneously over Socket.IO.
  5. Build the complete interactive Patient Dashboard in `apps/web/src/app/page.js`:
     - Persona selector dropdown (VP-01 through VP-06).
     - Simulator Control buttons (`Start`, `Pause`, `Resume`, `Stop`).
     - Real-time Recharts line chart streaming live glucose points with Target Zone overlay (70–180 mg/dL green band).
     - Big Metric Display: Current glucose (e.g. 142 mg/dL), colored status pill, trend arrow (`↑↑`, `↑`, `→`, `↓`, `↓↓`), and rate of change ($dG/dt$).
     - Single-click manual event injection buttons:
       * 🍕 Inject Meal Spike
       * 📉 Inject Hypo Drop
       * 🏃 Inject Workout
       * 🍭 Inject Rescue Carbs
       * 🔄 Reset Baseline
     - Connection indicator (Socket.IO Connected / Disconnected).
     - Persistent simulation disclaimer banner per ADR-007.
- **Acceptance Criteria:**
  1. MongoDB connects successfully with URI in `apps/api/.env`.
  2. Telemetry readings are persisted in MongoDB `GlucoseReadings` collection with compound index on `{ deviceId: 1, timestamp: -1 }`.
  3. Socket.IO connection is established between `apps/web` and `apps/api`.
  4. Dashboard at `http://localhost:3000` enables full interactive control of the simulator without terminal commands.
  5. Clicking "Start Simulation" starts the stream and Recharts graph updates live every tick.
  6. Clicking "Inject Hypo Drop" triggers rapid decline on graph; clicking "Inject Meal Spike" causes curve to rise.
  7. Unit/integration tests verify API endpoints and Mongoose models.
- **Expected Deliverables:**
  - `apps/api/.env` (with MongoDB credentials)
  - `apps/api/src/config/db.js`
  - `apps/api/src/models/glucoseReading.model.js`
  - `apps/api/src/sockets/cgmSocket.js`
  - `apps/api/src/routes/simulator.routes.js`
  - `apps/api/src/routes/cgm.routes.js`
  - `apps/api/src/server.js` (integrated with Socket.IO)
  - `apps/web/src/app/page.js` (complete live interactive dashboard)
  - `apps/web/src/components/GlucoseChart.jsx`
  - `apps/web/src/components/SimulatorControls.jsx`
  - `apps/web/src/components/MetricCards.jsx`
- **Verification Evidence:**
  - Tests pass for simulator and API routes.
  - Browser on `http://localhost:3000` shows live interactive chart moving when simulator is started.

---

### `TASK-M0-01`: Monorepo Workspace Initialization & Tooling Setup
- **Module:** M0 (Foundation / Infrastructure)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** None
- **Description:**  
  Initialize the single Git monorepo structure as approved in `docs/PROJECT_MASTER_PLAN.md`. Configure root package management, directory workspaces (`apps/web`, `apps/api`, `services/ai-engine`, `docs`, `infrastructure`), shared linting, formatting, environment variable templates (`.env.example`), and base README files.
- **Acceptance Criteria:**
  1. Monorepo folder hierarchy created exactly as:
     - `apps/web` (Next.js 14+ with Tailwind CSS)
     - `apps/api` (Node.js/Express)
     - `services/ai-engine` (Python virtualenv / requirements.txt)
     - `infrastructure` (Docker Compose / setup scripts)
     - `docs` (Architecture & project docs)
  2. Root `package.json` configured with npm/pnpm workspaces coordinating `apps/web` and `apps/api`.
  3. Base `services/ai-engine/pyproject.toml` or `requirements.txt` configured with FastAPI, Uvicorn, Scikit-learn, Pandas, and NumPy.
  4. Root `.gitignore` correctly excluding `node_modules`, `.next`, `__pycache__`, `.env`, and OS artifacts.
  5. Sample `.env.example` placed in `apps/api/`, `apps/web/`, and `services/ai-engine/`.
  6. Health-check endpoint stubbed in `apps/api` (`GET /health`) returning `{ status: "ok", service: "api" }`.
  7. Health-check endpoint stubbed in `services/ai-engine` (`GET /health`) returning `{ "status": "ok", "service": "ai-engine" }`.
  8. Base unit test run script configured and passing (`npm test` in api and web; `pytest` in ai-engine).
- **Expected Deliverables:**
  - Root `package.json`
  - `apps/api/package.json`, `apps/api/src/server.js`, `apps/api/.env.example`
  - `apps/web/package.json`, `apps/web/src/app/page.js` or `pages/`, `apps/web/.env.example`
  - `services/ai-engine/requirements.txt`, `services/ai-engine/main.py`, `services/ai-engine/.env.example`
  - `.gitignore`, `README.md`
- **Verification Evidence:**
  - `npm run lint` and `npm test` exit with code 0.
  - Manual curl/invoke of both `/health` endpoints succeeds.

---

### `TASK-M1-01`: Virtual CGM Simulator Engine with 6 Personas & Event Injection
- **Module:** M1 (Virtual CGM Simulator)
- **Status:** **`APPROVED`**
- **Assignee:** Developer AI
- **Dependencies:** None (Self-contained in `apps/api/src/simulator/`)
- **Description:**  
  Implement the Virtual CGM simulation engine emulating continuous interstitial glucose dynamics for 6 distinct clinical personas (VP-01 Healthy, VP-02 Well-Managed T1D, VP-03 Brittle T1D, VP-04 Type 2, VP-05 Pre-diabetes, VP-06 Athlete). Support dynamic manual event injection (Carb Meal Spike, Rapid Hypo Drop, Exercise Drawdown, Rescue Carbs, Reset to Normal), dual execution speeds (Demo: 3s/tick vs Real-time: 5m/tick), and an interactive terminal runner.
- **Acceptance Criteria:**
  1. 6 Virtual Patient Personas defined with distinct basal levels, noise tolerances, target bands, and recovery rates.
  2. Mathematical model computes continuous interstitial glucose:
     $$\text{Glucose}(t) = \text{Baseline} + \text{CircadianDrift}(t) + \text{ActiveEvents}(t) + \text{AR}(1)\text{ noise}$$
     clamped strictly within physiological limits ($40$ to $400$ mg/dL).
  3. Dynamic manual event injection system supporting:
     - `meal_spike`: Rapid carbohydrate influx peaking in 20–30 min ($+60$ to $+100$ mg/dL) with gradual clearance.
     - `hypo_drop`: Rapid descent ($<-2.5$ mg/dL/min) dropping below $70$ mg/dL down to $50–55$ mg/dL.
     - `exercise`: Muscle uptake drawdown ($-1.5$ mg/dL/min).
     - `rescue_carbs`: Fast-acting recovery curve.
     - `reset`: Smooth return to baseline.
  4. Telemetry output schema strictly formatted:
     ```json
     {
       "deviceId": "VIRTUAL_CGM_VP03",
       "userId": "usr_patient_03",
       "persona": "Brittle Type 1 (High Risk)",
       "glucose": 142,
       "unit": "mg/dL",
       "trend": "rising",
       "trendArrow": "↑",
       "rateOfChange": 1.4,
       "timestamp": "2026-11-15T11:15:00.000Z",
       "activeEvent": "meal_spike",
       "batteryLevel": 98,
       "source": "simulation"
     }
     ```
  5. Mandatory `"source": "simulation"` present in all readings.
  6. Controller class `SimulatorEngine` providing:
     - `start(personaId, options)`
     - `pause()`
     - `resume()`
     - `stop()`
     - `injectEvent(eventType)`
     - `setSpeed(intervalMs)`
     - `onReading(callback)`
  7. Terminal CLI runner (`apps/api/src/simulator/runner.js`) allowing user to pick a persona, start live simulation, and see streaming readings with trend arrows (↑↑, ↑, →, ↓, ↓↓).
  8. Comprehensive automated test suite validating physiological bounds, continuity, persona baselines, and event injection dynamics with zero NaN/null values.
- **Expected Deliverables:**
  - `apps/api/src/simulator/personas.js`
  - `apps/api/src/simulator/glucoseModel.js`
  - `apps/api/src/simulator/eventInjector.js`
  - `apps/api/src/simulator/simulatorEngine.js`
  - `apps/api/src/simulator/runner.js`
  - `apps/api/src/simulator/tests/simulator.test.js`
  - `apps/api/package.json`
- **Verification Evidence:**
  - `npm test` passes with 100% assertions satisfied.
  - Running `node apps/api/src/simulator/runner.js` produces continuous simulated telemetry ticks.

