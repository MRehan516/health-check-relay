import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Backdrop } from "@/components/backdrop";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RecoverLine" },
      {
        name: "description",
        content: "Care coordinator sign-in for the RecoverLine check-in dashboard.",
      },
      { property: "og:title", content: "Sign in — RecoverLine" },
      {
        property: "og:description",
        content: "Care coordinator sign-in for the RecoverLine check-in dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <Backdrop intensity="soft" />
      <header className="relative border-b border-hairline bg-surface/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <Link to="/" className="font-display text-xl">
            RecoverLine
          </Link>
        </div>
      </header>
      <main className="fade-up relative mx-auto my-16 w-full max-w-sm border border-hairline bg-surface px-6 py-8">
        <h1 className="text-2xl">{mode === "in" ? "Sign in" : "Create an account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Care coordinator access to the check-in dashboard.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-[120ms] hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Working" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </main>
    </div>
  );
}
