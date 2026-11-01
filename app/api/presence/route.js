import { sbHeaders, sbUrl } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function uniqByUser(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const uid = String(row.user_id);
    const prev = map.get(uid);
    if (!prev) {
      map.set(uid, row);
      continue;
    }
    const prevT = Date.parse(prev.last_seen || 0) || 0;
    const curT = Date.parse(row.last_seen || 0) || 0;
    // keep newest heartbeat, preserve earliest session_start
    if (curT >= prevT) {
      map.set(uid, {
        ...row,
        session_start: prev.session_start || row.session_start || row.first_seen || row.last_seen,
        first_seen: prev.first_seen || row.first_seen || row.session_start || row.last_seen,
      });
    } else {
      map.set(uid, {
        ...prev,
        session_start: prev.session_start || row.session_start || row.first_seen,
        first_seen: prev.first_seen || row.first_seen,
      });
    }
  }
  return Array.from(map.values());
}

export async function GET() {
  try {
    // pull recent presence (last 24h) then collapse to 1 row / user
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url =
      sbUrl("script_presence") +
      `?select=*&last_seen=gte.${encodeURIComponent(since)}&order=last_seen.desc&limit=2000`;

    const res = await fetch(url, {
      headers: sbHeaders({ Prefer: "count=exact" }),
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: t || res.statusText }, { status: res.status });
    }

    const data = await res.json();
    const users = uniqByUser(data).sort(
      (a, b) => (Date.parse(b.last_seen || 0) || 0) - (Date.parse(a.last_seen || 0) || 0)
    );

    const now = Date.now();
    const enriched = users.map((u) => {
      const last = Date.parse(u.last_seen || 0) || 0;
      const start = Date.parse(u.session_start || u.first_seen || u.last_seen || 0) || last;
      const online = now - last < 45_000;
      const sessionMs = Math.max(0, (online ? now : last) - start);
      return {
        ...u,
        online,
        session_ms: sessionMs,
        avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${u.user_id}&width=150&height=150&format=png`,
      };
    });

    return NextResponse.json({ users: enriched, count: enriched.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Upsert heartbeat from script (one row per user_id + job_id still ok; panel collapses by user)
export async function POST(request) {
  try {
    const body = await request.json();
    const user_id = body.user_id;
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const payload = {
      user_id: Number(user_id),
      username: body.username || "",
      display_name: body.display_name || body.username || "",
      job_id: body.job_id || "",
      place_id: body.place_id || 0,
      last_seen: nowIso,
      session_start: body.session_start || nowIso,
      executor: body.executor || body.device || "Unknown",
      device: body.device || body.executor || "Unknown",
      lat: body.lat ?? null,
      lon: body.lon ?? null,
      country: body.country || null,
      city: body.city || null,
    };

    // Try merge on user_id only if table supports it; fallback user_id,job_id
    const url = sbUrl("script_presence") + "?on_conflict=user_id";
    let res = await fetch(url, {
      method: "POST",
      headers: sbHeaders({
        Prefer: "resolution=merge-duplicates,return=representation",
      }),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // fallback conflict target
      const url2 = sbUrl("script_presence") + "?on_conflict=user_id,job_id";
      res = await fetch(url2, {
        method: "POST",
        headers: sbHeaders({
          Prefer: "resolution=merge-duplicates,return=representation",
        }),
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json({ error: t }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
