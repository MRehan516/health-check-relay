// Shared RecoverLine domain helpers (synthetic demo data only).

export type Severity = "URGENT" | "WATCH" | "CONTACT_FAILURE" | "UNCLEAR";
export type ParsedStatus = "pending" | "routine" | "concerning" | "unclear";
export type PatientStatus = "ROUTINE" | "WATCH" | "URGENT" | "CONTACT_FAILURE" | "UNCLEAR";

export const STATUS_LABEL: Record<PatientStatus, string> = {
  ROUTINE: "Routine",
  WATCH: "Watch",
  URGENT: "Urgent",
  CONTACT_FAILURE: "Contact failure",
  UNCLEAR: "Unclear",
};

export const STATUS_COLOR: Record<PatientStatus, string> = {
  ROUTINE: "var(--status-routine)",
  WATCH: "var(--status-watch)",
  URGENT: "var(--status-urgent)",
  CONTACT_FAILURE: "var(--status-contact)",
  UNCLEAR: "var(--status-unclear)",
};

// Ordered most to least pressing for a coordinator's attention.
const SEVERITY_RANK: Record<Severity, number> = {
  URGENT: 4,
  UNCLEAR: 3,
  WATCH: 2,
  CONTACT_FAILURE: 1,
};

export function statusFromEscalations(open: { severity: Severity }[]): PatientStatus {
  if (!open.length) return "ROUTINE";
  const top = [...open].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0]!;
  return top.severity as PatientStatus;
}

export function recoveryDay(dischargeDate: string, on: Date = new Date()): number {
  const start = new Date(`${dischargeDate}T00:00:00`);
  const today = new Date(on.getFullYear(), on.getMonth(), on.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/** Normalize a typed phone number to E.164 (defaults to +1 / North America). */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TASK_TYPE_LABEL: Record<string, string> = {
  medication: "Medication",
  wound_care: "Wound care",
  follow_up: "Follow up",
  warning_sign: "Warning sign",
};

export const CLARIFYING_FOLLOW_UP =
  "Can you tell me a bit more — are you in any pain or noticing anything unusual?";
