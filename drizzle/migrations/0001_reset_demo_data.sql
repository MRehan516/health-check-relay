-- Re-seeds the synthetic demo patients relative to "now" so recovery days and
-- statuses never drift before a live demo. Only touches the fixed demo IDs;
-- coordinator-added patients are left alone.
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_patients uuid[] := ARRAY[
    '22222222-2222-2222-2222-222222222201','22222222-2222-2222-2222-222222222202',
    '22222222-2222-2222-2222-222222222203','22222222-2222-2222-2222-222222222204',
    '22222222-2222-2222-2222-222222222205']::uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  DELETE FROM public.escalations WHERE patient_id = ANY(demo_patients);
  DELETE FROM public.checkins WHERE patient_id = ANY(demo_patients);
  DELETE FROM public.discharge_tasks WHERE patient_id = ANY(demo_patients);
  DELETE FROM public.patients WHERE id = ANY(demo_patients);

  INSERT INTO public.caregivers (id, name, phone, relation) VALUES
   ('11111111-1111-1111-1111-111111111101','Dana Whitfield','+15550100201','Daughter'),
   ('11111111-1111-1111-1111-111111111102','Marcus Ellery','+15550100202','Son'),
   ('11111111-1111-1111-1111-111111111103','Priya Raman','+15550100203','Spouse'),
   ('11111111-1111-1111-1111-111111111104','Joan Alvarez','+15550100204','Neighbor'),
   ('11111111-1111-1111-1111-111111111105','Terrence Boyd','+15550100205','Brother')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.patients (id, name, phone, discharge_date, caregiver_id) VALUES
   ('22222222-2222-2222-2222-222222222201','Eleanor Whitfield','+15550100101', CURRENT_DATE - 4, '11111111-1111-1111-1111-111111111101'),
   ('22222222-2222-2222-2222-222222222202','Harold Ellery',    '+15550100102', CURRENT_DATE - 6, '11111111-1111-1111-1111-111111111102'),
   ('22222222-2222-2222-2222-222222222203','Sunita Raman',     '+15550100103', CURRENT_DATE - 2, '11111111-1111-1111-1111-111111111103'),
   ('22222222-2222-2222-2222-222222222204','Gerald Fontaine',  '+15550100104', CURRENT_DATE - 9, '11111111-1111-1111-1111-111111111104'),
   ('22222222-2222-2222-2222-222222222205','Miriam Boyd',      '+15550100105', CURRENT_DATE - 1, '11111111-1111-1111-1111-111111111105');

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

  -- Miriam is the Watch patient: one missed attempt, retry pending (5-minute demo window;
  -- production would use hours, not minutes).
  INSERT INTO public.checkins (id, patient_id, task_id, channel, message_body, raw_response, parsed_status, sent_at, response_deadline, missed_count) VALUES
   ('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222201','33333333-3333-3333-3333-333333333302','sms','Day 4 check-in: were you able to change the dressing today? Reply 1 for yes, 2 for no, or tell me in your own words.','1 - did it this morning, feeling fine','routine', now() - interval '3 hours', now() - interval '2 hours 55 minutes',0),
   ('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222202','33333333-3333-3333-3333-333333333305','sms','Day 6 check-in: any fever or spreading redness around the site?','i guess it is ok, hard to say','unclear', now() - interval '90 minutes', now() - interval '85 minutes',0),
   ('44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222203','33333333-3333-3333-3333-333333333307','sms','Day 2 check-in: did you take your blood thinner this morning?','yes took it, but my calf is swollen and hot','concerning', now() - interval '40 minutes', now() - interval '35 minutes',0),
   ('44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222204','33333333-3333-3333-3333-333333333308','sms','Day 9 check-in: were you able to do the wound irrigation today?',NULL,'pending', now() - interval '3 hours', now() - interval '2 hours 55 minutes',2),
   ('44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222205','33333333-3333-3333-3333-333333333310','sms','Day 1 check-in: how is the resting going today?',NULL,'pending', now() - interval '6 minutes', now() + interval '4 minutes',1);

  INSERT INTO public.escalations (id, checkin_id, patient_id, reason, severity, status) VALUES
   ('55555555-5555-5555-5555-555555555501','44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222202','Reply needs human review','UNCLEAR','open'),
   ('55555555-5555-5555-5555-555555555502','44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222203','Patient reported a concerning symptom','URGENT','open'),
   ('55555555-5555-5555-5555-555555555503','44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222204','Unable to reach patient after 2 attempts','CONTACT_FAILURE','open'),
   ('55555555-5555-5555-5555-555555555504','44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222205','No reply — retry scheduled','WATCH','open');

  INSERT INTO public.audit_log (entity_type, action, actor)
  VALUES ('demo', 'demo_data_reset', coalesce((auth.jwt() ->> 'email'), auth.uid()::text));
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;