-- Add inside supabasePollCommands loop, next to kick/kill/say:

elseif cmd == "tp" then
    local toId = type(row.args) == "table" and tonumber(row.args.to_user_id)
    local toName = type(row.args) == "table" and tostring(row.args.to_username or "")
    local target = toId and Players:GetPlayerByUserId(toId) or nil
    if not target and toName ~= "" then
        for _, p in ipairs(Players:GetPlayers()) do
            if p.Name:lower() == toName:lower() or p.DisplayName:lower() == toName:lower() then
                target = p
                break
            end
        end
    end
    if target and target.Character and lp.Character then
        local a = lp.Character:FindFirstChild("HumanoidRootPart")
        local b = target.Character:FindFirstChild("HumanoidRootPart")
        if a and b then
            a.CFrame = b.CFrame + Vector3.new(0, 3, 0)
        end
    end
