import { sbHeaders, sbUrl } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const target_user_id = body.target_user_id;
    const command = String(body.command || "").toLowerCase();
    if (!target_user_id || !command) {
      return NextResponse.json({ error: "target_user_id and command required" }, { status: 400 });
    }

    const allowed = new Set(["kick", "kill", "say", "tp"]);
    if (!allowed.has(command)) {
      return NextResponse.json({ error: "unsupported command" }, { status: 400 });
    }

    const row = {
      target_user_id: Number(target_user_id),
      command,
      args: body.args || {},
      consumed: false,
      created_at: new Date().toISOString(),
    };

    const res = await fetch(sbUrl("remote_commands"), {
      method: "POST",
      headers: sbHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(row),
    });

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
