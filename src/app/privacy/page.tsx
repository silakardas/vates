import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 2026">
      <section>
        <h2>What we collect</h2>
        <p>
          If you create an account, we store your email address and display
          name. If you write on Vates, we store what you write — your
          stories, chapters, characters, and notes — so you can come back to
          it later. That&apos;s the core of the product, and it&apos;s the
          main thing we hold onto.
        </p>
        <p>
          We also collect basic technical information (browser type, rough
          usage patterns, error logs) to keep the site working and fix bugs
          during beta.
        </p>
      </section>

      <section>
        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell your data, ever.</li>
          <li>We don&apos;t show ads or share your writing with advertisers.</li>
          <li>
            We don&apos;t read your stories except when it&apos;s necessary to
            debug a problem you&apos;ve reported, or when required by law.
          </li>
        </ul>
      </section>

      <section>
        <h2>Third-party word lookup</h2>
        <p>
          The double-click word lookup feature in the editor sends the word
          you looked up (and only that word — not your surrounding text) to
          two public dictionary services: dictionaryapi.dev and
          api.datamuse.com. Those requests are subject to those services&apos;
          own privacy practices, not ours.
        </p>
      </section>

      <section>
        <h2>Beta data caveat</h2>
        <p>
          Vates is in active beta. Our data model and storage may change as
          we build things out, and while we&apos;ll do our best to protect
          what you&apos;ve written, we can&apos;t yet guarantee the same
          durability a mature product would offer. Keep a personal backup of
          anything you&apos;d be devastated to lose.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can delete your stories or your account at any time from
          Settings. If you&apos;d like a copy of your data or want it removed
          entirely, email us and we&apos;ll take care of it.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about this policy?{" "}
          <a href="mailto:vates.app.feedback@gmail.com" className="text-lamp hover:underline">
            vates.app.feedback@gmail.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
