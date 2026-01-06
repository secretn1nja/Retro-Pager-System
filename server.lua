local cooldowns = {}
local frequencySubs = {}  
local frequencyAccess = {}

-- --- HELPERS ---

function checkCooldown(source)
    local currentTime = os.time()
    if cooldowns[source] and (currentTime - cooldowns[source] < 5) then
        return false
    end
    cooldowns[source] = currentTime
    return true
end

function IsPagerAdmin(src)
    if src == 0 then return true end
    local identifiers = GetPlayerIdentifiers(src)
    for _, id in ipairs(identifiers) do
        for _, admin in ipairs(Config.Admins) do
            if id == admin then return true end
        end
    end
    return false
end

function GetFreqData(id)
    for _, f in ipairs(Config.Frequencies) do
        if f.id == id then return f end
    end
    return nil
end

-- --- COMMANDS ---
RegisterCommand('page', function(source, args, rawCommand)
    local src = source
    if #args < 2 then
        TriggerClientEvent('chat:addMessage', src, { color = {255, 0, 0}, args = {"System", "Usage: /page [ID] [Message]"} })
        return
    end
    
    local targetId = tonumber(args[1])
    table.remove(args, 1)
    local message = table.concat(args, " ")
    
    ProcessPage(src, targetId, message)
end)

RegisterCommand('pagefreq', function(source, args, raw)
    local src = source
    if #args < 2 then
        TriggerClientEvent('chat:addMessage', src, { args = {"System", "Usage: /pagefreq [FreqID] [Message]"} })
        return
    end

    local freqId = args[1]
    table.remove(args, 1)
    local message = table.concat(args, " ")
    
    local freq = GetFreqData(freqId)
    if not freq then
        TriggerClientEvent('chat:addMessage', src, { args = {"System", "Frequency ID not found."} })
        return
    end

    if not frequencySubs[src] or not frequencySubs[src][freqId] then
        TriggerClientEvent('chat:addMessage', src, { args = {"System", "You are not subscribed to this frequency."} })
        return
    end
    
    local timeStr = os.date("%H:%M")
    local senderName = GetPlayerName(src)
    
    for playerSrc, subs in pairs(frequencySubs) do
        if subs[freqId] and GetPlayerPing(playerSrc) > 0 then
             TriggerClientEvent('pager:client:receiveMessage', playerSrc, {
                sender = "["..freq.name.."] " .. senderName,
                message = message,
                time = timeStr,
                isFreq = true
            })
        end
    end
end)

RegisterCommand('pagerall', function(source, args, rawCommand)
    if not hasPagerPermission(source, "pagerall") then
        TriggerClientEvent('pager:client:sendNotification', source, "PERM DENIED")
        print(string.format("[Pager] Unauthorized /pagerall attempt by ID %s", source))
        return
    end

    local isAnon = rawCommand:find("-anon")
    local freqMatch = rawCommand:match("-freq%s+(%S+)")
    local message = table.concat(args, " ")
    
    message = message:gsub("-anon", ""):gsub("-freq%s+%S+", ""):gsub("^%s*", "")

    local senderLabel = isAnon and "ANONYMOUS" or (source == 0 and "SYSTEM" or GetPlayerName(source))
    local timeStr = os.date("%H:%M")

    if freqMatch then
        for playerSrc, subs in pairs(frequencySubs) do
            if subs[freqMatch] then
                TriggerClientEvent('pager:client:receiveMessage', playerSrc, {
                    sender = "[BROADCAST: " .. freqMatch .. "] " .. senderLabel,
                    message = message, time = timeStr, isFreq = true
                })
            end
        end
    else
        TriggerClientEvent('pager:client:receiveMessage', -1, {
            sender = "[BROADCAST] " .. senderLabel,
            message = message, time = timeStr
        })
    end
end)

