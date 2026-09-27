import { supabase } from "@/integrations/supabase/client";
import type { Severity } from "./recoverline";

export type PatientRow = {
  id: string;
  name: string;
  phone: string;
  discharge_date: string;
  created_at: string;
  caregivers: { id: string; name: string; phone: string; relation: string | null } | null;
};

export type EscalationRow = {
  id: string;
  patient_id: string | null;
  checkin_id: string | null;
  reason: string;
  severity: Severity;
  status: "open" | "resolved";
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
};

export type CheckinRow = {
  id: string;
  patient_id: string;
  task_id: string | null;
  channel: "sms" | "simulated";
  message_body: string | null;
  raw_response: string | null;
  parsed_status: "pending" | "routine" | "concerning" | "unclear";
  sent_at: string;
  response_deadline: string;
  missed_count: number;
};

export type TaskRow = {
  id: string;
  patient_id: string;
  description: string;
  type: string;
  recovery_day: number;
  status: "pending" | "done";
};

export const patientsQuery = {
  queryKey: ["patients"],
  queryFn: async (): Promise<PatientRow[]> => {
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, phone, discharge_date, created_at, caregivers(id, name, phone, relation)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as PatientRow[];
  },
};

export const escalationsQuery = {
  queryKey: ["escalations"],
  queryFn: async (): Promise<EscalationRow[]> => {
    const { data, error } = await supabase
      .from("escalations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as EscalationRow[];
  },
};

export const checkinsQuery = {
  queryKey: ["checkins"],
  queryFn: async (): Promise<CheckinRow[]> => {
    const { data, error } = await supabase
      .from("checkins")
      .select("*")
      .order("sent_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as CheckinRow[];
  },
};

export const tasksQuery = {
  queryKey: ["tasks"],
  queryFn: async (): Promise<TaskRow[]> => {
    const { data, error } = await supabase
      .from("discharge_tasks")
      .select("*")
      .order("recovery_day", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as TaskRow[];
  },
};

export const auditQuery = {
  queryKey: ["audit_log"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
};
