import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = {
  title: "Privacy Policy — SMN",
  description: "How SMN collects, stores, and uses your data.",
};

const LAST_UPDATED = "2026-05-15";
const SUPPORT_EMAIL = "support@example.com";
const COMPANY_NAME = "SMN, LLC";
const JURISDICTION = "the State of Delaware, United States";

export default function PrivacyPolicy() {
  return (
    <article className="space-y-6">
      <Alert variant="destructive">
        <AlertTitle>Placeholder — pending legal review</AlertTitle>
        <AlertDescription>
          This document is a working draft to be replaced with
          lawyer-reviewed content before Meta App Review submission. Do not
          rely on this as a final privacy policy.
        </AlertDescription>
      </Alert>

      <header>
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>
      </header>

      <section>
        <h2>1. Who we are</h2>
        <p>
          {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;SMN&quot;) operates
          a software service that helps creators and small businesses draft
          on-brand social-media carousel posts using AI agents, with human
          approval before publishing. We are organized under the laws of{" "}
          {JURISDICTION}.
        </p>
        <p>
          Contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account info</strong> — email address, password hash, role.
          </li>
          <li>
            <strong>Brand profile</strong> — name, niche, audience description,
            tone notes, do/don&apos;t lists, vocabulary, palette, font, logo.
          </li>
          <li>
            <strong>Voice samples</strong> — past posts you paste in for
            similarity retrieval. Stored as text + a vector embedding.
          </li>
          <li>
            <strong>Asset library</strong> — images you upload for use in
            carousels. Stored on our servers; metadata (filename, tags, alt
            text) is searchable.
          </li>
          <li>
            <strong>Connected accounts</strong> — when you connect Instagram, we
            store the platform user id, username, account type, and an
            encrypted access token. Your Instagram password is never seen by us.
          </li>
          <li>
            <strong>Generated content</strong> — every carousel draft, the
            review verdict, and any subsequent edits or publishes are persisted
            to your account.
          </li>
          <li>
            <strong>Billing</strong> — when you subscribe, Stripe stores your
            payment method; we keep a Stripe customer / subscription id and
            current status. We never see your card number.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use it</h2>
        <ul>
          <li>To run the carousel pipeline (planner → writer → reviewer).</li>
          <li>To publish approved carousels to your connected platforms.</li>
          <li>To send transactional email (account, billing, support).</li>
          <li>
            To improve the product through aggregated, anonymized usage signals
            (counts and timings, not content).
          </li>
        </ul>
        <p>We do <strong>not</strong> sell your data, and we do not use your
          content or voice samples to train third-party LLMs without explicit
          opt-in.</p>
      </section>

      <section>
        <h2>4. Third-party processors</h2>
        <p>
          We share data with the following processors, each only with the
          minimum needed to do their job:
        </p>
        <ul>
          <li><strong>Meta Platforms, Inc.</strong> — Instagram Graph API for the publish flow.</li>
          <li><strong>Stripe, Inc.</strong> — billing and subscription management.</li>
          <li><strong>Anthropic / Google / OpenAI</strong> — LLM providers, when you have selected them as your model. Your prompts and generated drafts are sent to the provider you choose.</li>
          <li><strong>OpenAI</strong> — text embeddings for voice-sample retrieval (always; required even when your LLM is local).</li>
        </ul>
      </section>

      <section>
        <h2>5. Data retention &amp; deletion</h2>
        <p>
          You can request full deletion of your account and all associated data
          at any time from your dashboard (&quot;Delete my account&quot;) or by
          emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          Deletion removes:
        </p>
        <ul>
          <li>your user record;</li>
          <li>all brands, voice samples, assets, content jobs, accounts, and subscriptions you own;</li>
          <li>uploaded media (logos, asset library photos);</li>
          <li>encrypted OAuth tokens.</li>
        </ul>
        <p>
          Deletion is processed within 30 days. Backups are pruned on the same
          retention schedule. Some records may persist in third-party processors
          (Stripe invoices, Meta-side post records) per their own retention
          policies.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          OAuth tokens are encrypted at rest with AES-256-GCM. Data in transit
          is TLS-encrypted. Access to production systems is restricted to
          authorized employees over a private network.
        </p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>
          SMN is not directed to children under 16. If you believe a child has
          provided us with personal data, contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>8. Changes to this policy</h2>
        <p>
          We will notify users of material changes via email and by updating
          the &quot;Last updated&quot; date above.
        </p>
      </section>
    </article>
  );
}
