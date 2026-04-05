function switchTab(tab) {
    const joinForm = document.getElementById('joinForm');
    const createForm = document.getElementById('createForm');
    const btns = document.querySelectorAll('.tab-btn');
    
    if (tab === 'join') {
        joinForm.classList.add('active');
        createForm.classList.remove('active');
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
    } else {
        createForm.classList.add('active');
        joinForm.classList.remove('active');
        btns[1].classList.add('active');
        btns[0].classList.remove('active');
    }
}

function hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
}

document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = document.getElementById('createRoomId').value.trim();
    const password = document.getElementById('createPassword').value;
    const maxUsers = document.getElementById('createMaxUsers').value;
    const creator = document.getElementById('createCreator').value.trim();
    const errorEl = document.getElementById('createError');
    const successEl = document.getElementById('createSuccess');
    
    errorEl.textContent = '';
    successEl.textContent = '';

    if (!roomId || !password || !creator) return;

    try {
        const res = await fetch('/api/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                roomId, 
                passwordHash: hashPassword(password), 
                maxUsers, 
                creator 
            })
        });
        const data = await res.json();
        
        if (data.success) {
            successEl.textContent = 'Room created successfully! Joining...';
            setTimeout(() => {
                sessionStorage.setItem('chat_roomId', roomId);
                sessionStorage.setItem('chat_password', password); // Used locally for end-to-end encryption
                sessionStorage.setItem('chat_username', creator);
                sessionStorage.setItem('chat_isCreator', 'true');
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            errorEl.textContent = data.error || 'Got an error creating room.';
        }
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
    }
});

document.getElementById('joinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = document.getElementById('joinRoomId').value.trim();
    const password = document.getElementById('joinPassword').value;
    const username = document.getElementById('joinUsername').value.trim();
    const errorEl = document.getElementById('joinError');
    
    errorEl.textContent = '';

    if (!roomId || !password || !username) return;

    try {
        const res = await fetch('/api/join-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                roomId, 
                passwordHash: hashPassword(password),
                username
            })
        });
        const data = await res.json();
        
        if (data.success) {
            sessionStorage.setItem('chat_roomId', roomId);
            sessionStorage.setItem('chat_password', password);
            sessionStorage.setItem('chat_username', username);
            if (data.roomInfo && data.roomInfo.creator === username) {
                sessionStorage.setItem('chat_isCreator', 'true');
            } else {
                sessionStorage.removeItem('chat_isCreator');
            }
            window.location.href = 'chat.html';
        } else {
            errorEl.textContent = data.error || 'Failed to join room.';
        }
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
    }
});
