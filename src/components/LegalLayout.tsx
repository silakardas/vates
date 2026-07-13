import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function LegalLayout(props: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="text-parchment px-8 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-3xl mb-2">{props.title}</h1>
          <p className="font-mono text-xs text-faint mb-10">
            Last updated {props.updated}
          </p>

          <div className="bg-ink-soft border border-parchment/10 rounded-xl px-5 py-4 mb-10">
            <p className="text-xs text-muted leading-relaxed">
              Vates is an early-stage beta made by one person, not a law firm.
              This page explains things in plain language and covers the
              basics honestly, but it isn&apos;t a substitute for professional
              legal advice — and it will be revisited as the product (and its
              data handling) matures.
            </p>
          </div>

          <div className="space-y-8 text-sm text-muted leading-relaxed [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-parchment [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
            {props.children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
