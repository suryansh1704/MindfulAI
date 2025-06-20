# MindfulAI - AI Therapy Companion 🧠

MindfulAI is an AI-powered therapy companion application that provides supportive conversations with **live voice chat** capabilities. Experience natural, real-time conversations with AI therapists just like ChatGPT Live Mode!

## ✨ Features

- 🎤 **Live Voice Chat** - Real-time conversation with instant responses (0.6s like ChatGPT Live)
- 🛑 **Natural Interruptions** - AI stops and acknowledges when you interrupt ("Hmm", "Uh-huh")
- 🧠 **AI-powered therapeutic conversations** with Dr. Aarav (CBT) and Dr. Aarchi (Mindfulness)
- 🔒 **Secure and confidential sessions**
- 🌐 **Multilingual support** (English/Hindi)
- 💬 **Real-time chat interface** with voice and text
- 🔐 **User authentication** with Firebase
- ✨ **Modern and responsive UI**
- 🚀 **Instant speech recognition** with aggressive auto-retry

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express.js, Socket.io
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Voice**: Browser Speech Recognition API, ElevenLabs TTS
- **Real-time**: WebSocket for live voice chat
- **Authentication**: Firebase Authentication
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/suryansh1704/MindfulAI.git
cd MindfulAI
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Then edit `.env` with your API keys:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

4. Start all servers (API, Voice, Frontend):
```bash
# Option 1: Use PowerShell script (Recommended)
powershell -ExecutionPolicy Bypass -File start-servers.ps1

# Option 2: Use batch file
start-servers.bat

# Option 3: Manual start (3 separate terminals)
node simple-api-server.cjs    # Terminal 1
node live-voice-server.cjs    # Terminal 2  
npm run dev                   # Terminal 3
```

5. Open your browser and navigate to `http://localhost:8081`

## 🚀 Deployment Options

### 1. Vercel (Recommended for Frontend + API)
```bash
npm run build
npx vercel --prod
```

### 2. Netlify (Frontend Only)
```bash
npm run build
# Upload dist/ folder to Netlify
```

### 3. Railway (Full-Stack with Voice Server)
```bash
# Connect your GitHub repo to Railway
# Set environment variables in Railway dashboard
# Deploy automatically on push
```

### 4. Render (Full-Stack Alternative)
```bash
# Connect GitHub repo to Render
# Set environment variables
# Deploy with start command: node simple-api-server.cjs
```

### 5. Heroku (Traditional)
```bash
# Add Procfile (already included)
git push heroku master
```

### Environment Variables for Production
Set these in your deployment platform:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
OPENAI_API_KEY=your_openai_api_key  
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
PORT=3000
```

**Note**: For full voice functionality, you need a platform that supports WebSocket connections (Railway, Render, or VPS).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Disclaimer

This application is an AI-powered service and not a substitute for professional mental health care. If you're experiencing serious mental health issues, please seek professional help.
