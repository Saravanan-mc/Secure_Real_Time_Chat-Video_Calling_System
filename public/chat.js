const roomId = sessionStorage.getItem('chat_roomId');
const plainPassword = sessionStorage.getItem('chat_password');
const username = sessionStorage.getItem('chat_username');

if (!roomId || !plainPassword || !username) {
    window.location.href = 'index.html';
}

const socket = io();

// Set UI info
document.getElementById('displayRoomId').textContent = roomId;
document.title = `Space ${roomId} - Chat Space ❤️`;

// Crypto utilities
function encryptText(text) {
    return CryptoJS.AES.encrypt(text, plainPassword).toString();
}

function decryptText(ciphertext) {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, plainPassword);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return "🔒 [Encrypted Message]";
    }
}

// Join room logic
socket.emit('join-room', roomId, username);

socket.on('error-message', (msg) => {
    alert(msg);
    window.location.href = 'index.html';
});

// User Management
let currentUsers = [];
socket.on('update-users', (users) => {
    currentUsers = users;
    document.getElementById('userCount').textContent = users.length;
    
    // Check if I am the creator to show controls
    // We get creator info only indirectly right now, let's fetch it via a ping or rely on local flag.
    // Wait, let's check if we're creator by using the first user or storing it in session.
    // Actually, we don't know who creator is securely unless passed, but the server validates.
    
    const container = document.getElementById('usersContainer');
    container.innerHTML = '';
    users.forEach(u => {
        container.innerHTML += `
            <div class="user-item">
                <div class="user-avatar">${u.username.charAt(0).toUpperCase()}</div>
                <div>${u.id === socket.id ? u.username + ' (You)' : u.username}</div>
            </div>`;
    });
});

socket.on('user-joined', (name) => {
    appendSystemMessage(`${name} has joined securely.`);
});

socket.on('user-left', (name) => {
    appendSystemMessage(`${name} left the space.`);
});

socket.on('chat-cleared', () => {
    document.getElementById('messagesContainer').innerHTML = '<div class="system-message">Chat was cleared.</div>';
});

socket.on('room-deleted', () => {
    alert('This room has been deleted by the creator.');
    window.location.href = 'index.html';
});

// Sending Messages
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    const encryptedContent = encryptText(text);
    const encryptedSender = encryptText(username);
    
    const msgData = {
        sender: encryptedSender,
        encryptedContent: encryptedContent,
        type: 'text'
    };

    socket.emit('chat-message', msgData);
    
    // Append locally
    appendMessage(username, text, true, 'text', Date.now());
    messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
    else socket.emit('typing');
});

// Receiving Messages
socket.on('chat-message', (data) => {
    const plainSender = decryptText(data.sender);
    const plainContent = (data.type === 'text' || data.type === 'system-call') ? decryptText(data.encryptedContent) : data.encryptedContent;
    appendMessage(plainSender, plainContent, false, data.type, data.timestamp);
});

socket.on('load-messages', (messages) => {
    messages.forEach(msg => {
        const plainSender = decryptText(msg.sender);
        const plainContent = (msg.type === 'text' || msg.type === 'system-call') ? decryptText(msg.encryptedContent) : msg.encryptedContent;
        // Is it mine? Compare sender name.
        const isSelf = plainSender === username;
        appendMessage(plainSender, plainContent, isSelf, msg.type, msg.timestamp);
    });
});

// Media / Stickers Logic
const stickersPanel = document.getElementById('stickersPanel');
const stickerBtn = document.getElementById('stickerBtn');
const localStickersGrid = document.getElementById('localStickersGrid');
const stickers = ['stickers/1.svg', 'stickers/2.svg', 'stickers/3.svg'];

stickers.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'sticker-item';
    img.onclick = () => sendMedia(src, 'sticker');
    localStickersGrid.appendChild(img);
});

stickerBtn.addEventListener('click', () => {
    stickersPanel.classList.toggle('active');
});

window.switchMediaTab = function(tabName) {
    document.querySelectorAll('.panel-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.media-tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'stickers') {
        document.querySelectorAll('.panel-tab')[0].classList.add('active');
        document.getElementById('tab-stickers').classList.add('active');
    } else {
        document.querySelectorAll('.panel-tab')[1].classList.add('active');
        document.getElementById('tab-giphy').classList.add('active');
    }
};

