# ANGOOR Panel (Vercel)

iOS water / glass admin panel for ANGOOR presence.

## Features
- **One row per user** (deduped by `user_id`)
- **Session duration** from `session_start` → last seen / now
- **Executor name** field
- **Roblox headshot** per user
- **Globe map** (lat/lon points)
- **TP popup** to other active users in the same `job_id`
- Kill / Kick commands via `remote_commands`
- Liquid glass UI + orbiting button light

## Deploy to Vercel
1. Upload this `angoor-panel` folder to GitHub
2. Import project in Vercel
3. Framework: Next.js
4. Add env (optional):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_KEY`
5. Deploy

## Supabase columns to add (SQL)
Run in Supabase SQL editor if missing:

```sql
alter table script_presence add column if not exists session_start timestamptz;
alter table script_presence add column if not exists first_seen timestamptz;
alter table script_presence add column if not exists executor text;
alter table script_presence add column if not exists device text;
alter table script_presence add column if not exists lat double precision;
alter table script_presence add column if not exists lon double precision;
alter table script_presence add column if not exists country text;
alter table script_presence add column if not exists city text;

-- Prefer one row per user (optional unique)
-- create unique index if not exists script_presence_user_uidx on script_presence (user_id);
```

## Script heartbeat fields
Your Lua presence payload should include:

```lua
{
  user_id = lp.UserId,
  username = lp.Name,
  display_name = lp.DisplayName,
  job_id = game.JobId,
  place_id = game.PlaceId,
  last_seen = os.date("!%Y-%m-%dT%H:%M:%SZ"),
  session_start = SESSION_START, -- set once when script starts
  executor = identifyexecutor and identifyexecutor() or (getexecutorname and getexecutorname()) or "Unknown",
  device = UserInputService.TouchEnabled and "Mobile" or "PC",
  lat = LAT,  -- optional
  lon = LON,  -- optional
  city = CITY,
  country = COUNTRY,
}
```

Panel password default: `Tesla`
