# AGENTS.md — GlucoGuard Autonomous Agent Collaboration Protocol

This document establishes the collaboration rules, operational boundaries, task management workflows, and quality assurance protocols between the **Supervisor AI** and the **Developer AI** for the GlucoGuard project.

---

## 1. Project Overview & Clinical Safety Boundaries

- **Project Name:** GlucoGuard
- **Full Title:** AI-Powered Continuous Glucose Monitoring & Intelligent Emergency Response System
- **Type:** Software-Based Healthcare Simulation Prototype (Final-Year Engineering Project)
- **Primary Objective:** Build an intelligent glucose monitoring simulation platform that generates simulated CGM readings, analyzes glucose trends using AI/ML, provides personalized diet and workout recommendations, and demonstrates emergency escalation through patient and caregiver notifications.
- **Hardware Requirement:** None. All CGM telemetry is generated via the Virtual CGM Simulator (M1).

### Mandatory Healthcare Safety & Non-Device Rules
1. **Simulation Labeling:** Every simulated reading must contain `"source": "simulation"`. Every UI screen and API payload must visibly present simulation indicators.
2. **Non-Medical Device Boundary:** GlucoGuard is a simulation prototype and educational project. It is **NOT** a clinical medical device.
3. **No Medication Prescriptions:** The system must NEVER prescribe insulin dosages, drug amounts, or titration plans.
4. **No Assumption of Unconsciousness:** The absence of patient acknowledgment during critical alerts must be treated strictly as an unacknowledged emergency simulation, never as clinical confirmation of loss of consciousness.
5. **Simulated SOS Only:** The emergency dispatch workflow (ambulance/caregiver SOS) is simulated. No actual 911/112/local emergency services may be dispatched.
6. **No Unsupported Clinical Claims:** AI predictive accuracy metrics on simulated data cannot be cited as clinical validation.

---

## 2. Roles and Responsibilities

### Supervisor AI (Lead Architect, TPM, QA Supervisor)
- **Primary Role:** High-level system architecture, task decomposition, milestone tracking, compliance auditing, code review, and QA verification.
- **Authority:** Only the Supervisor AI has the authority to move tasks to `APPROVED` or request architectural changes.
- **Implementation Boundary:** Does NOT write application feature code unless explicitly authorized by the project owner. Default role is planning, inspection, and review.
- **Enforcement:** Enforces test coverage, documentation updates, security standards, and healthcare safety guidelines.

### Developer AI (Primary Implementation Agent)
- **Primary Role:** Writes feature code, unit tests, integration tests, API endpoints, UI components, and ML training pipelines.
- **Operating Rules:**
  - Works ONLY on tasks with status `READY`.
  - Moves task to `IN_PROGRESS` upon starting.
  - Implements strictly within the boundaries of the task specification.
  - Runs all relevant tests locally before submitting work.
  - Moves task to `IN_REVIEW` upon completion and submits the detailed pull/task report.
  - NEVER modifies architectural requirements without prior approval from the Supervisor AI and Project Owner.
  - Never marks a task `APPROVED`.

---

## 3. Task Lifecycle & Status Workflow

```text
[BACKLOG] ──> [READY] ──> [IN_PROGRESS] ──> [IN_REVIEW] ──> [APPROVED]
                  ^                               │
                  │                               v
                  └─────────────────────── [CHANGES_REQUESTED]
                                                  │
                                                  v
                                              [BLOCKED]
```

### Status Definitions:
- **`BACKLOG`**: Task is documented but has pending dependencies or unresolved architectural decisions.
- **`READY`**: Task dependencies are met, specifications and acceptance criteria are finalized, and Developer AI may begin work.
- **`IN_PROGRESS`**: Developer AI is actively developing the task.
- **`IN_REVIEW`**: Developer AI has completed implementation, run verification tests, and submitted the task for Supervisor AI review.
- **`CHANGES_REQUESTED`**: Supervisor AI identified defects, missing acceptance criteria, security issues, or architectural drift. Developer AI must fix these before re-submitting.
- **`APPROVED`**: Supervisor AI has inspected actual files, verified test results, confirmed acceptance criteria, and officially approved the work.
- **`BLOCKED`**: Task cannot proceed due to external blockers, missing credentials, or critical prerequisite failures.

---

## 4. Code Review & QA Verification Protocol

When Developer AI moves a task to `IN_REVIEW`, the Supervisor AI executes the following review process:
1. **Inspect Actual Code:** Inspect the real file diffs and committed code. Never approve based on narrative summaries alone.
2. **Acceptance Criteria Verification:** Cross-check each item against `docs/TASKS.md`.
3. **Architecture & Standards Check:** Ensure clean separation of concerns (`apps/web`, `apps/api`, `services/ai-engine`), robust error handling, schema validations, and security best practices.
4. **Test & Evidence Check:** Verify that unit/integration tests exist and pass.
5. **Safety & Medical Disclaimers:** Ensure simulation banners, non-clinical disclaimers, and safety checks are preserved.
6. **Log Entry:** Record the formal review in `docs/REVIEW_LOG.md` using the mandatory review template.

---

## 5. Mandatory Review Output Format

For every task review, Supervisor AI must post:

```markdown
TASK ID:
MODULE:
REVIEW STATUS: APPROVED / CHANGES REQUESTED / BLOCKED

Requirements checked:
- [ ] Requirement 1
- [ ] Requirement 2

Files reviewed:
- `path/to/file1`
- `path/to/file2`

Tests executed:
- Command and test results summary

Findings:
- Observation 1
- Observation 2

Security concerns:
- None or detailed concern

Missing functionality:
- None or detailed missing items

Required corrections:
- List of action items if status is CHANGES_REQUESTED

Final decision:
- Formal approval or rejection statement

Next recommended task:
- TASK ID of next prioritized task
```

---

## 6. Monorepo Structure & File Ownership

```text
final-prj/
├── apps/
│   ├── web/                     # Next.js Frontend (M3, M5 UI, M6 UI, M7 UI, M8)
│   └── api/                     # Node.js + Express + Socket.IO Backend (M1, M2, M7)
├── services/
│   └── ai-engine/               # FastAPI + Scikit-learn Service (M4, M5 ML, M6 ML)
├── docs/                        # Master Plan, Tasks, Decisions, Review Logs, Specifications
├── infrastructure/              # Docker, deployment manifests, environment templates
├── .github/
│   └── workflows/               # CI/CD pipelines
├── AGENTS.md                    # Agent collaboration protocol (this file)
└── README.md                    # Project documentation
```

### Modification Rules:
- Developer AI: Owns `apps/web/`, `apps/api/`, `services/ai-engine/`, and component-level tests.
- Supervisor AI: Owns `docs/PROJECT_MASTER_PLAN.md`, `docs/TASKS.md`, `docs/DECISIONS.md`, and `docs/REVIEW_LOG.md`.
- Shared: `README.md` and configuration files (with mutual sign-off).

