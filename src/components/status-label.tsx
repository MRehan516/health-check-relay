import { STATUS_COLOR, STATUS_LABEL, type PatientStatus } from "@/lib/recoverline";

export function StatusLabel({ status }: { status: PatientStatus }) {
  const color = STATUS_COLOR[status];
  if (status === "UNCLEAR") {
    return (
      <span
        className="inline-flex items-center gap-1.5 border border-dashed px-1.5 py-0.5 text-xs"
        style={{ color, borderColor: color }}
      >
        {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      {status === "CONTACT_FAILURE" ? (
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M1 3.5h10M1 3.5v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5M2 3.5 6 7l4-3.5M1.5 10.5l9-9"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