RegisterCommand('pager_freq_grant', function(source, args)
    if not IsPagerAdmin(source) then return end
    local target = tonumber(args[1])
    local freqId = args[2]
    
    if target and freqId then
        if not frequencyAccess[target] then frequencyAccess[target] = {} end
        frequencyAccess[target][freqId] = true
        TriggerClientEvent('pager:client:sendNotification', source, "Access granted to ID " .. target)
        TriggerClientEvent('pager:client:sendNotification', target, "ACCESS GRANTED: " .. freqId)
    end
end)

-- --- EVENTS & LOGIC ---

function hasPagerPermission(source, permissionName)
    if source == 0 then return true end
    local identifiers = GetPlayerIdentifiers(source)
    local role = nil

    for _, id in ipairs(identifiers) do
        if Config.Admins[id] then
            role = Config.Admins[id]
            break
        end
    end

    if role and Config.Permissions[role] then
        return Config.Permissions[role][permissionName] or false
    end
    return false
end

RegisterNetEvent('pager:server:sendFromUI')
AddEventHandler('pager:server:sendFromUI', function(data)
    local src = source
    local targetId = tonumber(data.target)
    local message = data.message
    ProcessPage(src, targetId, message)
end)

function ProcessPage(senderSrc, targetId, message)
    if not targetId or GetPlayerPing(targetId) == 0 then
        TriggerClientEvent('pager:client:sendNotification', senderSrc, "ERROR: PLAYER NOT FOUND")
        return
    end
    if string.len(message) > 120 then
        TriggerClientEvent('pager:client:sendNotification', senderSrc, "ERROR: MSG TOO LONG")
        return
    end
    if not checkCooldown(senderSrc) then
        TriggerClientEvent('pager:client:sendNotification', senderSrc, "ERROR: PLEASE WAIT")
        return
    end

    local timeStr = os.date("%H:%M")
    
    TriggerClientEvent('pager:client:receiveMessage', targetId, {
        sender = GetPlayerName(senderSrc) .. " ("..senderSrc..")",
        message = message,
        time = timeStr
    })

    TriggerClientEvent('pager:client:sendNotification', senderSrc, "MESSAGE SENT TO " .. targetId)
end

RegisterNetEvent('pager:server:getFrequencies')
AddEventHandler('pager:server:getFrequencies', function()
    local src = source
    local filteredList = {}
    
    if not frequencySubs[src] then frequencySubs[src] = {} end
    if not frequencyAccess[src] then frequencyAccess[src] = {} end

    for _, freq in ipairs(Config.Frequencies) do
        local hasAccess = not freq.restricted or frequencyAccess[src][freq.id]
        
        if not freq.hidden or hasAccess then
            table.insert(filteredList, {
                id = freq.id,
                name = freq.name,
                restricted = freq.restricted,
                hasAccess = hasAccess,
                subscribed = frequencySubs[src][freq.id] or false
            })
        end
    end
    TriggerClientEvent('pager:client:updateFrequencies', src, filteredList)
end)

RegisterNetEvent('pager:server:toggleSubscription')
AddEventHandler('pager:server:toggleSubscription', function(data)
    local src = source
    local freqId = data.id
    local code = data.code
    local freq = GetFreqData(freqId)

    if not freq then return end
    if not frequencySubs[src] then frequencySubs[src] = {} end
    if not frequencyAccess[src] then frequencyAccess[src] = {} end

    if freq.restricted and not frequencyAccess[src][freqId] then
        if code and code == freq.passcode then
            frequencyAccess[src][freqId] = true
        else
             TriggerClientEvent('pager:client:sendNotification', src, "ACCESS DENIED")
             return
        end
    end

    if frequencySubs[src][freqId] then
        frequencySubs[src][freqId] = nil
        TriggerClientEvent('pager:client:sendNotification', src, "UNSUBSCRIBED: " .. freq.name)
    else
        frequencySubs[src][freqId] = true
        TriggerClientEvent('pager:client:sendNotification', src, "SUBSCRIBED: " .. freq.name)
    end
    
    TriggerEvent('pager:server:getFrequencies', src)
end)