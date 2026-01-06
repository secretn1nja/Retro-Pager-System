# -STANDALONE-Retro-Pager-System-Channels-Permissions-NUI
![image|690x460](upload://uqFvuAmZ1pUmOaKf5bngREvEDl7.jpeg)

This is a standalone communication resource for FiveM that implements a vintage pager system. It provides a functional NUI device for private and group messaging without any framework dependencies.

The script features a monochrome 90s-style interface with a built-in frequency system. It allows for public, PIN-protected, and hidden channels, all managed through a server-authoritative permission system.

## Features

* **Retro NUI:** Monochrome pixel aesthetic with custom audio and scanlines.
* **Direct Messaging:** Private paging via Player ID with inbox history.
* **Frequency System:** Public, PIN-locked, and hidden group channels.
* **Permission Logic:** Config-based roles (License/Steam/Discord) for admin tools.
* **Dynamic UI:** Internal help menu, virtual scrolling, and notification popups.
* **Security:** Server-side filtering for hidden channels and command validation.
* **Optimized:** Low performance impact (0.00ms idle).

## Commands

### User Commands

* **/pager** – Opens or closes the physical pager device.
* **/page [id] [message]** – Sends a direct pager message to a specific player.
* **/pagefreq [id] [message]** – Sends a message to a frequency you are subscribed to.

### Admin Commands

* **/pagerall [flags] [message]** – Broadcasts a message to all pagers. Supports `-anon` and `-freq [id]` flags.
* **/pager_freq_grant [id] [freq]** – Permanently grants a player access to a restricted or hidden frequency.
* **/pager_freq_revoke [id] [freq]** – Removes a player's access to a restricted frequency.
* **/pager_freq_list** – Lists all available frequencies and their current status.

## Installation

1. Download the resource folder.
2. Place the `retro-pager` folder into your server's `resources` directory.
3. Add `ensure retro-pager` to your `server.cfg`.
4. Open `config.lua` and add your administrator identifiers.
5. Restart your server or start the resource via console.
