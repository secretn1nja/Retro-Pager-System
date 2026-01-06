// --- STATE MANAGEMENT ---
let appState = {
    isOpen: false,
    currentPage: 'menu', 
    selectedIndex: 0,
    messages: [], 
    frequencies: [],
    tempFreqTarget: null,
    settings: { sound: true, vibrate: true, nickname: "User" },
    sendData: { target: "", message: "" },
    helpScroll: 0
};

// --- AUDIO ---
const beepSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
function playBeep() {
    if(!appState.settings.sound) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square'; osc.frequency.value = 880; gain.gain.value = 0.1;
    osc.start(); setTimeout(() => osc.stop(), 150);
}

// --- MENU OPTIONS ---
const menuOptions = [
    { label: "1. INBOX", target: "inbox" },
    { label: "2. FREQUENCIES", target: "frequencies" },
    { label: "3. SEND PAGE", target: "send_id" },
    { label: "4. SETTINGS", target: "settings" },
    { label: "5. INFO", target: "info" },
    { label: "6. EXIT", action: "close" }
];

const settingsOptions = [
    { label: "SOUND: ", key: "sound" },
    { label: "VIBRATE: ", key: "vibrate" },
    { label: "HELP / CONTROLS", target: "help" },
    { label: "CLR INBOX", action: "clear" },
    { label: "BACK", action: "back" }
];

// --- EVENT LISTENERS ---
window.addEventListener('message', function(event) {
    const data = event.data;

    if (data.action === 'open') {
        appState.isOpen = true;
        appState.settings.nickname = data.nickname || "User";
        document.getElementById('pager-device').style.display = 'block';
        playBeep();
        appState.currentPage = 'menu';
        appState.selectedIndex = 0;
        appState.sendData = { target: "", message: "" };
        render();
    } 
    else if (data.action === 'close') {
        if(appState.isOpen) closePager(false);
    }
    else if (data.action === 'newMessage') {
        handleNewMessage(data.message);
    }
    else if (data.action === 'notification') {
        showTempMessage(data.text);
    }
    else if (data.action === 'updateFrequencies') {
        appState.frequencies = data.list;
        if(appState.currentPage === 'frequencies') render();
    }
});

document.addEventListener('keydown', function(e) {
    if (!appState.isOpen) return;

    const activeTag = document.activeElement.tagName;
    if (activeTag === 'INPUT') {
        if(e.key === 'Enter') submitInput();
        if(e.key === 'Escape') goBack();
        return;
    }

    switch(e.key) {
        case 'ArrowUp': navigate(-1); break;
        case 'ArrowDown': navigate(1); break;
        case 'Enter': selectOption(); break;
        case 'Backspace': goBack(); break;
        case 'Escape': closePager(true); break;
    }
});

