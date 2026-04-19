# ChatApp – Messenger with Voice & Video Calls

A full-featured messenger app built with **React + Firebase + WebRTC (PeerJS)**.

## Features
- 🔐 **Authentication** – Sign up / Login with email & password (Firebase Auth)
- 💬 **Real-time Chat** – Instant messaging using Firestore
- 📞 **Voice Calls** – WebRTC-powered peer-to-peer voice calls
- 🎥 **Video Calls** – Full video call with Picture-in-Picture local preview
- 🔇 **Mute / Camera toggle** during calls
- 👥 **Contact list** with online status & search

---

## Setup

### 1. Create a Firebase Project
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** (start in test mode)
5. Copy your **Web App config**

### 2. Configure Firebase
Edit `src/firebase/config.js` and fill in your config values.

### 3. Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /chats/{chatId}/messages/{msgId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Run
```bash
npm install
npm run dev
```
Open http://localhost:5173
