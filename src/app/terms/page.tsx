import LegalLayout from "@/components/LegalLayout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="July 2026">
      <section>
        <h2>This is a beta</h2>
        <p>
          Vates is provided &quot;as is,&quot; while it&apos;s actively being
          built. Features may change, break, or disappear without much
          warning, and we can&apos;t promise uninterrupted access or that
          your data will never be lost. We&apos;ll do our best — but please
          write with that in mind until we say otherwise.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You&apos;re responsible for keeping your login credentials to
          yourself and for what happens under your account. You can delete
          your account at any time.
        </p>
      </section>

      <section>
        <h2>Your writing is yours</h2>
        <p>
          You own everything you write on Vates. By using the service, you
          give us only the limited permission needed to store your work and
          display it back to you — nothing more. We won&apos;t publish,
          license, or repurpose your writing.
        </p>
      </section>

      <section>
        <h2>Fanfiction &amp; other people&apos;s characters</h2>
        <p>
          Vates is built with fanfic writers in mind, and we&apos;re glad to
          host that kind of work. That said, you&apos;re responsible for
          making sure your own use of others&apos; characters, settings, or
          copyrighted material follows applicable law and any relevant
          platform norms — we&apos;re not able to offer legal advice on
          individual cases.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Keep it human. No harassment, hate speech, illegal content, or
          content that sexualizes minors. We can suspend or remove accounts
          that violate this, especially during beta while moderation tools
          are still basic.
        </p>
      </section>

      <section>
        <h2>No warranty, limited liability</h2>
        <p>
          Vates is offered without warranties of any kind, express or
          implied. To the extent permitted by law, we&apos;re not liable for
          indirect, incidental, or consequential damages arising from your
          use of the service — including loss of written work during this
          beta period.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms as the product evolves. If a change is
          significant, we&apos;ll try to flag it — through the app or by
          email — rather than update this page quietly.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions?{" "}
          <a href="mailto:vates.app.feedback@gmail.com" className="text-lamp hover:underline">
            vates.app.feedback@gmail.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
