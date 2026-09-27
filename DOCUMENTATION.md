# RecoverLine Implementation Documentation

RecoverLine is a post-discharge patient check-in and escalation system designed to bridge the gap between hospital discharge and home recovery using automated SMS check-ins and AI-assisted triage.

## 🏗 Architecture Overview

The application is built on **TanStack Start**, leveraging server-side rendering (SSR) and a unified routing/data-fetching model.

- **Frontend**: React 19, Tailwind CSS 4, TanStack Router, and TanStack Query.
- **Backend**: TanStack Start Server Functions and API Routes.
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS).
- **AI/ML**: Anthropic Claude 3.5 Sonnet via the Lovable AI Gateway for:
    - Extracting recovery tasks from discharge documents (PDF/Images).
    - Classifying patient SMS replies into structured statuses.
- **Transport**: Twilio for bidirectional SMS communication.
- **Rule Engine**: A deterministic server-side engine (`src/lib/rule-engine.server.ts`) that processes classified replies and manages escalations.

## 🗄 Database Entities & Relationships

The schema is defined in `drizzle/migrations/0000_recoverline_schema_and_seed.sql`.

- **caregivers**: Stores contact info for patient advocates.
    - `id (UUID)`, `name`, `phone (E.164)`, `relation`.
- **patients**: The central entity.
    - `id (UUID)`, `name`, `phone (E.164)`, `discharge_date (DATE)`.
    - Relationship: Belongs to one **caregiver**.
- **discharge_tasks**: Recovery plan items extracted from documents.
    - `patient_id`, `description`, `type` (medication, wound_care, etc.), `recovery_day` (offset from discharge).
- **checkins**: Records of outbound SMS and inbound responses.
    - `patient_id`, `task_id`, `parsed_status` (pending, routine, concerning, unclear), `response_deadline`, `missed_count`.
- **escalations**: Alerts requiring human intervention.
    - `checkin_id`, `severity` (URGENT, WATCH, CONTACT_FAILURE, UNCLEAR), `status` (open/resolved).
- **audit_log**: Comprehensive trail of all system and user actions.

## 🔄 Key Logic Flows

### 1. Patient Intake & OCR (`src/routes/_authenticated/patients.new.tsx`)
- Coordinator enters patient/caregiver details and uploads a discharge document.
- `extractDischarge` server function sends the document to Claude.
- Claude returns a JSON recovery plan, which is persisted to `discharge_tasks`.

### 2. Check-in Lifecycle (`src/routes/api/public/cron/sweep.ts`)
- A scheduled "sweep" runs (simulated every minute for demo).
- **Outbound**: For each patient, if today matches a task's `recovery_day`, an SMS is sent via Twilio.
- **Deadline Monitoring**: If a check-in's `response_deadline` passes without a reply, `applyMissedRules` is triggered.
    - **1st Miss**: Escalation: `WATCH`, auto-resend SMS.
    - **2nd Miss**: Escalation: `CONTACT_FAILURE`, notify caregiver.

### 3. Reply Handling & Rule Engine (`src/lib/rule-engine.server.ts`)
- **Inbound**: Twilio calls `src/routes/api/public/twilio/reply.ts`.
- **Validation**: Webhook signature is verified using `TWILIO_AUTH_TOKEN`.
- **AI Classification**: Claude parses the reply into `routine`, `concerning`, or `unclear`.
- **Deterministic Rules**:
    - `concerning` → `URGENT` escalation + Caregiver notification.
    - `unclear` → `UNCLEAR` escalation + Automated clarifying follow-up SMS.
    - `routine` → Logged, no escalation.

## 🚦 Routes

- **Public**:
    - `/`: Landing page and vision.
    - `/about`: Project policy and technology stack.
    - `/auth`: Supabase Auth (Email/Password).
- **Authenticated**:
    - `/dashboard`: Primary coordinator interface (Patient list, Timeline, Check-in history, Escalation management).
    - `/patients/new`: Intake form and document upload.
    - `/audit`: Live feed of the `audit_log`.
- **API**:
    - `/api/public/cron/sweep`: Scheduled automation (POST).
    - `/api/public/twilio/reply`: Twilio webhook endpoint (POST).

## 🛡 Security & Compliance

- **Authentication**: Managed via Supabase Auth (`src/integrations/supabase/auth-middleware.ts`).
- **Authorization**: Row-Level Security (RLS) is enabled on all tables, restricting access to authenticated coordinators.
- **Webhook Integrity**: `HMAC-SHA1` signature validation for all Twilio callbacks.
- **Data Privacy**: The system is a **prototype** for synthetic data only and is **not HIPAA compliant**.

## 🛠 Setup & Environment

Required environment variables:
- `LOVABLE_API_KEY`: For AI Gateway access.
- `TWILIO_API_KEY`: Twilio API key for sending SMS.
- `TWILIO_AUTH_TOKEN`: For webhook signature verification.
- `TWILIO_FROM_NUMBER`: The SMS sender number.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: For administrative DB access in API routes.

## ⚠️ Limitations
- **Demo Compression**: The response deadline is set to 5 minutes (instead of hours) to facilitate live demonstrations.
- **Single Tenant**: Built for a single care coordinator role.
- **Synthetic Only**: AI prompts and UI warnings strictly forbid real PHI (Protected Health Information).
