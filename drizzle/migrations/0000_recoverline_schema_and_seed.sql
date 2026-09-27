-- Enums
CREATE TYPE public.task_type AS ENUM ('medication','wound_care','follow_up','warning_sign');
CREATE TYPE public.task_status AS ENUM ('pending','done');
CREATE TYPE public.checkin_channel AS ENUM ('sms','simulated');
CREATE TYPE public.parsed_status AS ENUM ('pending','routine','concerning','unclear');
CREATE TYPE public.escalation_severity AS ENUM ('URGENT','WATCH','CONTACT_FAILURE','UNCLEAR');
CREATE TYPE public.escalation_status AS ENUM ('open','resolved');

CREATE TABLE public.caregivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  relation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caregivers TO authenticated;
GRANT ALL ON public.caregivers TO service_role;
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage caregivers" ON public.caregivers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  discharge_date date NOT NULL,
  caregiver_id uuid REFERENCES public.caregivers(id) ON DELETE SET NULL,
  document_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.discharge_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  description text NOT NULL,
  type public.task_type NOT NULL DEFAULT 'follow_up',
  recovery_day int NOT NULL DEFAULT 1,
  status public.task_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discharge_tasks TO authenticated;
GRANT ALL ON public.discharge_tasks TO service_role;
ALTER TABLE public.discharge_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage tasks" ON public.discharge_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.discharge_tasks(id) ON DELETE SET NULL,
  channel public.checkin_channel NOT NULL DEFAULT 'sms',
  message_body text,
  raw_response text,
  parsed_status public.parsed_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz NOT NULL DEFAULT now(),
  -- DEMO: response window compressed to 5 minutes so the WATCH / CONTACT_FAILURE
  -- flow can be demonstrated live. Production would use hours, not minutes.
  response_deadline timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  missed_count int NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage checkins" ON public.checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid REFERENCES public.checkins(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  reason text NOT NULL,
  severity public.escalation_severity NOT NULL,
  status public.escalation_status NOT NULL DEFAULT 'open',
  resolved_by text,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage escalations" ON public.escalations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read audit" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ── Synthetic demo seed data ────────────────────────────────────────────────
INSERT INTO public.caregivers (id, name, phone, relation) VALUES
 ('11111111-1111-1111-1111-111111111101','Dana Whitfield','+15550100201','Daughter'),
 ('11111111-1111-1111-1111-111111111102','Marcus Ellery','+15550100202','Son'),
 ('11111111-1111-1111-1111-111111111103','Priya Raman','+15550100203','Spouse'),
 ('11111111-1111-1111-1111-111111111104','Joan Alvarez','+15550100204','Neighbor'),
 ('11111111-1111-1111-1111-111111111105','Terrence Boyd','+15550100205','Brother');

INSERT INTO public.patients (id, name, phone, discharge_date, caregiver_id) VALUES
 ('22222222-2222-2222-2222-222222222201','Eleanor Whitfield', '+15550100101', CURRENT_DATE - 4, '11111111-1111-1111-1111-111111111101'),
 ('22222222-2222-2222-2222-222222222202','Harold Ellery',     '+15550100102', CURRENT_DATE - 6, '11111111-1111-1111-1111-111111111102'),
 ('22222222-2222-2222-2222-222222222203','Sunita Raman',      '+15550100103', CURRENT_DATE - 2, '11111111-1111-1111-1111-111111111103'),
 ('22222222-2222-2222-2222-222222222204','Gerald Fontaine',   '+15550100104', CURRENT_DATE - 9, '11111111-1111-1111-1111-111111111104'),
 ('22222222-2222-2222-2222-222222222205','Miriam Boyd',       '+15550100105', CURRENT_DATE - 1, '11111111-1111-1111-1111-111111111105');