function sendMedia(src, type) {
    const encryptedSender = encryptText(username);
    
    const msgData = {
        sender: encryptedSender,
        encryptedContent: src, // Do NOT encrypt image URLs
        type: type
    };

    socket.emit('chat-message', msgData);
    appendMessage(username, src, true, type, Date.now());
    stickersPanel.classList.remove('active');
}

window.searchGIF = async function() {
    const query = document.getElementById('giphySearch').value.trim();
    if (!query) return;
    
    document.getElementById('giphyLoader').style.display = 'block';
    const grid = document.getElementById('giphyGrid');
    grid.innerHTML = '';

    try {
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=TO4C2iqjJ03GDugVGTOvYWxxEjNKIIYG&limit=12`);
        const result = await res.json();
        
        if (result.data && result.data.length > 0) {
            result.data.forEach(gif => {
                const url = gif.images.fixed_height.url;
                const img = document.createElement('img');
                img.src = url;
                img.className = 'sticker-item';
                img.onclick = () => sendMedia(url, 'gif');
                grid.appendChild(img);
            });
        } else {
            grid.innerHTML = '<div style="grid-column: span 3; text-align:center; color:var(--text-muted);">No GIFs found.</div>';
        }
    } catch (err) {
        grid.innerHTML = '<div style="grid-column: span 3; color:var(--danger); text-align:center;">Failed to load.</div>';
    } finally {
        document.getElementById('giphyLoader').style.display = 'none';
    }
};

document.getElementById('giphySearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchGIF();
});

// Typing Indicator
let typingTimer;
socket.on('user-typing', (name) => {
    const ind = document.getElementById('typingIndicator');
    ind.textContent = `${name} is typing...`;
    ind.style.opacity = 1;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { ind.style.opacity = 0; }, 2000);
});

// UI Helpers
function appendMessage(sender, content, isSelf, type, timestamp) {
    if (!content) return; // failed to decrypt
    const time = new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isSelf ? 'sent' : 'received'}`;
    
    let contentHtml = '';
    if (type === 'sticker' || type === 'gif') {
        contentHtml = `<img src="${content}" class="sticker-img" loading="lazy">`;
    } else if (type === 'system-call') {
        const isVideo = content.includes('Video') || content.includes('video');
        const escapedContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        contentHtml = `<div class="msg-content" style="background: rgba(0, 201, 167, 0.1); border: 1px solid var(--secondary); max-width: 250px;">
            <div style="font-weight: bold; color: var(--secondary); margin-bottom: 8px;"><i class="fa-solid fa-phone"></i> ${escapedContent}</div>
            <button onclick="document.getElementById('${isVideo ? 'startVideoBtn' : 'startAudioBtn'}').click()" style="padding: 6px 12px; background: var(--secondary); color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; transition: 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">Join Call</button>
        </div>`;
    } else {
        // basic text escaping
        const escapedContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        contentHtml = `<div class="msg-content">${escapedContent}</div>`;
    }

    msgDiv.innerHTML = `
        <div class="msg-sender">${isSelf ? 'You' : sender}</div>
        ${contentHtml}
        <span class="msg-time">${time}</span>
    `;
    
    const container = document.getElementById('messagesContainer');
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function appendSystemMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'system-message';
    msgDiv.textContent = text;
    const container = document.getElementById('messagesContainer');
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function leaveRoom() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

// Admin / Creator Setup
if (sessionStorage.getItem('chat_isCreator') === 'true') {
    document.getElementById('creatorControls').style.display = 'flex';
    document.getElementById('creatorBadge').style.display = 'block';
} else {
    document.getElementById('creatorControls').style.display = 'none';
    document.getElementById('creatorBadge').style.display = 'none';
}

window.sendCallNotification = function(isVideo) {
    const text = isVideo ? "Started a Video Call" : "Started an Audio Call";
    const encryptedContent = encryptText(text);
    const encryptedSender = encryptText(username);
    
    const msgData = {
        sender: encryptedSender,
        encryptedContent: encryptedContent,
        type: 'system-call'
    };

    socket.emit('chat-message', msgData);
    appendMessage(username, text, true, 'system-call', Date.now());
};

document.getElementById('clearChatBtn').addEventListener('click', async () => {
    const pwdHash = CryptoJS.SHA256(plainPassword).toString();
    await fetch('/api/clear-chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ roomId, passwordHash: pwdHash, username })
    });
});

document.getElementById('deleteRoomBtn').addEventListener('click', async () => {
    const pwdHash = CryptoJS.SHA256(plainPassword).toString();
    await fetch('/api/delete-room', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ roomId, passwordHash: pwdHash, username })
    });
});
