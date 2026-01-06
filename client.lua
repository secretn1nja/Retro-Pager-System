local isPagerOpen = false

-- Open Logic
function OpenPager()
    if isPagerOpen then return end
    isPagerOpen = true
    
    RequestAnimDict("cellphone@")
    while not HasAnimDictLoaded("cellphone@") do Wait(0) end
    TaskPlayAnim(PlayerPedId(), "cellphone@", "cellphone_text_in", 8.0, -8.0, -1, 50, 0, false, false, false)
    
    SetNuiFocus(true, false)
    SendNUIMessage({
        action = 'open',
        nickname = GetPlayerServerId(PlayerId())
    })
end

-- Close Logic
function ClosePager()
    if not isPagerOpen then return end
    isPagerOpen = false
    
    StopAnimTask(PlayerPedId(), "cellphone@", "cellphone_text_in", 3.0)
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

RegisterCommand('pager', function()
    if isPagerOpen then ClosePager() else OpenPager() end
end)

RegisterKeyMapping('pager', 'Open Pager', 'keyboard', 'P')

-- --- NUI CALLBACKS ---

RegisterNUICallback('close', function(data, cb)
    isPagerOpen = false
    StopAnimTask(PlayerPedId(), "cellphone@", "cellphone_text_in", 3.0)
    SetNuiFocus(false, false)
    cb('ok')
end)

RegisterNUICallback('sendPage', function(data, cb)
    TriggerServerEvent('pager:server:sendFromUI', data)
    cb('ok')
end)

RegisterNUICallback('getFrequencies', function(data, cb)
    TriggerServerEvent('pager:server:getFrequencies')
    cb('ok')
end)

RegisterNUICallback('toggleFreq', function(data, cb)
    TriggerServerEvent('pager:server:toggleSubscription', data)
    cb('ok')
end)

-- --- EVENTS ---

RegisterNetEvent('pager:client:receiveMessage')
AddEventHandler('pager:client:receiveMessage', function(data)
    PlaySoundFrontend(-1, "Beep_Red", "DLC_HEIST_HACKING_SNAKE_SOUNDS", 1)
    
    SendNUIMessage({
        action = 'newMessage',
        message = { 
            sender = data.sender, 
            text = data.message, 
            time = data.time, 
            read = false,
            isFreq = data.isFreq 
        }
    })
    
    TriggerEvent('chat:addMessage', { 
        color = {50, 255, 50}, 
        multiline = true, 
        args = {"Pager", "New message received."} 
    })
end)

RegisterNetEvent('pager:client:sendNotification')
AddEventHandler('pager:client:sendNotification', function(text)
    SendNUIMessage({
        action = 'notification',
        text = text
    })
end)

RegisterNetEvent('pager:client:updateFrequencies')
AddEventHandler('pager:client:updateFrequencies', function(list)
    SendNUIMessage({
        action = 'updateFrequencies',
        list = list
    })
end)

AddEventHandler('playerSpawned', function()
    TriggerServerEvent('pager:server:getFrequencies')
end)

RegisterNUICallback('getHelp', function(data, cb)
    cb('ok')
end)