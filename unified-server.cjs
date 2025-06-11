const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Environment variables validation
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

console.log('🔍 Environment Variables Check:');
console.log('VITE_OPENAI_API_KEY from env:', OPENAI_API_KEY ? 'SET' : 'NOT SET');
if (OPENAI_API_KEY) {
  console.log('Using API Key:', OPENAI_API_KEY.substring(0, 20) + '...');
  console.log('API Key length:', OPENAI_API_KEY.length);
  console.log('API Key validation:', OPENAI_API_KEY.startsWith('sk-proj-') ? '✅ VALID FORMAT' : '❌ INVALID FORMAT');
}
console.log('Eleven Labs API Key:', ELEVEN_LABS_API_KEY ? 'SET' : 'NOT SET');

// API key validation
const keyValidation = {
  valid: OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-proj-') && OPENAI_API_KEY.length > 50,
  error: !OPENAI_API_KEY 
    ? 'No API key provided' 
    : !OPENAI_API_KEY.startsWith('sk-proj-') 
      ? 'Invalid key format (should start with sk-proj-)' 
      : OPENAI_API_KEY.length <= 50
        ? 'Key too short' 
        : null
};

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

// Doctor voices configuration
const DOCTOR_VOICES = {
  'Dr. Aarav': {
    personality: 'Calm, analytical, and supportive specialist in Cognitive Behavioral Therapy',
    approach: 'CBT techniques, thought pattern analysis, behavioral modification',
    voiceId: '21m00Tcm4TlvDq8ikWAM' // Default male voice
  },
  'Dr. Aarchi': {
    personality: 'Warm, empathetic, and nurturing specialist in Mindfulness and Emotional Wellness',
    approach: 'Mindfulness practices, emotional regulation, holistic wellness',
    voiceId: 'EaBs7G1VibMrNAuz2Na7' // Updated female voice
  }
};

// Store live conversation states
const conversationStates = new Map();

// ============= API ROUTES =============

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Text-to-speech endpoint
app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!ELEVEN_LABS_API_KEY || ELEVEN_LABS_API_KEY === 'your_eleven_labs_api_key_here') {
      console.log('⚠️ Eleven Labs API key not configured, using fallback');
      return res.json({ 
        fallback: true, 
        text: text,
        message: 'Using browser speech synthesis' 
      });
    }

    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      console.error('❌ Eleven Labs error:', response.status);
      return res.json({ 
        fallback: true, 
        text: text,
        message: 'Eleven Labs failed, using browser speech synthesis' 
      });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('💥 TTS error:', error);
    res.json({ 
      fallback: true, 
      text: req.body.text,
      message: 'Server error, using browser speech synthesis' 
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, language } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    if (!keyValidation.valid) {
      return res.status(400).json({ 
        error: `Invalid API key format: ${keyValidation.error}. Please get a valid API key from https://platform.openai.com/api-keys`
      });
    }

    const systemPrompt = `You are a compassionate, professional, and experienced AI therapist. Your role is to provide supportive, empathetic, and therapeutic responses.

IMPORTANT LANGUAGE GUIDELINES:
- If the user speaks in Hinglish (mix of Hindi and English), respond in the same Hinglish style
- If they say "mko accha ni lag raha hai" or similar Hindi/Hinglish phrases, use similar language patterns in your response
- Match their language preference: pure English, pure Hindi, or Hinglish mix
- For ${language || 'English'} language preference, respond accordingly, but prioritize matching their actual speaking style

THERAPEUTIC APPROACH:
- Use therapeutic techniques like reflection, validation, and gentle guidance
- Ask thoughtful follow-up questions to help them explore their feelings
- Provide coping strategies and emotional support
- Use phrases like "I understand how that must feel", "It sounds like...", "Tell me more about..."
- Acknowledge their emotions without judgment
- Offer practical suggestions when appropriate
- Keep responses 2-3 sentences but meaningful and therapeutic`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error:', errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid OpenAI API key.' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      
      return res.status(response.status).json({ error: errorData.error?.message || 'OpenAI API error' });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content?.trim();
    
    if (!aiMessage) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    res.json({ response: aiMessage });
    
  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Transcribe endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!ASSEMBLYAI_API_KEY) {
      return res.status(500).json({ error: 'AssemblyAI API key not configured' });
    }

    // Upload audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
      },
      body: req.file.buffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`AssemblyAI upload failed: ${uploadResponse.status}`);
    }

    const { upload_url } = await uploadResponse.json();

    // Request transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_detection: true,
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`AssemblyAI transcription failed: ${transcriptResponse.status}`);
    }

    const { id } = await transcriptResponse.json();

    // Poll for completion
    let transcript;
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { 'authorization': ASSEMBLYAI_API_KEY },
      });

      if (!pollResponse.ok) {
        throw new Error(`AssemblyAI polling failed: ${pollResponse.status}`);
      }

      transcript = await pollResponse.json();

      if (transcript.status === 'completed') {
        break;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= maxAttempts) {
      throw new Error('Transcription timeout');
    }

    res.json({
      text: transcript.text || '',
      confidence: transcript.confidence || 0.5,
      language: transcript.language_code || 'en'
    });

  } catch (error) {
    console.error('💥 Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed: ' + error.message });
  }
});

