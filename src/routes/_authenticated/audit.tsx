import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { auditQuery } from "@/lib/queries";
import { formatTimestamp } from "@/lib/recoverline";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — RecoverLine" },
      {
        name: "description",
        content: "Every check-in and escalation event recorded in reverse chronological order.",
      },
      { property: "og:title", content: "Audit log — RecoverLine" },
      {
        property: "og:description",
        content: "Every check-in and escalation event recorded in reverse chronological order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const audit = useQuery(auditQuery);

  return (
    <AppShell>
      <div className="px-5 py-6">
        <h1 className="text-2xl">Audit log</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every check-in and escalation write, newest first.
        </p>

        {audit.isLoading ? (
          <div className="mt-6 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse bg-secondary" />
            ))}
          </div>
        ) : (audit.data ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto border-t border-hairline">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Time</th>
                  <th className="py-2 pr-4 font-medium">Entity</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Actor</th>
                  <th className="py-2 font-medium">Id</th>
                </tr>
              </thead>
              <tbody>
                {(audit.data ?? []).map((row: any) => (
                  <tr key={row.id} className="border-b border-hairline">
                    <td className="num py-2 pr-4 whitespace-nowrap">
                      {formatTimestamp(row.created_at)}
                    </td>
                    <td className="py-2 pr-4">{row.entity_type}</td>
                    <td className="py-2 pr-4">{row.action}</td>
                    <td className="py-2 pr-4">{row.actor}</td>
                    <td className="num py-2 text-muted-foreground">
                      {row.entity_id ? String(row.entity_id).slice(0, 8) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
