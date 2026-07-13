"use client";

import { createBrowserClient } from "@supabase/ssr";

// Single browser-side Supabase client, reused across the app.
// Reads the project URL + anon key from env vars set in .env.local
// (and in Vercel's Project Settings once deployed).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
