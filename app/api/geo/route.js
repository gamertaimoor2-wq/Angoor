import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight IP geo helper for panel (optional enrichment)
export async function GET(request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    if (!ip || ip === "127.0.0.1") {
      return NextResponse.json({ lat: null, lon: null, city: null, country: null });
    }
    const r = await fetch(`https://ipapi.co/${ip}/json/`, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ lat: null, lon: null });
    const j = await r.json();
    return NextResponse.json({
      lat: j.latitude ?? null,
      lon: j.longitude ?? null,
      city: j.city || null,
      country: j.country_name || j.country || null,
    });
  } catch {
    return NextResponse.json({ lat: null, lon: null });
  }
}
