import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Patients" },
  { to: "/patients/new", label: "Add patient" },
  { to: "/audit", label: "Audit log" },
];

export function AppShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  // Re-seeds the five synthetic patients relative to today so states never drift.
  const resetDemo = async () => {
    setResetting(true);
    const { error } = await supabase.rpc("reset_demo_data");
    setResetting(false);
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries();
    toast.success("Demo patients refreshed for today");
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-hairline bg-surface md:flex md:flex-col">
          <div className="border-b border-hairline px-5 py-4">
            <Link to="/" className="font-display text-xl">
              RecoverLine
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">Care coordinator</p>
          </div>
          <nav className="flex flex-col border-b border-hairline">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="border-b border-hairline px-5 py-2.5 text-sm text-foreground transition-colors duration-[120ms] hover:bg-secondary"
                activeProps={{ className: "bg-secondary font-medium" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {aside}
          <div className="mt-auto flex flex-col items-start gap-2 border-t border-hairline px-5 py-3">
            <button
              onClick={resetDemo}
              disabled={resetting}
              className="text-sm text-primary hover:underline disabled:opacity-60"
            >
              {resetting ? "Resetting demo" : "Reset demo patients"}
            </button>
            <button onClick={signOut} className="text-sm text-primary hover:underline">
              Sign out
            </button>
          </div>
        </aside>

        <header className="flex items-center justify-between border-b border-hairline bg-surface px-4 py-3 md:hidden">
          <Link to="/" className="font-display text-lg">
            RecoverLine
          </Link>
          <button onClick={signOut} className="text-sm text-primary">
            Sign out
          </button>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-hairline bg-surface md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex-1 px-2 py-3 text-center text-sm text-muted-foreground"
            activeProps={{ className: "text-primary font-medium" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
