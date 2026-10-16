const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const ROOMS_FILE = path.join(__dirname, 'rooms.json');

app.use(express.json());
app.use(express.static('public'));

// Load rooms
function loadRooms() {
    if (!fs.existsSync(ROOMS_FILE)) {
        fs.writeFileSync(ROOMS_FILE, JSON.stringify({}));
    }
    try {
        const data = fs.readFileSync(ROOMS_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (e) {
        return {};
    }
}

// Save rooms
function saveRooms(rooms) {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));
}

// Cleanup task: every 1 minute check if messages are older than 1 hour
setInterval(() => {
    let rooms = loadRooms();
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    let updated = false;

    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (now - room.lastClearedAt >= ONE_HOUR) {
            if (room.messages && room.messages.length > 0) {
                room.messages = [];
                room.lastClearedAt = now;
                updated = true;
                io.to(roomId).emit('chat-cleared');
            }
        }
    }
    if (updated) saveRooms(rooms);
}, 60000);

// API to create room
app.post('/api/create-room', (req, res) => {
    const { roomId, passwordHash, maxUsers, creator } = req.body;
    let rooms = loadRooms();

    if (rooms[roomId]) {
        return res.status(400).json({ error: 'Room already exists' });
    }

    rooms[roomId] = {
        roomId,
        password: passwordHash, // Server only stores/checks the hash
        maxUsers: parseInt(maxUsers),
        creator,
        users: [], // List of active users {id, username}
        messages: [],
        createdAt: Date.now(),
        lastClearedAt: Date.now()
    };
    saveRooms(rooms);
    res.json({ success: true });
});

// API to join room
app.post('/api/join-room', (req, res) => {
    const { roomId, passwordHash, username } = req.body;
    let rooms = loadRooms();

    const room = rooms[roomId];
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    if (room.password !== passwordHash) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (room.users.length >= room.maxUsers && !room.users.find(u => u.username === username)) {
        return res.status(403).json({ error: 'Room is full' });
    }

    res.json({ success: true, roomInfo: { creator: room.creator, maxUsers: room.maxUsers } });
});

app.post('/api/clear-chat', (req, res) => {
    const { roomId, passwordHash, username } = req.body;
    let rooms = loadRooms();
    const room = rooms[roomId];

    if (room && room.password === passwordHash && room.creator === username) {
        room.messages = [];
        room.lastClearedAt = Date.now();
        saveRooms(rooms);
        io.to(roomId).emit('chat-cleared');
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Unauthorized to clear chat' });
    }
});

app.post('/api/delete-room', (req, res) => {
    const { roomId, passwordHash, username } = req.body;
    let rooms = loadRooms();
    const room = rooms[roomId];

    if (room && room.password === passwordHash && room.creator === username) {
        delete rooms[roomId];
        saveRooms(rooms);
        io.to(roomId).emit('room-deleted');
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Unauthorized to delete room' });
    }
});

// Socket.io for Realtime
io.on('connection', (socket) => {
    
    socket.on('join-room', (roomId, username) => {
        let rooms = loadRooms();
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error-message', 'Room does not exist');
            return;
        }

        // Prevent joining if full
        if (room.users.length >= room.maxUsers && !room.users.find(u => u.id === socket.id)) {
            socket.emit('error-message', 'Room is currently full');
            return;
        }

        socket.join(roomId);
        room.users.push({ id: socket.id, username });
        saveRooms(rooms);

        socket.roomId = roomId;
        socket.username = username;

        socket.to(roomId).emit('user-joined', username);
        io.to(roomId).emit('update-users', room.users);

        // Send existing messages
        socket.emit('load-messages', room.messages);
    });

    socket.on('chat-message', (data) => {
        let rooms = loadRooms();
        if (socket.roomId && rooms[socket.roomId]) {
            const messageObj = {
                sender: data.sender, // The original encrypted sender name or plain name
                encryptedContent: data.encryptedContent,
                timestamp: Date.now(),
                type: data.type || 'text' // text or sticker
            };
            rooms[socket.roomId].messages.push(messageObj);
            saveRooms(rooms);
            socket.to(socket.roomId).emit('chat-message', messageObj);
        }
    });

    socket.on('typing', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('user-typing', socket.username);
        }
    });

    // WebRTC Signaling
    socket.on('webrtc-join-call', () => {
        // Broadcasts to room that this user wants to join the call
        socket.to(socket.roomId).emit('webrtc-user-joined-call', socket.id);
    });

    socket.on('webrtc-offer', (data) => {
        socket.to(data.target).emit('webrtc-offer', {
            sender: socket.id,
            sdp: data.sdp,
            mediaType: data.mediaType
        });
    });

    socket.on('webrtc-answer', (data) => {
        socket.to(data.target).emit('webrtc-answer', {
            sender: socket.id,
            sdp: data.sdp
        });
    });

    socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.target).emit('webrtc-ice-candidate', {
            sender: socket.id,
            candidate: data.candidate
        });
    });
    
    socket.on('webrtc-leave-call', () => {
        socket.to(socket.roomId).emit('webrtc-user-left-call', socket.id);
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            let rooms = loadRooms();
            const room = rooms[socket.roomId];
            if (room) {
                const userIndex = room.users.findIndex(u => u.id === socket.id);
                if (userIndex !== -1) {
                    const user = room.users.splice(userIndex, 1)[0];
                    saveRooms(rooms);
                    socket.to(socket.roomId).emit('user-left', user.username);
                    io.to(socket.roomId).emit('update-users', room.users);
                }
            }
            socket.to(socket.roomId).emit('webrtc-user-left-call', socket.id);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
