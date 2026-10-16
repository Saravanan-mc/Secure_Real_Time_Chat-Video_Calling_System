


# 🔐 Secure Real-Time Chat & Video Calling System with Encryption

![Node.js](https://img.shields.io/badge/Node.js-Runtime-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WebRTC](https://img.shields.io/badge/WebRTC-Video%20Calling-333333?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Encryption-red?style=for-the-badge&logo=letsencrypt&logoColor=white)

## 🔒 Overview

A web-based real-time communication project designed to bring together messaging, video calling, and security-focused features.

Built with JavaScript, Node.js, and WebRTC-related components, the project explores how encryption and secure communication practices can help protect conversations and media exchanged between users.

**Security objective:** protect messages and calls against unauthorized access using appropriate encryption, secure connections, and access controls.

> **Encryption status:** The repository structure alone does not prove that end-to-end encryption is implemented. Verify the encryption logic before describing the application as fully end-to-end encrypted.

## ✨ Key Features

- 💬 Real-time messaging interface
- 📹 Browser-based video calling with WebRTC-related functionality
- 🔐 Encryption-focused communication design
- 🛡️ Secure connection and data-handling practices
- 😀 Sticker assets for chat
- 🎨 Theme customization
- 🏠 Room-related data and communication structure
- 📱 Responsive interface as a development goal

## 🔐 Encryption and Security

### 1. Message encryption

A secure messaging implementation can encrypt a message before sending it and decrypt it only on the recipient's device.

```text
Sender types a message
↓
Message is encrypted
↓
Encrypted message is transmitted
↓
Recipient receives encrypted data
↓
Recipient decrypts the message
↓
Original message is displayed
```

For genuine end-to-end encryption, the server should not have access to the plaintext messages or the keys needed to decrypt them.

### 2. Video-call encryption

WebRTC normally uses encrypted media transport, including DTLS-SRTP for standard peer connections.

However, encrypted transport alone does not necessarily mean that a call is end-to-end encrypted against every intermediary or server architecture. The implementation and trust model must be evaluated.

### 3. Recommended security practices

- Use HTTPS in production.
- Use established cryptographic libraries instead of inventing encryption algorithms.
- Protect private keys and authentication secrets.
- Validate and authorize room access.
- Avoid logging plaintext messages or sensitive credentials.
- Use secure session management and rate limiting.
- Keep dependencies updated.
- Provide safe key generation, storage, and recovery mechanisms.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Web interface structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Client-side interactions |
| Node.js | Server-side runtime |
| WebRTC | Real-time audio/video communication |
| Cryptographic APIs or libraries | Message encryption, if implemented |
| JSON | Room-related data storage |

## 📂 Project Structure

```text
Secure_Real_Time_Chat-Video_Calling_System/
│
├── public/
│ ├── stickers/
│ ├── index.html
│ ├── chat.html
│ ├── script.js
│ ├── chat.js
│ ├── style.css
│ ├── theme.js
│ └── webrtc.js
│
├── server.js
├── rooms.json
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Installation

### Prerequisites

- Node.js and npm
- A modern web browser
- HTTPS for production deployment
- Any configuration values required by the application

### Clone the repository

```bash
git clone https://github.com/Saravanan-mc/Secure_Real_Time_Chat-Video_Calling_System.git
cd Secure_Real_Time_Chat-Video_Calling_System
```

### Install dependencies

```bash
npm install
```

### Start the application

If `package.json` defines a start script:

```bash
npm start
```

Otherwise, if `server.js` is the server entry point:

```bash
node server.js
```

Open the local address printed by the server in your browser.

## 🔮 Future Improvements

- Implement verified end-to-end encrypted messaging.
- Add secure identity and public-key verification.
- Support private and group chat rooms.
- Add message authentication and replay protection.
- Improve video-call connection reliability.
- Add security testing and dependency auditing.
- Document the encryption protocol and threat model.

## 👨‍💻 Author

**Saravanan-mc**

- GitHub: [@Saravanan-mc](https://github.com/Saravanan-mc)
- Repository: [Secure Real-Time Chat & Video Calling System](https://github.com/Saravanan-mc/Secure_Real_Time_Chat-Video_Calling_System)

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---

<p align="center">
<b>Private Conversations. Encrypted Communication. Secure Connections. 🔐</b>
</p>
