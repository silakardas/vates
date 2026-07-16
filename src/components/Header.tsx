"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function Header() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative px-4 sm:px-8 py-5 sm:py-7 border-b border-parchment/10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span
            className="brand-flicker w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #F2BD6B, #E8A33D 60%, #a8571f 100%)",
            }}
          />
          <span className="font-serif text-xl sm:text-2xl">vates</span>
          <span className="hidden sm:inline font-mono text-[11px] text-muted tracking-wide ml-1">
            writing atelier
          </span>
          <span
            title="Vates is in open beta — expect occasional bugs, and please send feedback if you spot one."
            className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-wide text-lamp border border-lamp/30 rounded-full px-2 py-0.5 ml-1 cursor-help"
          >
            Beta
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-7 text-sm text-muted font-sans">
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
              <span className="w-9 h-9 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden flex-shrink-0">
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

        {/* Mobile: avatar (if logged in) + menu toggle */}
        <div className="flex sm:hidden items-center gap-3">
          {user && (
            <Link href="/account" className="flex-shrink-0" onClick={() => setOpen(false)}>
              <span className="w-8 h-8 rounded-full bg-lamp/20 border border-lamp/40 text-lamp text-xs font-mono flex items-center justify-center overflow-hidden">
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
            </Link>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="relative w-8 h-8 flex items-center justify-center flex-shrink-0"
          >
            <span
              className={`absolute w-5 h-px bg-parchment transition-transform duration-200 ${
                open ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute w-5 h-px bg-parchment transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute w-5 h-px bg-parchment transition-transform duration-200 ${
                open ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="sm:hidden overflow-hidden"
          >
            <div className="flex flex-col gap-1 pt-5 pb-1 text-sm">
              <Link
                href="/workshop"
                onClick={() => setOpen(false)}
                className="py-2.5 text-muted hover:text-parchment transition-colors"
              >
                Workshop
              </Link>
              <Link
                href="/challenge"
                onClick={() => setOpen(false)}
                className="py-2.5 text-muted hover:text-parchment transition-colors"
              >
                Today&apos;s Challenge
              </Link>
              {user ? (
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-muted hover:text-parchment transition-colors"
                >
                  {user.name}&apos;s account
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block bg-lamp/15 border border-lamp/30 text-lamp px-4 py-2 rounded-full hover:bg-lamp/25 transition-colors text-center"
                >
                  Log in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}