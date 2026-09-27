// Server-only: AI reply parsing, SMS transport, and the DETERMINISTIC escalation
// rule engine. The escalation decision is plain code — never an AI judgement.
import type { ParsedStatus, Severity } from "./recoverline";
import { CLARIFYING_FOLLOW_UP } from "./recoverline";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/messages";
const CLAUDE_MODEL = "anthropic/claude-sonnet-5";

async function claude(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, stream: true, ...body }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            text += evt.delta.text;
          }
        } catch {
          /* ignore partial frames */
        }
      }
    }
  }
  return text;
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = Math.min(
    ...[cleaned.indexOf("{"), cleaned.indexOf("[")].filter((i) => i >= 0).concat([0]),
  );
  return JSON.parse(cleaned.slice(start)) as T;
}

export type Classification = { status: Exclude<ParsedStatus, "pending">; keywords: string[] };

export async function classifyReply(reply: string): Promise<Classification> {
  const prompt = `You classify a post-discharge patient's SMS reply to a recovery check-in.
Return JSON only, no prose: {"status":"routine"|"concerning"|"unclear","keywords":[string]}

Rules you MUST follow:
- "concerning" only when the reply clearly reports a symptom, pain, bleeding, fever, swelling, confusion, or an inability to follow the care task.
- "routine" only when the reply is clearly positive and unambiguous (e.g. "yes", "1", "all good").
- Anything ambiguous, hedging, sarcastic, off-topic, partial, or not clearly positive MUST be "unclear". Never default an ambiguous reply to "routine".
- keywords: short symptom or topic words extracted from the reply (may be empty).

Patient reply: """${reply}"""`;
  try {
    const out = await claude({ messages: [{ role: "user", content: prompt }] });
    const parsed = parseJson<Classification>(out);
    if (!["routine", "concerning", "unclear"].includes(parsed.status)) {
      return { status: "unclear", keywords: [] };
    }
    return { status: parsed.status, keywords: parsed.keywords ?? [] };
  } catch {
    // Fail safe: never silently call an unparsed reply routine.
    return { status: "unclear", keywords: [] };
  }
}

export async function extractTasks(
  fileBase64: string,
  mediaType: string,
): Promise<{ description: string; type: string; recovery_day: number }[]> {
  const isPdf = mediaType === "application/pdf";
  const content = [
    isPdf
      ? { type: "document", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } },
    {
      type: "text",
      text: `Read this hospital discharge document and return JSON only:
{"tasks":[{"description":string,"type":"medication"|"wound_care"|"follow_up"|"warning_sign","recovery_day":integer}]}
recovery_day is the day offset from the discharge date that the task applies to (1, 4, 10, 14...). No prose.`,
    },
  ];
  const out = await claude({ messages: [{ role: "user", content }] });
  const parsed = parseJson<{ tasks: { description: string; type: string; recovery_day: number }[] }>(
    out,
  );
  const valid = ["medication", "wound_care", "follow_up", "warning_sign"];
  return (parsed.tasks ?? []).map((t) => ({
    description: String(t.description).slice(0, 400),
    type: valid.includes(t.type) ? t.type : "follow_up",
    recovery_day: Number.isFinite(t.recovery_day) ? Math.max(0, Math.round(t.recovery_day)) : 1,
  }));
}

/** Twilio is a pure transport layer: no decision logic lives here. */
export async function sendSms(to: string, body: string): Promise<{ sent: boolean; note?: string }> {
  const connectionKey = process.env["TWILIO_API_KEY"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!connectionKey || !from) {
    return { sent: false, note: "Twilio not configured — message logged only" };
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) return { sent: false, note: `Twilio error ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, note: (e as Error).message };
  }
}

type Db = {
  from: (t: string) => any;
};

export async function audit(
  db: Db,
  entity_type: string,
  entity_id: string,
  action: string,
  actor = "system",
) {
  await db.from("audit_log").insert({ entity_type, entity_id, action, actor });
}

/**
 * Deterministic rule engine applied after a reply is parsed. Plain code only.
 */
export async function applyReplyRules(
  db: Db,
  checkin: { id: string; patient_id: string },
  parsed: ParsedStatus,
  rawResponse: string,
  patientPhone: string,
) {
  await db
    .from("checkins")
    .update({ raw_response: rawResponse, parsed_status: parsed })
    .eq("id", checkin.id);
  await audit(db, "checkin", checkin.id, `reply_parsed_${parsed}`);

  if (parsed === "concerning") {
    await createEscalation(
      db,
      checkin,
      "URGENT",
      "Patient reported a concerning symptom",
      patientPhone,
      true,
    );
  } else if (parsed === "unclear") {
    await createEscalation(db, checkin, "UNCLEAR", "Reply needs human review", patientPhone, false);
    // One automated clarifying follow-up text.
    await sendSms(patientPhone, CLARIFYING_FOLLOW_UP);
  }
  // 'routine' → no escalation, just the log entries above.
}

/** Deadline passed with no reply. A missed check-in is a CONTACT failure, never a health decline. */
export async function applyMissedRules(
  db: Db,
  checkin: { id: string; patient_id: string; message_body: string | null; missed_count: number },
  patientPhone: string,
) {
  const missed = (checkin.missed_count ?? 0) + 1;
  // DEMO WINDOW: 5 minutes. Production would use hours, not minutes.
  const deadline = new Date(Date.now() + 5 * 60_000).toISOString();
  await db
    .from("checkins")
    .update({ missed_count: missed, response_deadline: deadline })
    .eq("id", checkin.id);
  await audit(db, "checkin", checkin.id, `checkin_missed_${missed}`);

  if (missed === 1) {
    await createEscalation(db, checkin, "WATCH", "No reply — retry scheduled", patientPhone, false);
    if (checkin.message_body) await sendSms(patientPhone, checkin.message_body); // auto-resend once
  } else if (missed >= 2) {
    await createEscalation(
      db,
      checkin,
      "CONTACT_FAILURE",
      "Unable to reach patient after 2 attempts",
      patientPhone,
      true,
    );
  }
}

async function createEscalation(
  db: Db,
  checkin: { id: string; patient_id: string },
  severity: Severity,
  reason: string,
  patientPhone: string,
  notifyCaregiver: boolean,
) {
  const { data } = await db
    .from("escalations")
    .insert({
      checkin_id: checkin.id,
      patient_id: checkin.patient_id,
      severity,
      reason,
      status: "open",
    })
    .select("id")
    .single();
  if (data?.id) await audit(db, "escalation", data.id, `escalation_created_${severity}`);

  if (notifyCaregiver) {
    const { data: patient } = await db
      .from("patients")
      .select("name, caregivers(phone)")
      .eq("id", checkin.patient_id)
      .single();
    const caregiverPhone = patient?.caregivers?.phone;
    if (caregiverPhone) {
      await sendSms(
        caregiverPhone,
        severity === "CONTACT_FAILURE"
          ? `RecoverLine: we have been unable to reach ${patient?.name} after 2 check-in attempts. This is a contact failure, not a report about their condition. Please try to reach them.`
          : `RecoverLine: ${patient?.name} reported a concerning symptom in a recovery check-in. Please follow up.`,
      );
    }
  }
  void patientPhone;
}
