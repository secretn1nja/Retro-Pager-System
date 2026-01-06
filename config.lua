Config = {}

Config.Permissions = {
    superadmin = { pagerall = true, freq_grant = true, freq_revoke = true, freq_broadcast = true },
    admin      = { pagerall = true, freq_grant = true, freq_revoke = false, freq_broadcast = true },
    moderator  = { pagerall = false, freq_grant = false, freq_revoke = false, freq_broadcast = false }
}

Config.Admins = {
    ["license:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"] = "superadmin",
    ["discord:000000000000000000"] = "admin",
    ["fivem:4129073"] = "superadmin"
}

Config.Frequencies = {
    { id = "general", name = "Public General", restricted = false, hidden = false },
    { id = "911", name = "Emergency Ops", restricted = true, passcode = "1122", hidden = false },
    { id = "darknet", name = "Black Market", restricted = true, hidden = true } -- HIDDEN FREQUENCY
}