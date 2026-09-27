import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RecoverLine — post-discharge check-ins that escalate to a caregiver" },
      {
        name: "description",
        content:
          "RecoverLine texts discharged patients a daily check-in tied to their recovery plan and alerts a caregiver when they can't be reached.",
      },
      {
        property: "og:title",
        content: "RecoverLine — post-discharge check-ins that escalate to a caregiver",
      },
      {
        property: "og:description",
        content:
          "Automated SMS recovery check-ins with a deterministic escalation rule engine. Hackathon prototype, synthetic data only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "1",
    title: "Upload the discharge document",
    body: "The paperwork is read into a day-by-day recovery plan with dated tasks.",
  },
  {
    n: "2",
    title: "Automated check-ins",
    body: "The patient gets a text tied to that day's task. No app to install, no portal to log into.",
  },
  {
    n: "3",
    title: "Caregiver alerted if unreachable",
    body: "A concerning reply, an unclear reply, or two missed attempts opens an alert for a human.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <span className="font-display text-xl">RecoverLine</span>
          <Link to="/auth" className="text-sm text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="border-b border-hairline py-14 md:py-20">
          <h1 className="max-w-3xl text-3xl leading-tight md:text-5xl">
            Discharged patients go home with paperwork nobody follows up on. RecoverLine texts them
            a check-in each day and alerts a caregiver when they can't be reached.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground">
            A coordinator uploads the discharge document once. Patients answer short text messages
            tied to that day's specific care task. Replies are read into a structured status, but
            the decision to escalate is fixed rule-based logic, not a judgement call.
          </p>
          <div className="mt-8">
            <Link
              to="/dashboard"
              className="inline-flex items-center bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors duration-[120ms] hover:opacity-90"
            >
              View dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-px border-b border-hairline bg-hairline py-0 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-background px-0 py-10 md:px-6">
              <span className="num text-muted-foreground">{s.n}</span>
              <h2 className="mt-3 text-lg">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="py-10">
          <p className="text-sm text-muted-foreground">
            Hackathon prototype — synthetic demo data only.
          </p>
        </section>
      </main>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>Built with Lovable, Supabase, Twilio, and Anthropic's Claude API</span>
          <Link to="/about" className="text-primary hover:underline">
            About and policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
