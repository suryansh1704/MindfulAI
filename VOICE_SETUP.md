# Voice Chat Setup Guide

## 🎤 Voice Feature Overview

Your AI therapist app now supports both text and voice conversations! Users can choose between:

1. **Text Chat** - Traditional typing conversation
2. **Voice Chat** - Speak naturally and hear AI responses

## 🔧 Current Setup Status

✅ **OpenAI Whisper STT** - Ready to use (uses your existing OpenAI API key)
⚠️ **Eleven Labs TTS** - Needs configuration (falls back to browser TTS)

## 🎙️ Eleven Labs Configuration (Optional)

To get high-quality AI voice responses, set up Eleven Labs:

### Step 1: Get Eleven Labs API Key
1. Go to [ElevenLabs.io](https://elevenlabs.io/)
2. Sign up for a free account
3. Go to your profile settings
4. Copy your API key

### Step 2: Configure Environment
Add your Eleven Labs API key to your environment:

**Windows (PowerShell):**
```bash
$env:ELEVEN_LABS_API_KEY="your_eleven_labs_api_key_here"
```

**Or add to your system environment variables:**
1. Press Win + R, type `sysdm.cpl`
2. Click "Environment Variables"
3. Add new variable: `ELEVEN_LABS_API_KEY` with your key

### Step 3: Restart Server
```bash
.\start-server.bat
```

## 🗣️ Fallback Behavior

**Without Eleven Labs:** Uses browser's built-in text-to-speech (works but basic quality)
**With Eleven Labs:** High-quality AI voice with natural intonation

## 🎯 Voice Features

### For Users:
- **🎤 Record:** Click microphone to speak naturally
- **🤖 Transcription:** OpenAI Whisper converts speech to text
- **💭 AI Response:** Same therapeutic intelligence as text chat
- **🔊 Voice Reply:** AI speaks back with either Eleven Labs or browser TTS
- **🌐 Language Support:** Works with English, Hindi, and Hinglish

### Technical Features:
- Real-time audio level visualization
- Automatic language detection
- Audio format handling (WebM to compatible formats)
- Graceful fallbacks for all components
- Mobile-friendly voice controls

## 🚀 Testing Voice Features

1. Start both servers (backend and frontend)
2. Sign in to the app
3. Choose "Talk to Therapist" 
4. Click the microphone and speak
5. Listen to the AI's response

## 🛠️ Troubleshooting

### Audio Recording Issues:
- Check microphone permissions in browser
- Ensure HTTPS for production (some browsers require it)
- Test with different browsers if needed

### Transcription Problems:
- Verify OpenAI API key has credits
- Check network connectivity
- Speak clearly and in supported languages

### TTS Not Working:
- Check browser console for errors
- Verify Eleven Labs API key if configured
- Browser TTS should work as fallback

## 📱 Mobile Support

Voice features work on mobile devices:
- Request microphone permission
- Tap to start/stop recording
- Audio playback through device speakers
- Responsive UI for all screen sizes

## 🔐 Privacy & Security

- Audio is processed securely through APIs
- No audio files stored permanently
- All processing happens in real-time
- Standard HTTPS encryption for all requests

Enjoy your new voice-powered AI therapy experience! 🎉 