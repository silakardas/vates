import { redirect } from "next/navigation";

// The browsable community list that used to live here now lives on the
// homepage (see DiscoverSection, rendered from src/app/page.tsx), so any
// old links or bookmarks to /discover just land there instead. Individual
// story pages (/discover/[id]) are unaffected — they still work exactly
// as before.
export default function DiscoverRedirect() {
  redirect("/#discover");
}