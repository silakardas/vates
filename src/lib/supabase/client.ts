"use client";

import { createBrowserClient } from "@supabase/ssr";

const REMEMBER_ME_KEY = "vates-remember-me";

// Supabase keeps the session in whatever storage we hand it. When
// "remember me" is on we use localStorage (session survives browser
// restarts, the previous default behavior). When it's off we fall back
// to sessionStorage, so the session still works for the current tab but
// disappears once the browser is closed. The choice is read fresh on
// every call so a single client instance can respect a preference set
// after it was created.
const rememberAwareStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;
    const remember = window.localStorage.getItem(REMEMBER_ME_KEY) !== "false";
    return (remember ? window.localStorage : window.sessionStorage).getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    const remember = window.localStorage.getItem(REMEMBER_ME_KEY) !== "false";
    (remember ? window.localStorage : window.sessionStorage).setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

// Call this before logging in to control where the resulting session
// gets stored. Defaults to "remembered" (localStorage) if never set.
export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
}

// Single browser-side Supabase client, reused across the app.
// Reads the project URL + anon key from env vars set in .env.local
// (and in Vercel's Project Settings once deployed).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: rememberAwareStorage,
      },
    }
  );
}