// ============= WEBSOCKET HANDLERS =============

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('start-live-conversation', async (data) => {
    try {
      const { doctorId, userId } = data;
      const doctor = DOCTOR_VOICES[doctorId];
      
      if (!doctor) {
        socket.emit('error', { message: 'Invalid doctor selected' });
        return;
      }

      console.log(`🎤 Starting live conversation with ${doctorId} for user ${userId}`);

      // Initialize conversation state
      const conversationState = {
        doctorId,
        userId,
        conversationHistory: [],
        isActive: true
      };
      
      conversationStates.set(socket.id, conversationState);

      // Send welcome message
      const welcomeMessage = getWelcomeMessage(doctorId);
      conversationState.conversationHistory.push({
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      });

      // Generate welcome audio
      await streamTextToSpeech(socket, welcomeMessage, doctor.voiceId);

    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      socket.emit('error', { message: 'Failed to start conversation' });
    }
  });

  socket.on('send-message', async (data) => {
    try {
      const { message } = data;
      const conversationState = conversationStates.get(socket.id);
      
      if (!conversationState) {
        socket.emit('error', { message: 'No active conversation found' });
        return;
      }

      console.log('💬 User message:', message);

      // Add user message to history
      conversationState.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Generate AI response
      await generateAIResponse(socket, conversationState, message);

    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    conversationStates.delete(socket.id);
  });
});

// Helper functions for live voice chat
async function generateAIResponse(socket, conversationState, userMessage) {
  try {
    console.log('🗣️ Starting AI response generation...');
    
    const doctor = DOCTOR_VOICES[conversationState.doctorId];
    const prompt = createTherapeuticPrompt(conversationState.doctorId, doctor);
    
    // Create messages array with conversation history
    const messages = [
      { role: 'system', content: prompt },
      ...conversationState.conversationHistory.slice(-6) // Keep last 6 messages for context
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 60,
        stream: false,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    console.log('🤖 AI Response:', aiResponse);

    // Add to conversation history
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Send text response immediately
    socket.emit('ai-response', { text: aiResponse });
    
    // Generate and stream audio
    await streamTextToSpeech(socket, aiResponse, doctor.voiceId);

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    
    const fallbackResponse = "I'm sorry, I'm having trouble processing that right now. Could you please try again?";
    socket.emit('ai-response', { text: fallbackResponse });
    
    try {
      const doctor = DOCTOR_VOICES[conversationState.doctorId];
      await streamTextToSpeech(socket, fallbackResponse, doctor.voiceId);
    } catch (ttsError) {
      console.error('❌ TTS fallback failed:', ttsError);
    }
  }
}

async function streamTextToSpeech(socket, text, voiceId) {
  try {
    console.log('🔊 Streaming TTS for:', text.substring(0, 50) + '...');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.85,
          style: 0.15,
          use_speaker_boost: true
        },
        optimize_streaming_latency: 4,
        output_format: 'mp3_22050_32'
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('⚠️ Rate limit hit, skipping TTS for this message');
        return;
      }
      throw new Error(`Eleven Labs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ TTS completed, audio size:', audioBuffer.byteLength, 'bytes');

    socket.emit('audio-response', { 
      audio: Array.from(new Uint8Array(audioBuffer)),
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('❌ Error streaming TTS:', error);
  }
}

function createTherapeuticPrompt(doctorId, doctor) {
  const basePrompt = `You are ${doctorId}, a warm and professional therapist having a LIVE VOICE conversation. Your personality is ${doctor.personality} and you specialize in ${doctor.approach}.

CRITICAL RESPONSE RULES:
- Keep responses under 12 words maximum
- One sentence only
- Respond naturally like a real human therapist would
- If asked "How are you?", respond naturally about your wellbeing as a therapist
- Match their language style (English/Hindi/Hinglish)
- Be warm, empathetic, and genuine

Remember: Sound like a real human therapist having a natural conversation!`;

  return basePrompt;
}

function getWelcomeMessage(doctorId) {
  if (doctorId === 'Dr. Aarav') {
    return "Hello! I'm Dr. Aarav. I'm doing well today and I'm here for you. How are you feeling?";
  } else if (doctorId === 'Dr. Aarchi') {
    return "Hi there! I'm Dr. Aarchi. I'm having a good day and ready to listen. How are you doing?";
  }
  return "Hello! I'm here and ready to listen. How are you feeling today?";
}

// Serve static files for frontend (only for non-API routes)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route for SPA - only serve index.html for non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Run "npm run build" first.');
  }
});

// Start unified server
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 =====================================');
  console.log('🎯 UNIFIED MINDFULAI SERVER STARTED');
  console.log('🚀 =====================================');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🎤 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`🔊 Speak API: http://localhost:${PORT}/api/speak`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log('');
  console.log('🔑 API Configuration:');
  console.log(`   OpenAI: ${!!OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   Eleven Labs: ${!!ELEVEN_LABS_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   AssemblyAI: ${!!ASSEMBLYAI_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log('');
  console.log('👨‍⚕️ Available Doctors:');
  console.log('   - Dr. Aarav (Cognitive Behavioral Therapy)');
  console.log('   - Dr. Aarchi (Mindfulness & Emotional Wellness)');
  console.log('');
  console.log('🎤 Ready for full-stack therapy conversations!');
  console.log('🚀 =====================================');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is busy. Railway will assign a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
}); 