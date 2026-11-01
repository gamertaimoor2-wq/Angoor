const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "your_anon_or_publishable_key_here";

export function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function sbUrl(path) {
  return `${SUPABASE_URL}/rest/v1/${path}`;
}

export { SUPABASE_URL, SUPABASE_KEY };