// --- RENDER LOGIC ---
function render() {
    updateClock();
    const display = document.getElementById('display-area');
    display.innerHTML = '';
    document.getElementById('nav-hint').innerText = "↕ MOVE ↵ SELECT";

    if (appState.currentPage === 'menu') {
        renderList(display, menuOptions);
    } 
    else if (appState.currentPage === 'inbox') {
        if (appState.messages.length === 0) {
            display.innerHTML = '<div style="text-align:center; margin-top:20px;">NO MESSAGES</div>';
        } else {
            const list = appState.messages.map(m => ({
                label: `${m.read ? '' : '★ '}${m.sender}`,
                data: m
            }));
            list.push({ label: "< BACK", action: "back" });
            renderList(display, list);
        }
    }
    else if (appState.currentPage === 'frequencies') {
        if(appState.frequencies.length === 0) {
            display.innerHTML = '<div style="text-align:center">LOADING...</div>';
            fetch(`https://${GetParentResourceName()}/getFrequencies`, { method: 'POST' });
        } else {
            const list = appState.frequencies.map(f => {
                let statusIcon = "[-]";
                let statusClass = "status-unsub";
                if (f.subscribed) { statusIcon = "[SUB]"; statusClass = "status-sub"; } 
                else if (f.restricted && !f.hasAccess) { statusIcon = "[LCK]"; statusClass = "status-locked"; }
                return { label: f.name, rightLabel: statusIcon, rightClass: statusClass, data: f };
            });
            list.push({ label: "< BACK", action: "back" });
            renderFreqList(display, list);
        }
    }
    else if (appState.currentPage === 'read') {
        const msg = appState.messages[appState.selectedIndex];
        msg.read = true;
        display.innerHTML = `
            <div style="font-size:16px; border-bottom:1px solid #33ff33; margin-bottom:5px;">
                FROM: ${msg.sender} <span style="float:right">${msg.time}</span>
            </div>
            <div style="word-wrap: break-word;">${msg.text}</div>
            <div style="margin-top:10px; font-size:14px; color:#1a4d1a;">
                [DEL] Delete  [BKSP] Back
            </div>
        `;
    }
    else if (appState.currentPage === 'settings') {
        const currentOptions = settingsOptions.map(opt => {
            if(opt.key) return { ...opt, label: opt.label + (appState.settings[opt.key] ? "ON" : "OFF") };
            return opt;
        });
        renderList(display, currentOptions);
    }
    else if (appState.currentPage === 'info') {
        display.innerHTML = `
            <div style="text-align:center">
                PAGER v1.2<br>ID: ${appState.settings.nickname}<br>BATTERY: 84%<br><br>PRESS [BKSP]
            </div>
        `;
    }
    else if (appState.currentPage === 'help') {
        display.innerHTML = `
            <div style="border-bottom:1px solid #33ff33; margin-bottom:2px; font-size:14px;">HELP & CONTROLS</div>
            <div id="help-window">
                <div id="help-content-inner" style="top: ${appState.helpScroll}px;">
                    <span style="color:#fff">--- KEYS ---</span><br>
                    P: OPEN/CLOSE<br>
                    UP/DOWN: NAVIGATE<br>
                    ENTER: SELECT<br>
                    BKSP: BACK<br>
                    DEL: DELETE MSG<br>
                    <span style="color:#fff">--- CMDS ---</span><br>
                    /PAGEFREQ [ID] [MSG]<br>
                    /PAGE [ID] [MSG]<br>
                    <br>
                    <span style="color:#fff">--- ACCESS ---</span><br>
                    ENTER PINS IN<br>
                    FREQ MENU TO<br>
                    UNLOCK SIGNALS.
                </div>
            </div>
        `;
        document.getElementById('nav-hint').innerText = "↕ SCROLL [BKSP] BACK";
    }
    else if (appState.currentPage === 'send_id') {
        display.innerHTML = `
            <div class="retro-input-label">ENTER ID:</div>
            <input type="number" id="input-target" class="retro-input" placeholder="_" autocomplete="off">
            <div style="font-size:12px; margin-top:10px; color:#1a4d1a;">[ENTER] Next</div>
        `;
        document.getElementById('nav-hint').innerText = "TYPE ID ↵ NEXT";
        setTimeout(() => document.getElementById('input-target').focus(), 50);
    }
    else if (appState.currentPage === 'send_msg') {
        display.innerHTML = `
            <div class="retro-input-label">TO: ${appState.sendData.target}</div>
            <input type="text" id="input-msg" class="retro-input" placeholder="MESSAGE..." maxlength="120" autocomplete="off">
            <div style="font-size:12px; margin-top:10px; color:#1a4d1a;">[ENTER] Send</div>
        `;
        document.getElementById('nav-hint').innerText = "TYPE MSG ↵ SEND";
        setTimeout(() => document.getElementById('input-msg').focus(), 50);
    }
    else if (appState.currentPage === 'freq_pin') {
        display.innerHTML = `
            <div class="retro-input-label">ENTER ACCESS PIN:</div>
            <input type="password" id="input-pin" class="retro-input" maxlength="4" placeholder="****" autocomplete="off">
            <div style="font-size:12px; margin-top:10px; color:#1a4d1a;">[ENTER] Submit</div>
        `;
        document.getElementById('nav-hint').innerText = "TYPE PIN ↵ OK";
        setTimeout(() => document.getElementById('input-pin').focus(), 50);
    }
    else if (appState.currentPage === 'status_msg') {
        display.innerHTML = `<div style="text-align:center; margin-top:30px;">${appState.statusText}</div>`;
        setTimeout(() => { appState.currentPage = 'menu'; appState.selectedIndex = 0; render(); }, 2000);
    }

    setTimeout(() => {
        const activeItem = document.querySelector('.menu-item.active');
        if (activeItem) activeItem.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }, 10);
}

// --- HELPER FUNCTIONS ---
function renderList(container, items) {
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `menu-item ${index === appState.selectedIndex ? 'active' : ''}`;
        div.innerText = item.label;
        container.appendChild(div);
    });
}

function renderFreqList(container, items) {
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `menu-item ${index === appState.selectedIndex ? 'active' : ''}`;
        if(item.rightLabel) {
            div.innerHTML = `<span>${item.label}</span><span class="${item.rightClass}">${item.rightLabel}</span>`;
        } else {
            div.innerText = item.label;
        }
        container.appendChild(div);
    });
}

function navigate(dir) {
    if (appState.currentPage === 'help') {
        const step = 15;
        const maxScroll = -120; 
        
        if (dir > 0) {
            appState.helpScroll = Math.max(appState.helpScroll - step, maxScroll);
        } else {
            appState.helpScroll = Math.min(appState.helpScroll + step, 0);
        }
        render();
        return;
    }
    let max = 0;
    if(appState.currentPage === 'menu') max = menuOptions.length;
    if(appState.currentPage === 'inbox') max = appState.messages.length + 1;
    if(appState.currentPage === 'settings') max = settingsOptions.length;
    if(appState.currentPage === 'frequencies') max = appState.frequencies.length + 1;

    if (max > 0) {
        appState.selectedIndex += dir;
        if (appState.selectedIndex < 0) appState.selectedIndex = max - 1;
        if (appState.selectedIndex >= max) appState.selectedIndex = 0;
        render();
    }
}

