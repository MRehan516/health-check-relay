# RecoverLine Daily Check-in

Build RecoverLine, a post-discharge patient check-in and escalation prototype for a healthcare hackathon (TigerHacks, health theme). This is a demo/prototype using synthetic data only — do not implement or claim HIPAA compliance or real EHR integration anywhere.



═══════════════════════════════

PROBLEM & SOLUTION

═══════════════════════════════

Problem: Patients leaving the hospital get dense discharge paperwork they often can't read, and once home, nobody proactively checks whether they're okay unless the patient remembers to open an app or portal — which sick, elderly, or exhausted patients often don't do.



Solution: A caregiver/clinician uploads a patient's discharge document. The system extracts it into a day-by-day recovery plan and sends the patient scheduled SMS check-ins (via Twilio) tied to that day's specific task — no app install required for the patient. Replies are parsed by AI into a structured status, but the escalation decision itself is deterministic rule-based logic, not an AI judgment call. If the patient can't be reached after repeated attempts, that contact failure — not an assumption about their condition — triggers a caregiver alert. A dashboard lets a coordinator see every patient at a glance and resolve alerts.



Critical logic principle — implement exactly this, do not soften it:

- A missed check-in means "we could not confirm the patient is okay," NOT "the patient is getting worse." Label it CONTACT_FAILURE, never as a health decline.

- An ambiguous or unclear reply must NEVER silently default to "routine." It gets its own UNCLEAR status that still surfaces on the dashboard for a human to glance at, and triggers one automated clarifying follow-up text ("Can you tell me a bit more — are you in any pain or noticing anything unusual?").



═══════════════════════════════

PLATFORM

═══════════════════════════════

Responsive web app (not a native mobile app) — must work well in both desktop and phone browsers. Mobile-first layout: sidebar collapses to a bottom nav or slide-out drawer under ~768px. Define clear empty states (e.g. "No patients yet — add your first patient" with a button) and loading states for every data-dependent view, so nothing looks broken while data loads or before it's seeded.



═══════════════════════════════

PAGES / SCREENS

═══════════════════════════════

1. Landing page (public): short honest hero — one-sentence headline stating problem+solution, one short paragraph, a "View Dashboard" button, and a brief 3-step visual explainer (Upload discharge doc → Automated check-ins → Caregiver alerted if unreachable). Small note near the bottom: "Hackathon prototype — synthetic demo data only." Footer: "Built with Lovable, Supabase, Twilio, and Anthropic's Claude API" plus a link to the About/Policy page.



2. Login: single email/password via Supabase Auth. Single-user demo, no multi-tenant/org switching. This authenticated user represents a care coordinator role — distinct from the "caregiver" records tied to individual patients, who receive SMS alerts but never log in.



3. Dashboard (authenticated): left sidebar (collapsing per above) with a sort/filter control and the patient list — each row a 3px left-border in its status color plus a small text label (Routine/Watch/Urgent/Contact Failure/Unclear), not a colored chip. Main panel for the selected patient: header with name, discharge date, and current status; a vertical recovery timeline built from discharge_tasks; a check-in history log (plain list); an "Escalations" section where any open alert has a visible "Mark resolved" action with an optional note field; and a clearly labeled "Simulate check-in" button that lets you type a fake patient reply directly (bypassing Twilio), running it through the identical parsing and rule-engine logic as a real SMS reply.



4. Add Patient / Intake page: form for patient name, phone (validate/normalize to E.164 format, e.g. +1XXXXXXXXXX), caregiver name, caregiver phone, discharge date (date picker, defaults to today), plus an upload for a discharge document (image or PDF).



5. Audit Log page (simple table view, accessible from the sidebar): lists every entry from the audit_log table in reverse chronological order — this is a real technical-depth signal, keep it visible and simple, not hidden.



6. About / Policy page (footer link): states plainly this is a hackathon prototype, not a certified medical device, not HIPAA-compliant, uses only synthetic/demo data, and names the tools used to build it (Lovable, Supabase, Twilio, Anthropic Claude API).



Seed the database with 4–5 demo patients on first setup, in a mix of states (one Routine, one Watch, one Urgent, one Contact Failure) so the dashboard never looks empty during a demo.



═══════════════════════════════

DESIGN SYSTEM — do not use generic SaaS/AI-app defaults

═══════════════════════════════

Colors (status colors are ONLY ever used for status indicators — never as decoration, buttons, or backgrounds elsewhere):

- Background: #F6F7F5 (cool, slightly gray-green off-white — not a warm cream)

- Primary text: #1E2321 (near-black with a faint green-gray cast)

- Secondary text/borders: #5B645F

- Primary action color (buttons, links): #2C5F73 (deep slate-teal — not a generic purple/indigo)

- Status: Routine #4B7A64 (muted sage) / Watch #B8823A (muted ochre) / Urgent #A23B2E (restrained brick red) / Contact Failure #5B645F (neutral slate, distinct icon — not a color implying danger) / Unclear: a dotted/outlined variant of the ochre, visually distinct from a solid Watch badge



Typography:

- Headers/wordmark: Fraunces (editorial serif, low optical size), used only for the product name and section titles

- Body/UI: IBM Plex Sans

- Monospace (IBM Plex Mono): reserved ONLY for numeric data needing column alignment — timestamps, day counts, IDs — never for text labels



Layout & interaction rules:

