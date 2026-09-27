import { createFileRoute, Link } from "@tanstack/react-router";
import { Backdrop } from "@/components/backdrop";
import { StatusLabel } from "@/components/status-label";

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

const RULES: { reply: string; outcome: string; status: Parameters<typeof StatusLabel>[0]["status"] }[] =
  [
    { reply: "Clearly fine", outcome: "Logged, no alert", status: "ROUTINE" },
    { reply: "Ambiguous or hedging", outcome: "Human review plus one clarifying text", status: "UNCLEAR" },
    { reply: "Reports a symptom", outcome: "Caregiver notified at once", status: "URGENT" },
    { reply: "No reply once", outcome: "Check-in resent automatically", status: "WATCH" },
    { reply: "No reply twice", outcome: "Caregiver asked to make contact", status: "CONTACT_FAILURE" },
  ];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-xl">RecoverLine</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-hairline">
        <Backdrop />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.25fr_1fr] md:py-24">
          <div className="fade-up">
            <h1 className="text-3xl leading-tight md:text-5xl">
              Discharged patients go home with paperwork nobody follows up on. RecoverLine texts
              them a check-in each day and alerts a caregiver when they can't be reached.
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground">
              A coordinator uploads the discharge document once. Patients answer short text
              messages tied to that day's specific care task. Replies are read into a structured
              status, but the decision to escalate is fixed rule-based logic, not a judgement call.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity duration-[120ms] hover:opacity-90"
              >
                View dashboard
              </Link>
              <Link to="/about" className="text-sm text-primary hover:underline">
                How it is built
              </Link>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5">
        <section className="grid gap-px border-b border-hairline bg-hairline md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="fade-up bg-background px-0 py-10 md:px-6"
              style={{ animationDelay: `${150 + i * 120}ms` }}
            >
              <span className="num text-muted-foreground">{s.n}</span>
              <h2 className="mt-3 text-lg">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-10 border-b border-hairline py-14 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl">The rules are code, not a guess</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              AI only turns a free-text reply into one of three readings. What happens next is a
              fixed table anyone can audit. A missed check-in means we could not confirm the
              patient is okay, never that their health declined.
            </p>
          </div>
          <div className="border-t border-hairline">
            {RULES.map((r) => (
              <div
                key={r.reply}
                className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-hairline py-3 md:grid-cols-[1fr_1.3fr_auto]"
              >
                <span className="text-sm">{r.reply}</span>
                <span className="hidden text-sm text-muted-foreground md:block">{r.outcome}</span>
                <StatusLabel status={r.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <p className="text-sm text-muted-foreground">
            Hackathon prototype. Synthetic demo data only.
          </p>
        </section>
      </main>

      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>Built with Lovable, Supabase, Twilio, and Anthropic's Claude API</span>
          <Link to="/about" className="text-primary hover:underline">
            About and policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

const THREAD = [
  { from: "rl", text: "Day 4 check-in: change the dressing on your incision. Were you able to do this today? Reply 1 for yes, 2 for no." },
  { from: "pt", text: "did it but it looks a bit red" },
  { from: "rl", text: "Can you tell me a bit more? Are you in any pain or noticing anything unusual?" },
];

function PhoneMock() {
  return (
    <div className="fade-up relative mx-auto w-full max-w-xs" style={{ animationDelay: "200ms" }}>
      <div className="border border-hairline bg-surface p-4 shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--foreground)_35%,transparent)]">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <span className="text-sm font-medium">RecoverLine</span>
          <span className="num text-muted-foreground">09:02</span>
        </div>
        <div className="mt-4 space-y-3">
          {THREAD.map((m, i) => (
            <p
              key={i}
              className={`fade-up max-w-[85%] px-3 py-2 text-sm ${
                m.from === "rl"
                  ? "bg-secondary text-foreground"
                  : "ml-auto bg-primary text-primary-foreground"
              }`}
              style={{ animationDelay: `${600 + i * 700}ms` }}
            >
              {m.text}
            </p>
          ))}
        </div>
        <div
          className="fade-up mt-4 flex items-center justify-between border-t border-hairline pt-3"
          style={{ animationDelay: "2800ms" }}
        >
          <span className="text-xs text-muted-foreground">Dashboard status</span>
          <StatusLabel status="UNCLEAR" />
        </div>
      </div>
    </div>
  );
}