INSERT INTO public.discharge_tasks (id, patient_id, description, type, recovery_day, status) VALUES
 ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222201','Take amoxicillin 500mg twice daily','medication',1,'done'),
 ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222201','Change the dressing on the incision','wound_care',4,'pending'),
 ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222201','Attend follow-up appointment with surgeon','follow_up',10,'pending'),
 ('33333333-3333-3333-3333-333333333304','22222222-2222-2222-2222-222222222202','Keep the surgical site dry and covered','wound_care',1,'done'),
 ('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222202','Watch for fever above 101F or spreading redness','warning_sign',6,'pending'),
 ('33333333-3333-3333-3333-333333333306','22222222-2222-2222-2222-222222222203','Short walks twice a day to prevent clots','follow_up',2,'pending'),
 ('33333333-3333-3333-3333-333333333307','22222222-2222-2222-2222-222222222203','Take prescribed blood thinner each morning','medication',2,'pending'),
 ('33333333-3333-3333-3333-333333333308','22222222-2222-2222-2222-222222222204','Daily wound irrigation and gauze change','wound_care',9,'pending'),
 ('33333333-3333-3333-3333-333333333309','22222222-2222-2222-2222-222222222204','Complete the full antibiotic course','medication',3,'done'),
 ('33333333-3333-3333-3333-333333333310','22222222-2222-2222-2222-222222222205','Rest and limit stairs for the first week','follow_up',1,'pending');

INSERT INTO public.checkins (id, patient_id, task_id, channel, message_body, raw_response, parsed_status, sent_at, response_deadline, missed_count) VALUES
 ('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222201','33333333-3333-3333-3333-333333333302','sms','Day 4 check-in: were you able to change the dressing today? Reply 1 for yes, 2 for no, or tell me in your own words.','1 - did it this morning, feeling fine','routine', now() - interval '3 hours', now() - interval '2 hours 55 minutes',0),
 ('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222202','33333333-3333-3333-3333-333333333305','sms','Day 6 check-in: any fever or spreading redness around the site?','i guess it is ok, hard to say','unclear', now() - interval '90 minutes', now() - interval '85 minutes',0),
 ('44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222203','33333333-3333-3333-3333-333333333307','sms','Day 2 check-in: did you take your blood thinner this morning?','yes took it, but my calf is swollen and hot','concerning', now() - interval '40 minutes', now() - interval '35 minutes',0),
 ('44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222204','33333333-3333-3333-3333-333333333308','sms','Day 9 check-in: were you able to do the wound irrigation today?',NULL,'pending', now() - interval '3 hours', now() - interval '2 hours 55 minutes',2),
 ('44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222205','33333333-3333-3333-3333-333333333310','sms','Day 1 check-in: how is the resting going today?','all good here, thank you','routine', now() - interval '20 hours', now() - interval '19 hours 55 minutes',0);

INSERT INTO public.escalations (id, checkin_id, patient_id, reason, severity, status) VALUES
 ('55555555-5555-5555-5555-555555555501','44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222202','Reply needs human review','UNCLEAR','open'),
 ('55555555-5555-5555-5555-555555555502','44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222203','Patient reported a concerning symptom','URGENT','open'),
 ('55555555-5555-5555-5555-555555555503','44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222204','Unable to reach patient after 2 attempts','CONTACT_FAILURE','open');

INSERT INTO public.audit_log (entity_type, entity_id, action, actor, created_at) VALUES
 ('checkin','44444444-4444-4444-4444-444444444401','checkin_sent','system', now() - interval '3 hours'),
 ('checkin','44444444-4444-4444-4444-444444444401','reply_parsed_routine','system', now() - interval '2 hours 50 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444402','checkin_sent','system', now() - interval '90 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444402','reply_parsed_unclear','system', now() - interval '80 minutes'),
 ('escalation','55555555-5555-5555-5555-555555555501','escalation_created_UNCLEAR','system', now() - interval '80 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444403','checkin_sent','system', now() - interval '40 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444403','reply_parsed_concerning','system', now() - interval '30 minutes'),
 ('escalation','55555555-5555-5555-5555-555555555502','escalation_created_URGENT','system', now() - interval '30 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444404','checkin_missed_1','system', now() - interval '2 hours 50 minutes'),
 ('checkin','44444444-4444-4444-4444-444444444404','checkin_missed_2','system', now() - interval '2 hours 40 minutes'),
 ('escalation','55555555-5555-5555-5555-555555555503','escalation_created_CONTACT_FAILURE','system', now() - interval '2 hours 40 minutes');