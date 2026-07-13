import Link from "next/link";

export default function Footer() {
  return (
    <footer className="px-8 pt-8 pb-24 sm:pb-8 border-t border-parchment/10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-xs text-faint font-mono">
        <span>© {new Date().getFullYear()} Vates. In open beta.</span>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-muted transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-muted transition-colors">
            Terms
          </Link>
          <a
            href="mailto:vates.app.feedback@gmail.com"
            className="hover:text-muted transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
