import { redirect } from "next/navigation";

// The browsable community list that used to live here now lives in the
// site-wide search bar (see SearchBar + AdvancedSearchPanel, rendered
// from Header on every page), so any old links or bookmarks to /discover
// just land on the homepage instead, where that bar is right there below
// the header. Individual story pages (/discover/[id]) are unaffected —
// they still work exactly as before.
export default function DiscoverRedirect() {
  redirect("/");
}