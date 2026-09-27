import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusLabel } from "@/components/status-label";
import {
  patientsQuery,
  escalationsQuery,
  checkinsQuery,
  tasksQuery,
  type PatientRow,
} from "@/lib/queries";
import {
  STATUS_COLOR,
  STATUS_LABEL,
  TASK_TYPE_LABEL,
  formatTimestamp,
  recoveryDay,
  statusFromEscalations,
  type PatientStatus,
} from "@/lib/recoverline";
import { resolveEscalation, simulateCheckin, sendCheckin } from "@/lib/recoverline.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Patient dashboard — RecoverLine" },
      {
        name: "description",
        content: "Every discharged patient, their check-in history and any open escalations.",
      },
      { property: "og:title", content: "Patient dashboard — RecoverLine" },
      {
        property: "og:description",
        content: "Every discharged patient, their check-in history and any open escalations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type SortKey = "name" | "status" | "discharge";

function Dashboard() {
  const qc = useQueryClient();
  const patients = useQuery(patientsQuery);
  const escalations = useQuery(escalationsQuery);
  const checkins = useQuery(checkinsQuery);
  const tasks = useQuery(tasksQuery);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("status");
  const [filter, setFilter] = useState<"all" | PatientStatus>("all");
  const [sweptId, setSweptId] = useState<string | null>(null);

  const statusFor = useMemo(() => {
    const map = new Map<string, PatientStatus>();
    for (const p of patients.data ?? []) {
      const open = (escalations.data ?? []).filter(
        (e) => e.patient_id === p.id && e.status === "open",
      );
      map.set(p.id, statusFromEscalations(open));
    }
    return map;
  }, [patients.data, escalations.data]);

  const rows = useMemo(() => {
    const order: PatientStatus[] = ["URGENT", "UNCLEAR", "WATCH", "CONTACT_FAILURE", "ROUTINE"];
    let list = [...(patients.data ?? [])];
    if (filter !== "all") list = list.filter((p) => statusFor.get(p.id) === filter);
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "discharge") return a.discharge_date < b.discharge_date ? 1 : -1;
      return (
        order.indexOf(statusFor.get(a.id) ?? "ROUTINE") -
        order.indexOf(statusFor.get(b.id) ?? "ROUTINE")
      );
    });
    return list;
  }, [patients.data, statusFor, sort, filter]);

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0]!.id);
  }, [rows, selectedId]);

  const selected = (patients.data ?? []).find((p) => p.id === selectedId) ?? null;

  const refreshAll = async (patientId?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["patients"] }),
      qc.invalidateQueries({ queryKey: ["escalations"] }),
      qc.invalidateQueries({ queryKey: ["checkins"] }),
      qc.invalidateQueries({ queryKey: ["audit_log"] }),
    ]);
    if (patientId) {
      setSweptId(patientId);
      setTimeout(() => setSweptId(null), 1200);
    }
  };

  const loading = patients.isLoading || escalations.isLoading;

  const sidebar = (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-3">
        <select
          aria-label="Sort patients"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-1/2 border border-input bg-surface px-2 py-1.5 text-xs"
        >
          <option value="status">Sort by status</option>
          <option value="name">Sort by name</option>
          <option value="discharge">Sort by discharge</option>
        </select>
        <select
          aria-label="Filter patients"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | PatientStatus)}
          className="w-1/2 border border-input bg-surface px-2 py-1.5 text-xs"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABEL) as PatientStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse bg-secondary" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "No patients yet — add your first patient."
              : "No patients with this status."}
          </p>
          {filter === "all" && (
            <Link
              to="/patients/new"
              className="mt-3 inline-flex bg-primary px-3 py-2 text-sm text-primary-foreground"
            >
              Add patient
            </Link>
          )}
        </div>
      ) : (
        <ul>
          {rows.map((p) => {
            const status = statusFor.get(p.id) ?? "ROUTINE";
            return (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  style={{ borderLeftColor: STATUS_COLOR[status] }}
                  className={`block w-full border-b border-hairline border-l-[3px] px-5 py-3 text-left transition-colors duration-[120ms] hover:bg-secondary ${
                    selectedId === p.id ? "bg-secondary" : ""
                  } ${sweptId === p.id ? "status-sweep" : ""}`}
                >
                  <span className="block text-sm">{p.name}</span>
                  <span className="mt-1 flex items-center justify-between">
                    <StatusLabel status={status} />
                    <span className="num text-muted-foreground">
                      Day {recoveryDay(p.discharge_date)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <AppShell aside={<div className="hidden md:flex md:flex-1 md:flex-col">{sidebar}</div>}>
      <div className="border-b border-hairline bg-surface md:hidden">{sidebar}</div>
      {selected ? (
        <PatientPanel
          patient={selected}
          status={statusFor.get(selected.id) ?? "ROUTINE"}
          tasks={(tasks.data ?? []).filter((t) => t.patient_id === selected.id)}
          checkins={(checkins.data ?? []).filter((c) => c.patient_id === selected.id)}
          escalations={(escalations.data ?? []).filter((e) => e.patient_id === selected.id)}
          onChanged={() => refreshAll(selected.id)}
          loading={checkins.isLoading || tasks.isLoading}
        />
      ) : (
        <div className="px-5 py-10">
          <p className="text-sm text-muted-foreground">Select a patient to see their recovery.</p>
        </div>
      )}
    </AppShell>
  );
}

function PatientPanel({
  patient,
  status,
  tasks,
  checkins,
  escalations,
  onChanged,
  loading,
}: {
  patient: PatientRow;
  status: PatientStatus;
  tasks: { id: string; description: string; type: string; recovery_day: number; status: string }[];
  checkins: {
    id: string;
    channel: string;
    message_body: string | null;
    raw_response: string | null;
    parsed_status: string;
    sent_at: string;
    missed_count: number;
  }[];
  escalations: {
    id: string;
    reason: string;
    severity: string;
    status: string;
    created_at: string;
    resolution_note: string | null;
    resolved_by: string | null;
  }[];
  onChanged: () => void;
  loading: boolean;
}) {
  const simulate = useServerFn(simulateCheckin);
  const send = useServerFn(sendCheckin);
  const resolve = useServerFn(resolveEscalation);

  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const day = recoveryDay(patient.discharge_date);

  const runSimulation = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const res = await simulate({ data: { patient_id: patient.id, reply } });
      toast.success(`Reply parsed as ${res.status}`);
      setReply("");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const sendNow = async () => {
    setBusy(true);
    try {
      const res = await send({ data: { patient_id: patient.id } });
      toast.success(res.sent ? "Check-in text sent" : `Check-in logged. ${res.note ?? ""}`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const markResolved = async (id: string) => {
    setBusy(true);
    try {
      const note = notes[id]?.trim();
      await resolve({ data: note ? { escalation_id: id, note } : { escalation_id: id } });
      toast.success("Escalation resolved");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const open = escalations.filter((e) => e.status === "open");

  return (
    <div>
      <header className="border-b border-hairline bg-surface px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl">{patient.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Discharged <span className="num">{patient.discharge_date}</span> · day{" "}
              <span className="num">{day}</span> of recovery
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Caregiver: {patient.caregivers?.name ?? "None on file"}
              {patient.caregivers?.phone ? (
                <span className="num"> {patient.caregivers.phone}</span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusLabel status={status} />
            <button
              onClick={sendNow}
              disabled={busy}
              className="border border-input px-3 py-2 text-sm transition-colors duration-[120ms] hover:bg-secondary disabled:opacity-60"
            >
              Send today's check-in
            </button>
          </div>
        </div>
      </header>

      <section className="border-b border-hairline px-5 py-6">
        <h2 className="text-lg">Recovery timeline</h2>
        {loading ? (
          <div className="mt-4 h-20 animate-pulse bg-secondary" />
        ) : tasks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No tasks yet. Upload a discharge document for this patient to build the plan.
          </p>
        ) : (
          <ol className="mt-4 border-l border-hairline">
            {tasks.map((t) => (
              <li key={t.id} className="relative py-3 pl-5">
                <span
                  className="absolute -left-[3px] top-5 h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      t.recovery_day <= day ? "var(--color-primary)" : "var(--color-border)",
                  }}
                />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="num text-muted-foreground">Day {t.recovery_day}</span>
                  <span className="text-sm">{t.description}</span>
                </div>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {TASK_TYPE_LABEL[t.type] ?? t.type} · {t.status === "done" ? "Done" : "Pending"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border-b border-hairline px-5 py-6">
        <h2 className="text-lg">Check-in history</h2>
        {loading ? (
          <div className="mt-4 h-16 animate-pulse bg-secondary" />
        ) : checkins.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No check-ins recorded yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {checkins.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm">{c.message_body ?? "Check-in"}</span>
                  <span className="num text-muted-foreground">{formatTimestamp(c.sent_at)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.raw_response ? `Reply: "${c.raw_response}"` : "No reply received"} · parsed as{" "}
                  {c.parsed_status}
                  {c.missed_count > 0 ? (
                    <>
                      {" "}
                      · missed attempts <span className="num">{c.missed_count}</span>
                    </>
                  ) : null}{" "}
                  · {c.channel === "sms" ? "SMS" : "Simulated"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-b border-hairline px-5 py-6">
        <h2 className="text-lg">Escalations</h2>
        {escalations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No escalations for this patient.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline">
            {escalations.map((e) => (
              <li key={e.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <StatusLabel status={e.severity as PatientStatus} />
                  <span className="num text-muted-foreground">{formatTimestamp(e.created_at)}</span>
                </div>
                <p className="mt-1 text-sm">{e.reason}</p>
                {e.status === "open" ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={notes[e.id] ?? ""}
                      onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })}
                      placeholder="Resolution note (optional)"
                      className="flex-1 border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => markResolved(e.id)}
                      disabled={busy}
                      className="bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors duration-[120ms] hover:opacity-90 disabled:opacity-60"
                    >
                      Mark resolved
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resolved by {e.resolved_by ?? "unknown"}
                    {e.resolution_note ? `: ${e.resolution_note}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {open.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            A contact failure means the patient could not be reached. It is not a statement about
            their condition.
          </p>
        )}
      </section>

      <section className="px-5 py-6">
        <h2 className="text-lg">Simulate check-in</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a reply as if the patient texted it back. It runs through the identical parsing and
          rule engine as a real message, bypassing the text-message carrier.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="e.g. my leg is swollen and hot"
            className="flex-1 border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={runSimulation}
            disabled={busy || !reply.trim()}
            className="bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors duration-[120ms] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Running" : "Run reply"}
          </button>
        </div>
      </section>
    </div>
  );
}
