import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About RecoverLine — prototype scope and policy" },
      {
        name: "description",
        content:
          "RecoverLine is a hackathon prototype. Not a medical device, not HIPAA-compliant, synthetic demo data only.",
      },
      { property: "og:title", content: "About RecoverLine — prototype scope and policy" },
      {
        property: "og:description",
        content:
          "What RecoverLine is and is not: a hackathon prototype built with Lovable, Supabase, Twilio and Anthropic's Claude API.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-xl">
            RecoverLine
          </Link>
          <Link to="/dashboard" className="text-sm text-primary hover:underline">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl">About this prototype</h1>

        <section className="mt-8 border-t border-hairline pt-6">
          <h2 className="text-lg">What this is</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            RecoverLine is a hackathon prototype built for a health-theme event. It demonstrates
            post-discharge patient check-ins over SMS and a deterministic escalation path to a
            caregiver.
          </p>
        </section>

        <section className="mt-6 border-t border-hairline pt-6">
          <h2 className="text-lg">What this is not</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li>It is not a certified medical device and gives no medical advice.</li>
            <li>It is not HIPAA-compliant and makes no claim of compliance.</li>
            <li>It is not connected to any electronic health record system.</li>
            <li>
              It does not store real patient health information. Every patient, caregiver, phone
              number and message in this demo is synthetic.
            </li>
          </ul>
        </section>

        <section className="mt-6 border-t border-hairline pt-6">
          <h2 className="text-lg">How escalation decisions are made</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A language model only converts a free-text reply into a structured status. The decision
            to raise an alert is fixed rule-based code. A missed check-in is recorded as a contact
            failure, meaning only that the patient could not be reached — never as a claim that
            their condition worsened. An unclear reply is never treated as routine: it is flagged
            for a human and triggers one automated clarifying message.
          </p>
        </section>

        <section className="mt-6 border-t border-hairline pt-6">
          <h2 className="text-lg">Built with</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lovable, Supabase, Twilio, and Anthropic's Claude API.
          </p>
        </section>
      </main>
    </div>
  );
}
