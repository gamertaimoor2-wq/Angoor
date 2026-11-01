-- ANGOOR presence patch: one stable session + executor + optional geo
-- Paste near your existing supabaseUpsertPresence / replace that function

local SESSION_START = os.date("!%Y-%m-%dT%H:%M:%SZ")
local CACHED_EXECUTOR = (identifyexecutor and select(1, identifyexecutor()))
    or (getexecutorname and getexecutorname())
    or (syn and "Synapse")
    or (secure_call and "Unknown+")
    or "Unknown"
local CACHED_DEVICE = (UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled) and "Mobile" or "PC"
local GEO = { lat = nil, lon = nil, city = nil, country = nil }

-- optional geo once (ipapi)
task.spawn(function()
    local ok, body = pcall(function()
        if game.HttpGet then
            return game:HttpGet("https://ipapi.co/json/")
        end
        return nil
    end)
    if ok and type(body) == "string" then
        local function pick(key)
            local v = body:match('"' .. key .. '"%s*:%s*"([^"]*)"')
                or body:match('"' .. key .. '"%s*:%s*([%d%.%-]+)')
            return v
        end
        GEO.city = pick("city")
        GEO.country = pick("country_name") or pick("country")
        local la, lo = pick("latitude"), pick("longitude")
        GEO.lat = la and tonumber(la) or nil
        GEO.lon = lo and tonumber(lo) or nil
    end
end)

local function supabaseUpsertPresence()
    local url = SUPABASE_URL .. "/rest/v1/script_presence?on_conflict=user_id"
    local payload = HttpService:JSONEncode({
        user_id = lp.UserId,
        username = lp.Name,
        display_name = lp.DisplayName,
        job_id = game.JobId,
        place_id = game.PlaceId,
        last_seen = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        session_start = SESSION_START,
        first_seen = SESSION_START,
        executor = CACHED_EXECUTOR,
        device = CACHED_DEVICE,
        lat = GEO.lat,
        lon = GEO.lon,
        city = GEO.city,
        country = GEO.country,
    })
    local res = httpRequest("POST", url, payload, {
        ["Prefer"] = "resolution=merge-duplicates",
    })
    if res then
        print("[ANGOOR] presence", res.StatusCode or res.Status or "ok")
    end
end