- No rounded "card grid" everywhere — flat sectioned panels with hairline dividers in the main content area

- No ALL-CAPS labels, no middle-dot meta text, no em-dash-style labels, no arrows appended to button text

- Hover on a patient row: quiet ~120ms background tint shift plus a slightly brighter left border — no scale or shadow-pop

- The one deliberately animated moment in the whole app: a check-in reply changing a patient's status makes that row's border sweep to the new color with a single soft pulse — the only orchestrated animation in the app



═══════════════════════════════

DATA MODEL (Supabase / Postgres)

═══════════════════════════════

UUID primary keys (default random generation), row-level security scoped to the authenticated user (single-tenant demo):



caregivers: id, name, phone, relation, created_at

patients: id, name, phone, discharge_date (date, required), caregiver_id (FK → caregivers.id), created_at

discharge_tasks: id, patient_id (FK → patients.id), description, type ('medication'|'wound_care'|'follow_up'|'warning_sign'), recovery_day (int — the day-offset from discharge_date this task applies to, e.g. 1, 4, 10, 14), status ('pending'|'done'), created_at

checkins: id, patient_id (FK → patients.id), task_id (FK → discharge_tasks.id, nullable), channel ('sms'|'simulated'), raw_response, parsed_status ('pending'|'routine'|'concerning'|'unclear'), sent_at, response_deadline (timestamptz — sent_at plus the check-in window), missed_count (int, default 0)

escalations: id, checkin_id (FK → checkins.id), reason, severity ('URGENT'|'WATCH'|'CONTACT_FAILURE'|'UNCLEAR'), status ('open'|'resolved'), resolved_by, resolution_note, created_at

audit_log: id, entity_type, entity_id, action, actor, created_at — insert a row every time a checkin or escalation is created, updated, or resolved



For the demo, set the check-in window (response_deadline) to 5 minutes after sent_at (note in a code comment that a production version would use hours, not minutes — this compression is purely so the WATCH/CONTACT_FAILURE flow can actually be demonstrated live).



═══════════════════════════════

BACKEND LOGIC (Supabase Edge Functions)

═══════════════════════════════

1. extract-discharge: takes the uploaded discharge document image, sends it to the Anthropic Claude API asking for JSON only: {tasks: [{description, type, recovery_day}]}, inserts each into discharge_tasks for that patient.



2. send-checkin: takes a patient_id, finds the discharge_task whose recovery_day matches (today's date − patient.discharge_date), and sends a personalized SMS via Twilio referencing that specific task (e.g. "Day 4 check-in: did you take your antibiotics today? Reply 1 for yes, 2 for no, or tell me in your own words"). Logs a new checkins row with channel 'sms', parsed_status 'pending', and response_deadline set per the demo window above.



3. handle-reply: a webhook Twilio calls when the patient texts back.

   - First, verify the request is genuinely from Twilio by validating the X-Twilio-Signature header against the auth token (reject/log anything that fails this check — this closes the "anyone could fake a reply" hole).

   - Find the most recent pending checkin for that phone number.

   - Send the reply text to Claude asking it to classify as 'routine', 'concerning', or 'unclear' (JSON only, with symptom keywords extracted) — the prompt should explicitly instruct Claude that anything ambiguous, hedging, or not clearly positive must be classified 'unclear', never defaulted to 'routine'.

   - Update the checkins row, then run this exact deterministic rule engine as plain code — NOT another AI call:

     • parsed_status 'concerning' → create escalation severity URGENT, reason "Patient reported a concerning symptom", notify caregiver, status 'open'

     • parsed_status 'unclear' → create escalation severity UNCLEAR, reason "Reply needs human review", send one automated clarifying follow-up text, status 'open'

     • parsed_status 'routine' → no escalation, just log it

     • missed_count reaches 1 (response_deadline passed with no reply) → severity WATCH, reason "No reply — retry scheduled", auto-resend the same check-in once

     • missed_count reaches 2 → severity CONTACT_FAILURE, reason "Unable to reach patient after 2 attempts" (explicitly not a claim about condition), notify caregiver, status 'open'

   - Every write to checkins or escalations inserts a row into audit_log with actor set to 'system'.



4. resolve-escalation: takes an escalation_id and a resolution_note, sets status to 'resolved', resolved_by to the current authenticated user, and inserts an audit_log entry with actor set to the user.



A scheduled job (Supabase's pg_cron or equivalent) runs every minute during the demo window and: (a) sends check-ins for any discharge_task whose recovery_day matches today for patients who haven't been messaged yet today, and (b) sweeps checkins whose response_deadline has passed with parsed_status still 'pending', incrementing missed_count and running the rule engine above.



═══════════════════════════════

TWILIO'S ROLE

═══════════════════════════════

Pure transport layer — sends the outbound check-in SMS (from send-checkin) and delivers the patient's inbound reply as a signed webhook to handle-reply. No decision-making logic lives in Twilio itself.



═══════════════════════════════

SECURITY & ACCESS

═══════════════════════════════

- Anthropic API key and Twilio Account SID/Auth Token stored as Supabase Edge Function secrets only — never in client code or committed to the repo

- All tables have row-level security scoped to the authenticated user; no public/anonymous read access to any patient data table

- The handle-reply webhook validates Twilio's request signature before processing anything

- The About/Policy page states clearly this demo does not store real patient health information

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25181526-6e56-47c5-87c1-daab476095b1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
