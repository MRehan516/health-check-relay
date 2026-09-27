import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Twilio inbound-reply webhook. Twilio is a pure transport layer: this route
 * verifies the signature, parses the reply with Claude, then runs the
 * deterministic rule engine.
 */
export const Route = createFileRoute("/api/public/twilio/reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env["TWILIO_AUTH_TOKEN"];
        const signature = request.headers.get("X-Twilio-Signature") ?? "";
        const raw = await request.text();
        const params = new URLSearchParams(raw);

        if (!authToken) {
          return new Response("Twilio auth token not configured", { status: 503 });
        }

        // Twilio signature: HMAC-SHA1 of the full public URL plus sorted POST params.
        // Behind the hosting proxy request.url may be internal, so rebuild it
        // from forwarded headers to match the URL Twilio actually called.
        const u = new URL(request.url);
        const host = request.headers.get("x-forwarded-host") ?? u.host;
        const proto = request.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
        const url = `${proto}://${host}${u.pathname}${u.search}`;
        const sorted = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
        const payload = url + sorted.map(([k, v]) => k + v).join("");
        const expected = createHmac("sha1", authToken).update(payload).digest("base64");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("audit_log").insert({
            entity_type: "webhook",
            action: "rejected_invalid_twilio_signature",
            actor: "system",
          });
          return new Response("Invalid signature", { status: 401 });
        }

        const from = params.get("From") ?? "";
        const body = params.get("Body") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { classifyReply, applyReplyRules } = await import("@/lib/rule-engine.server");

        const { data: patient } = await supabaseAdmin
          .from("patients")
          .select("id, phone")
          .eq("phone", from)
          .maybeSingle();
        if (!patient) return new Response("<Response/>", { status: 200 });

        const { data: checkin } = await supabaseAdmin
          .from("checkins")
          .select("id, patient_id")
          .eq("patient_id", patient.id)
          .eq("parsed_status", "pending")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!checkin) return new Response("<Response/>", { status: 200 });

        const classification = await classifyReply(body);
        await applyReplyRules(
          supabaseAdmin as any,
          checkin as any,
          classification.status,
          body,
          patient.phone,
        );

        return new Response("<Response/>", {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      },
    },
  },
});