function selectOption() {
    playBeep();
    if(appState.currentPage === 'menu') {
        const opt = menuOptions[appState.selectedIndex];
        if(opt.action === 'close') closePager(true);
        else {
            appState.currentPage = opt.target;
            appState.selectedIndex = 0;
            if(opt.target === 'frequencies') fetch(`https://${GetParentResourceName()}/getFrequencies`, { method: 'POST' });
            render();
        }
    }
    else if (appState.currentPage === 'inbox') {
        if(appState.selectedIndex === appState.messages.length) goBack();
        else { appState.currentPage = 'read'; render(); }
    }
    else if (appState.currentPage === 'frequencies') {
        if(appState.selectedIndex === appState.frequencies.length) { goBack(); } 
        else {
            const freq = appState.frequencies[appState.selectedIndex];
            if (freq.restricted && !freq.hasAccess) {
                appState.tempFreqTarget = freq.id;
                appState.currentPage = 'freq_pin';
                render();
            } else {
                fetch(`https://${GetParentResourceName()}/toggleFreq`, { method: 'POST', body: JSON.stringify({ id: freq.id }) });
                freq.subscribed = !freq.subscribed;
                render();
            }
        }
    }
    else if (appState.currentPage === 'settings') {
        const opt = settingsOptions[appState.selectedIndex];
        if(opt.action === 'back') goBack();
        if (opt.target === 'help') {
            appState.currentPage = 'help';
            appState.helpScroll = 0;
            render();
        }
        else if (opt.action === 'clear') { appState.messages = []; render(); }
        else if (opt.key) { appState.settings[opt.key] = !appState.settings[opt.key]; render(); }
    }
}

function submitInput() {
    playBeep();
    if (appState.currentPage === 'send_id') {
        const val = document.getElementById('input-target').value;
        if(val) { appState.sendData.target = val; appState.currentPage = 'send_msg'; render(); }
    } else if (appState.currentPage === 'send_msg') {
        const val = document.getElementById('input-msg').value;
        if(val) {
            appState.sendData.message = val;
            fetch(`https://${GetParentResourceName()}/sendPage`, { method: 'POST', body: JSON.stringify(appState.sendData) });
            showTempMessage("SENDING...");
        }
    } else if (appState.currentPage === 'freq_pin') {
        const val = document.getElementById('input-pin').value;
        if(val) {
            fetch(`https://${GetParentResourceName()}/toggleFreq`, { method: 'POST', body: JSON.stringify({ id: appState.tempFreqTarget, code: val }) });
            appState.currentPage = 'frequencies'; render();
        }
    }
}

function goBack() {
    playBeep();
    if(appState.currentPage === 'read') { appState.currentPage = 'inbox'; render(); }
    else if (appState.currentPage === 'send_msg') { appState.currentPage = 'send_id'; render(); }
    else if (appState.currentPage === 'send_id') { appState.currentPage = 'menu'; render(); }
    else if (appState.currentPage === 'freq_pin') { appState.currentPage = 'frequencies'; render(); }
    else if (appState.currentPage === 'frequencies') { appState.currentPage = 'menu'; appState.selectedIndex = 0; render(); }
    else if (appState.currentPage !== 'menu') { appState.currentPage = 'menu'; appState.selectedIndex = 0; render(); }
    else if (appState.currentPage === 'help') { appState.currentPage = 'settings'; appState.helpScroll = 0; render(); }
    else { closePager(true); }
}

function showTempMessage(text) {
    appState.statusText = text;
    appState.currentPage = 'status_msg';
    render();
}

function closePager(notifyLua) {
    appState.isOpen = false;
    document.getElementById('pager-device').style.display = 'none';
    if (notifyLua) fetch(`https://${GetParentResourceName()}/close`, { method: 'POST' });
}

function handleNewMessage(msg) {
    appState.messages.unshift(msg);
    if(appState.settings.vibrate && appState.isOpen) {
        document.querySelector('.pager-body').classList.add('vibrate');
        setTimeout(() => document.querySelector('.pager-body').classList.remove('vibrate'), 500);
    }
    playBeep();
    if(!appState.isOpen) {
        const notif = document.getElementById('notification-popup');
        document.getElementById('notif-text').innerText = `FROM: ${msg.sender}`;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 4000);
    } else {
        if(appState.currentPage === 'inbox') render();
    }
}

document.addEventListener('keydown', function(e) {
    if(appState.isOpen && appState.currentPage === 'read' && e.key === 'Delete') {
        appState.messages.splice(appState.selectedIndex, 1);
        appState.currentPage = 'inbox';
        appState.selectedIndex = 0;
        render();
    }
});

function updateClock() {
    const d = new Date();
    const t = d.getHours().toString().padStart(2,'0') + ":" + d.getMinutes().toString().padStart(2,'0');
    if(document.getElementById('clock')) document.getElementById('clock').innerText = t;
}

const helpContent = `
    <div style="font-size:14px; line-height:1.1;">
        <span style="color:#fff">KEYS:</span><br>
        P: Open/Close<br>
        ARROWS: Navigate<br>
        ENTER: Select<br>
        BKSP: Back<br>
        DEL: Delete Msg<br><br>
        <span style="color:#fff">CMDS:</span><br>
        /pagefreq [id] [msg]<br>
        <br>
    </div>
`;