import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Container } from '@/components/Container';

export const metadata: Metadata = {
  title: 'Privacy Policy | Attune AI',
  description: 'Attune AI privacy policy—what we collect, why we use it, and how we protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-16 sm:py-20 lg:py-24">
        <Container>
          <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              Last updated: January 2025
            </p>

            <div className="mt-12 space-y-10 text-muted-foreground">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
                <p className="leading-relaxed">
                  Attune AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Attune AI platform,
                  which provides voice- and text-based AI support through specialized conversational
                  agents. This Privacy Policy explains what information we collect, why we collect it,
                  how we use and protect it, and your choices. By using our service, you agree to this
                  policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. What we collect</h2>
                <p className="leading-relaxed mb-3">
                  We collect information necessary to provide and improve our service:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong className="text-foreground">Account information:</strong> When you sign up,
                    we collect your email address and a password (stored in a secure, hashed form).
                  </li>
                  <li>
                    <strong className="text-foreground">Session and conversation data:</strong> We store
                    session metadata (e.g., agent used, start/end time) and transcript content from your
                    voice or text conversations so we can provide session summaries and continuity.
                  </li>
                  <li>
                    <strong className="text-foreground">Summaries and referrals:</strong> If you use
                    session summaries or specialist referrals, we store that data to display it to you
                    and, where you choose, to support referral workflows.
                  </li>
                  <li>
                    <strong className="text-foreground">Technical and usage data:</strong> We may collect
                    device type, browser, IP address, and general usage patterns (e.g., pages visited)
                    to operate the service, prevent abuse, and improve performance.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Why we use it</h2>
                <p className="leading-relaxed">
                  We use your information to: provide and personalize the Attune AI experience; store
                  and display your sessions and summaries; process referral requests when you opt in;
                  secure your account and prevent fraud; improve our product and fix issues; and comply
                  with legal obligations. We do not sell your personal information to third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Retention</h2>
                <p className="leading-relaxed">
                  We retain your account and session data for as long as your account is active. If you
                  delete your account, we will delete or anonymize your personal data within a reasonable
                  period, except where we must retain it for legal, security, or fraud-prevention
                  purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies and similar technologies</h2>
                <p className="leading-relaxed">
                  We use cookies and similar technologies to keep you logged in, remember preferences,
                  and understand how the product is used. You can control cookies through your browser
                  settings. Essential cookies are required for the service to function; disabling them
                  may limit certain features.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Third parties</h2>
                <p className="leading-relaxed">
                  We use trusted service providers to host our app, manage authentication, send
                  emails, and run our database. These providers process data on our behalf under
                  strict agreements. We do not share your conversation content or identifiable data
                  with advertisers or data brokers. If we integrate with specialist or referral
                  partners, we will only share information when you explicitly consent (e.g., when
                  you request a referral).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Security</h2>
                <p className="leading-relaxed">
                  We use industry-standard measures to protect your data: encryption in transit and
                  at rest, secure authentication (e.g., Supabase Auth), and access controls. No system
                  is completely secure; we will notify you and regulators where required if a breach
                  affects your personal data.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Your rights</h2>
                <p className="leading-relaxed">
                  Depending on where you live, you may have the right to access, correct, delete, or
                  export your personal data, or to object to or restrict certain processing. To
                  exercise these rights, contact us at the email below. You can also delete your
                  account from your account settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Children</h2>
                <p className="leading-relaxed">
                  Our service is not intended for users under 18. We do not knowingly collect
                  personal information from children. If you believe we have collected such
                  information, please contact us and we will delete it.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes</h2>
                <p className="leading-relaxed">
                  We may update this Privacy Policy from time to time. We will post the updated
                  version on this page and, for material changes, we will notify you by email or
                  in-product notice. Your continued use of the service after changes constitutes
                  acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
                <p className="leading-relaxed">
                  For privacy-related questions or requests, contact us at:{' '}
                  <a
                    href="mailto:privacy@attune-ai.com"
                    className="text-primary hover:underline font-medium"
                  >
                    privacy@attune-ai.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
