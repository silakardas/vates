"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function Header() {
  const { user } = useAuth();

  return (
    <nav className="flex items-center justify-between px-8 py-7 border-b border-parchment/10">
      <Link href="/" className="flex items-center gap-2.5">
        <span
          className="brand-flicker w-2.5 h-2.5 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #F2BD6B, #E8A33D 60%, #a8571f 100%)",
          }}
        />
        <span className="font-serif text-2xl">vates</span>
        <span className="font-mono text-[11px] text-muted tracking-wide ml-1">
          writing atelier
        </span>
        <span
          title="Vates is in open beta — expect occasional bugs, and please send feedback if you spot one."
          className="font-mono text-[10px] uppercase tracking-wide text-lamp border border-lamp/30 rounded-full px-2 py-0.5 ml-1 cursor-help"
        >
          Beta
        </span>
      </Link>
      <div className="flex items-center gap-7 text-sm text-muted font-sans">
        <Link href="/workshop" className="hover:text-parchment transition-colors">
          Workshop
        </Link>
        <Link href="/challenge" className="hover:text-parchment transition-colors">
          Today&apos;s Challenge
        </Link>
        {user ? (
          <Link
            href="/account"
            className="flex items-center gap-2 hover:text-parchment transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </span>
            {user.name}
          </Link>
        ) : (
          <Link
            href="/login"
            className="bg-lamp/15 border border-lamp/30 text-lamp px-4 py-1.5 rounded-full hover:bg-lamp/25 transition-colors"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
