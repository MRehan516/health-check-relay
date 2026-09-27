import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Classify a reply with Claude, then run the deterministic rule engine. */
export const simulateCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patient_id: string; reply: string }) =>
    z.object({ patient_id: z.string().uuid(), reply: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { classifyReply, applyReplyRules, audit } = await import("./rule-engine.server");
    const db = context.supabase as any;

    const { data: patient } = await db
      .from("patients")
      .select("id, phone, discharge_date")
      .eq("id", data.patient_id)
      .single();
    if (!patient) throw new Error("Patient not found");

    const { data: pending } = await db
      .from("checkins")
      .select("id, patient_id")
      .eq("patient_id", data.patient_id)
      .eq("parsed_status", "pending")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let checkin = pending;
    if (!checkin) {
      const { data: created, error } = await db
        .from("checkins")
        .insert({
          patient_id: data.patient_id,
          channel: "simulated",
          message_body: "Simulated check-in",
          parsed_status: "pending",
        })
        .select("id, patient_id")
        .single();
      if (error) throw new Error(error.message);
      checkin = created;
      await audit(db, "checkin", created.id, "checkin_created_simulated");
    }

    const classification = await classifyReply(data.reply);
    await applyReplyRules(db, checkin, classification.status, data.reply, patient.phone);
    return { status: classification.status, keywords: classification.keywords };
  });

/** Send today's check-in for a patient over SMS (Twilio is pure transport). */
export const sendCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patient_id: string }) =>
    z.object({ patient_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sendSms, audit } = await import("./rule-engine.server");
    const db = context.supabase as any;

    const { data: patient } = await db
      .from("patients")
      .select("id, name, phone, discharge_date")
      .eq("id", data.patient_id)
      .single();
    if (!patient) throw new Error("Patient not found");

    const day = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(`${patient.discharge_date}T00:00:00`).getTime()) / 86_400_000,
      ),
    );
    const { data: task } = await db
      .from("discharge_tasks")
      .select("id, description")
      .eq("patient_id", patient.id)
      .eq("recovery_day", day)
      .limit(1)
      .maybeSingle();

    const body = task
      ? `Day ${day} check-in: ${task.description} — were you able to do this today? Reply 1 for yes, 2 for no, or tell me in your own words.`
      : `Day ${day} check-in: how is your recovery going today? Reply 1 if all is well, 2 if not, or tell me in your own words.`;

    const result = await sendSms(patient.phone, body);
    // DEMO WINDOW: 5 minutes. Production would use hours, not minutes.
    const { data: checkin, error } = await db
      .from("checkins")
      .insert({
        patient_id: patient.id,
        task_id: task?.id ?? null,
        channel: "sms",
        message_body: body,
        parsed_status: "pending",
        response_deadline: new Date(Date.now() + 5 * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await audit(db, "checkin", checkin.id, "checkin_sent");
    return { sent: result.sent, note: result.note ?? null, body };
  });

export const resolveEscalation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { escalation_id: string; note?: string }) =>
    z.object({ escalation_id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { audit } = await import("./rule-engine.server");
    const db = context.supabase as any;
    const actor = (context.claims as any)?.email ?? context.userId;
    const { error } = await db
      .from("escalations")
      .update({
        status: "resolved",
        resolved_by: actor,
        resolution_note: data.note ?? null,
      })
      .eq("id", data.escalation_id);
    if (error) throw new Error(error.message);
    await audit(db, "escalation", data.escalation_id, "escalation_resolved", actor);
    return { ok: true };
  });

/** Extract a discharge document into day-by-day recovery tasks. */
export const extractDischarge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patient_id: string; file_base64: string; media_type: string }) =>
    z
      .object({
        patient_id: z.string().uuid(),
        file_base64: z.string().min(10),
        media_type: z.string().min(3),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { extractTasks } = await import("./rule-engine.server");
    const db = context.supabase as any;
    const tasks = await extractTasks(data.file_base64, data.media_type);
    if (!tasks.length) return { inserted: 0 };
    const { error } = await db
      .from("discharge_tasks")
      .insert(tasks.map((t) => ({ ...t, patient_id: data.patient_id, status: "pending" })));
    if (error) throw new Error(error.message);
    return { inserted: tasks.length };
  });
