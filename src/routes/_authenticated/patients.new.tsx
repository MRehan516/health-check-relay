import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { toE164 } from "@/lib/recoverline";
import { extractDischarge } from "@/lib/recoverline.functions";

export const Route = createFileRoute("/_authenticated/patients/new")({
  head: () => ({
    meta: [
      { title: "Add patient — RecoverLine" },
      {
        name: "description",
        content: "Intake a discharged patient and upload their discharge document.",
      },
      { property: "og:title", content: "Add patient — RecoverLine" },
      {
        property: "og:description",
        content: "Intake a discharged patient and upload their discharge document.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewPatient,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function NewPatient() {
  const navigate = useNavigate();
  const extract = useServerFn(extractDischarge);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    caregiverName: "",
    caregiverPhone: "",
    dischargeDate: today(),
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = toE164(form.phone);
    const caregiverPhone = form.caregiverPhone ? toE164(form.caregiverPhone) : null;
    if (!phone) {
      toast.error("Enter a valid patient phone number, for example +15551234567");
      return;
    }
    if (form.caregiverPhone && !caregiverPhone) {
      toast.error("Enter a valid caregiver phone number, for example +15551234567");
      return;
    }
    setBusy(true);
    try {
      let caregiverId: string | null = null;
      if (form.caregiverName && caregiverPhone) {
        const { data, error } = await supabase
          .from("caregivers")
          .insert({ name: form.caregiverName, phone: caregiverPhone })
          .select("id")
          .single();
        if (error) throw error;
        caregiverId = data.id;
      }
      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          name: form.name,
          phone,
          discharge_date: form.dischargeDate,
          caregiver_id: caregiverId,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (file) {
        const base64 = await fileToBase64(file);
        try {
          const res = await extract({
            data: {
              patient_id: patient.id,
              file_base64: base64,
              media_type: file.type || "image/jpeg",
            },
          });
          toast.success(`Discharge document read into ${res.inserted} recovery tasks`);
        } catch (err) {
          toast.error(`Patient saved, but the document could not be read: ${(err as Error).message}`);
        }
      }
      toast.success("Patient added");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <AppShell>
      <div className="max-w-2xl px-5 py-6">
        <h1 className="text-2xl">Add patient</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use synthetic details only. This prototype must not hold real patient information.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <Field label="Patient name">
            <input required value={form.name} onChange={set("name")} className={inputClass} />
          </Field>
          <Field label="Patient phone" hint="Saved in E.164 format, for example +15551234567">
            <input
              required
              value={form.phone}
              onChange={set("phone")}
              placeholder="+15551234567"
              className={inputClass}
            />
          </Field>
          <Field label="Caregiver name">
            <input
              value={form.caregiverName}
              onChange={set("caregiverName")}
              className={inputClass}
            />
          </Field>
          <Field label="Caregiver phone">
            <input
              value={form.caregiverPhone}
              onChange={set("caregiverPhone")}
              placeholder="+15551234567"
              className={inputClass}
            />
          </Field>
          <Field label="Discharge date">
            <input
              required
              type="date"
              value={form.dischargeDate}
              onChange={set("dischargeDate")}
              className={inputClass}
            />
          </Field>
          <Field label="Discharge document" hint="Image or PDF. Read into a day-by-day plan.">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full border border-input bg-surface px-3 py-2 text-sm"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-[120ms] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Saving" : "Add patient"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

const inputClass =
  "w-full border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
