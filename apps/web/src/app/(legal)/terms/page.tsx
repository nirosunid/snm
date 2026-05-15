import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata = {
  title: "Terms of Service — SMN",
  description: "The terms governing use of SMN.",
};

const LAST_UPDATED = "2026-05-15";
const SUPPORT_EMAIL = "support@example.com";
const COMPANY_NAME = "SMN, LLC";
const JURISDICTION = "the State of Delaware, United States";

export default function TermsOfService() {
  return (
    <article className="space-y-6">
      <Alert variant="destructive">
        <AlertTitle>Placeholder — pending legal review</AlertTitle>
        <AlertDescription>
          This document is a working draft to be replaced with
          lawyer-reviewed content before Meta App Review submission. Do not
          rely on this as a final terms document.
        </AlertDescription>
      </Alert>

      <header>
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
      </header>

      <section>
        <h2>1. Agreement</h2>
        <p>
          By creating an account or using SMN (the &quot;Service&quot;), you
          agree to these Terms. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          {COMPANY_NAME} provides software that helps creators and small
          businesses draft on-brand social-media carousel posts using AI
          agents, with human approval before publishing. We reserve the right
          to modify or discontinue features with reasonable notice.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <p>
          You are responsible for safeguarding your password and for any
          activity under your account. Notify us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> immediately
          if you suspect unauthorized use.
        </p>
        <p>
          You must be at least 16 years old to use the Service.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain ownership of all content you upload (brand briefs, voice
          samples, asset images, generated drafts). You grant us a limited,
          worldwide, non-exclusive license to host, process, and display that
          content solely to operate the Service for you.
        </p>
        <p>
          You represent that you have all rights necessary to upload the
          content and to authorize its publication to your connected
          platforms.
        </p>
      </section>

      <section>
        <h2>5. AI-generated drafts</h2>
        <p>
          The Service produces draft carousel content using LLMs. You are
          responsible for reviewing every draft before approving it for
          publication. We make no warranty that drafts are accurate,
          non-infringing, or fit for any specific purpose. Approval-by-default
          is a feature: nothing publishes until you click Approve and
          Publish.
        </p>
      </section>

      <section>
        <h2>6. Connected accounts</h2>
        <p>
          When you connect a social-media account (e.g., Instagram), you
          authorize us to publish content on your behalf and to read the
          minimum profile data needed to do so. You may disconnect at any
          time from your brand page; disconnection deletes the stored token
          but does not retroactively unpublish posts.
        </p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <ul>
          <li>No spam, harassment, or unlawful content.</li>
          <li>No content that violates the connected platform&apos;s terms (e.g., Meta&apos;s Community Standards or Branded Content Policies).</li>
          <li>No reverse engineering, scraping, or rate-limit evasion.</li>
          <li>No use of the Service to operate &quot;faceless&quot; impersonation accounts.</li>
        </ul>
      </section>

      <section>
        <h2>8. Billing</h2>
        <p>
          Paid plans are billed monthly via Stripe. You may cancel from the
          Customer Portal; access continues until the end of the paid period.
          Refunds are at our discretion.
        </p>
      </section>

      <section>
        <h2>9. Termination</h2>
        <p>
          You may delete your account at any time from the dashboard. We may
          suspend or terminate accounts that violate these Terms with notice
          where reasonable.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers &amp; liability</h2>
        <p>
          The Service is provided &quot;as is&quot;, without warranties of
          any kind. To the maximum extent permitted by law, our total
          liability for any claim is limited to the fees you paid in the
          twelve months preceding the claim.
        </p>
      </section>

      <section>
        <h2>11. Governing law</h2>
        <p>
          These Terms are governed by the laws of {JURISDICTION}, without
          regard to its conflict-of-laws provisions.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </article>
  );
}
