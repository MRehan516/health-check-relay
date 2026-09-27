import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled sweep (runs every minute during the demo window):
 * (a) sends check-ins for tasks whose recovery_day matches today,
 * (b) marks check-ins whose response_deadline has passed and runs the rule engine.
 */
export const Route = createFileRoute("/api/public/cron/sweep")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyMissedRules, sendSms, audit } = await import("@/lib/rule-engine.server");
        const db = supabaseAdmin as any;

        let sent = 0;
        let missed = 0;

        // (a) due check-ins
        const { data: patients } = await db
          .from("patients")
          .select("id, name, phone, discharge_date");
        for (const p of patients ?? []) {
          const day = Math.floor(
            (Date.now() - new Date(`${p.discharge_date}T00:00:00`).getTime()) / 86_400_000,
          );
          const { data: task } = await db
            .from("discharge_tasks")
            .select("id, description")
            .eq("patient_id", p.id)
            .eq("recovery_day", day)
            .limit(1)
            .maybeSingle();
          if (!task) continue;
          const since = new Date();
          since.setHours(0, 0, 0, 0);
          const { data: already } = await db
            .from("checkins")
            .select("id")
            .eq("patient_id", p.id)
            .gte("sent_at", since.toISOString())
            .limit(1)
            .maybeSingle();
          if (already) continue;
          const body = `Day ${day} check-in: ${task.description} — were you able to do this today? Reply 1 for yes, 2 for no, or tell me in your own words.`;
          await sendSms(p.phone, body);
          // DEMO WINDOW: 5 minutes. Production would use hours, not minutes.
          const { data: created } = await db
            .from("checkins")
            .insert({
              patient_id: p.id,
              task_id: task.id,
              channel: "sms",
              message_body: body,
              parsed_status: "pending",
              response_deadline: new Date(Date.now() + 5 * 60_000).toISOString(),
            })
            .select("id")
            .single();
          if (created) await audit(db, "checkin", created.id, "checkin_sent");
          sent++;
        }

        // (b) overdue check-ins
        const { data: overdue } = await db
          .from("checkins")
          .select("id, patient_id, message_body, missed_count, patients(phone)")
          .eq("parsed_status", "pending")
          .lt("response_deadline", new Date().toISOString())
          .lt("missed_count", 2);
        for (const c of overdue ?? []) {
          await applyMissedRules(db, c, c.patients?.phone ?? "");
          missed++;
        }

        return Response.json({ ok: true, sent, missed });
      },
    },
  },
});
