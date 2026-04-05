// webrtc.js
let localStream = null;
const peerConnections = {}; // Map socket.id to RTCPeerConnection
let inCall = false;

const startAudioBtn = document.getElementById('startAudioBtn');
const startVideoBtn = document.getElementById('startVideoBtn');
const leaveCallBtn = document.getElementById('leaveCallBtn');
const videoContainer = document.getElementById('videoContainer');
const localVideo = document.getElementById('localVideo');
const localVideoBox = document.getElementById('localVideoBox');

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function joinCall(videoEnabled) {
    if (inCall) return;
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: videoEnabled,
            audio: true
        });

        localVideo.srcObject = localStream;
        localVideoBox.style.display = 'block';
        videoContainer.classList.add('active');
        
        startAudioBtn.style.display = 'none';
        startVideoBtn.style.display = 'none';
        leaveCallBtn.style.display = 'flex';
        inCall = true;

        socket.emit('webrtc-join-call');
        
        // Notify others
        if (window.sendCallNotification) {
            window.sendCallNotification(videoEnabled);
        }

    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Could not access camera or microphone.");
    }
}

startAudioBtn.addEventListener('click', () => joinCall(false));
startVideoBtn.addEventListener('click', () => joinCall(true));

leaveCallBtn.addEventListener('click', () => {
    if (!inCall) return;
    
    // Stop local streams
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    localVideoBox.style.display = 'none';
    videoContainer.classList.remove('active');
    
    startAudioBtn.style.display = 'flex';
    startVideoBtn.style.display = 'flex';
    leaveCallBtn.style.display = 'none';
    inCall = false;

    // Close all P2P connections
    for (const id in peerConnections) {
        peerConnections[id].close();
        delete peerConnections[id];
        removeRemoteVideo(id);
    }
    
    socket.emit('webrtc-leave-call');
});

function createPeerConnection(targetId, initiator) {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[targetId] = pc;

    // Add local tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
                target: targetId,
                candidate: event.candidate
            });
        }
    };

    pc.ontrack = (event) => {
        addRemoteVideo(targetId, event.streams[0]);
    };

    return pc;
}

function addRemoteVideo(id, stream) {
    let videoBox = document.getElementById(`video-${id}`);
    if (!videoBox) {
        videoBox = document.createElement('div');
        videoBox.className = 'video-box';
        videoBox.id = `video-${id}`;
        
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        
        const label = document.createElement('div');
        label.className = 'video-label';
        // We could look up their name from currentUsers array
        const userObj = currentUsers.find(u => u.id === id);
        label.textContent = userObj ? userObj.username : 'User';

        videoBox.appendChild(video);
        videoBox.appendChild(label);
        videoContainer.appendChild(videoBox);
    } else {
        const video = videoBox.querySelector('video');
        video.srcObject = stream;
    }
    videoContainer.classList.add('active');
}

function removeRemoteVideo(id) {
    const videoBox = document.getElementById(`video-${id}`);
    if (videoBox) {
        videoBox.remove();
    }
    if (videoContainer.children.length <= 1) { // only local video left
        if (!inCall) videoContainer.classList.remove('active');
    }
}

// Socket Events for WebRTC

socket.on('webrtc-user-joined-call', async (senderId) => {
    if (!inCall) return; // Ignore if I am not in the call
    
    // I will initiate the connection to the new user
    const pc = createPeerConnection(senderId, true);
    
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
            target: senderId,
            sdp: pc.localDescription
        });
    } catch (e) {
        console.error("Create offer error", e);
    }
});

socket.on('webrtc-offer', async (data) => {
    if (!inCall) return;
    
    const pc = createPeerConnection(data.sender, false);
    
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('webrtc-answer', {
            target: data.sender,
            sdp: pc.localDescription
        });
    } catch (e) {
        console.error("Offer handle error", e);
    }
});

socket.on('webrtc-answer', async (data) => {
    const pc = peerConnections[data.sender];
    if (pc) {
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (e) {
            console.error("Answer handle error", e);
        }
    }
});

socket.on('webrtc-ice-candidate', async (data) => {
    const pc = peerConnections[data.sender];
    if (pc) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error("ICE handle error", e);
        }
    }
});

socket.on('webrtc-user-left-call', (senderId) => {
    if (peerConnections[senderId]) {
        peerConnections[senderId].close();
        delete peerConnections[senderId];
        removeRemoteVideo(senderId);
    }
});
