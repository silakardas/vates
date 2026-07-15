import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Permanently deletes the currently logged-in user's account.
//
// This has to happen server-side: deleting an auth user requires the
// Supabase *service role* key, which must never be shipped to the
// browser. `profiles` and `stories` rows are removed automatically via
// the `on delete cascade` foreign keys in supabase/schema.sql, so all
// this route has to do is clean up the user's avatar files and then
// delete the auth user itself.
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Account deletion isn't configured on the server yet (missing SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 500 }
    );
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Best-effort avatar cleanup — not fatal if it fails, the account
  // deletion below is what actually matters.
  const { data: avatarFiles } = await admin.storage.from("avatars").list(user.id);
  if (avatarFiles?.length) {
    await admin.storage
      .from("avatars")
      .remove(avatarFiles.map((file) => `${user.id}/${file.name}`));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}