const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { AssemblyAI } = require('assemblyai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// WebSocket server setup - no file uploads needed for live voice

// Check and log OpenAI API Key configuration
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

// Initialize AssemblyAI
const assemblyai = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY
});

// Validate API key format
function validateOpenAIKey(key) {
  if (!key) return { valid: false, error: 'No API key provided' };
  
  // OpenAI keys should start with specific prefixes
  const validPrefixes = ['sk-proj-', 'sk-None-', 'sk-svcacct-', 'sk-'];
  const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return { 
      valid: false, 
      error: `Invalid API key format. OpenAI keys should start with: ${validPrefixes.join(', ')}. Your key starts with: ${key.substring(0, 10)}...` 
    };
  }
  
  // Check for common format issues
  if (key.includes('_') && !key.includes('-')) {
    return { 
      valid: false, 
      error: 'API key format appears incorrect. OpenAI keys use hyphens (-) not underscores (_)' 
    };
  }
  
  return { valid: true };
}

const keyValidation = validateOpenAIKey(OPENAI_API_KEY);

console.log('🔍 Environment Variables Check:');
console.log('VITE_OPENAI_API_KEY from env:', process.env.VITE_OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('Using API Key:', OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 20) + '...' : 'NONE');
console.log('API Key length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
console.log('API Key validation:', keyValidation.valid ? '✅ VALID FORMAT' : `❌ INVALID: ${keyValidation.error}`);
console.log('Eleven Labs API Key:', ELEVEN_LABS_API_KEY ? 'SET' : 'NOT SET');

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Live Voice Server is running',
    services: {
      openai: !!OPENAI_API_KEY,
      elevenLabs: !!ELEVEN_LABS_API_KEY,
      assemblyai: !!ASSEMBLYAI_API_KEY
    }
  });
});

// Doctor voice configurations with specific Indian voices
const DOCTOR_VOICES = {
  'Dr. Aarav': {
    voiceId: 'xnx6sPTtvU635ocDt2j7', // Custom Indian male voice
    personality: 'calm and reassuring',
    approach: 'cognitive behavioral therapy',
    accent: 'Indian male'
  },
  'Dr. Aarchi': {
    voiceId: 'ryIIztHPLYSJ74ueXxnO', // Custom Indian female voice
    personality: 'warm and empathetic',
    approach: 'mindfulness-based therapy',
    accent: 'Indian female'
  }
};

// Active conversations storage
const activeConversations = new Map();

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Set up keep-alive ping
  const keepAlive = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    } else {
      clearInterval(keepAlive);
    }
  }, 30000); // Ping every 30 seconds

  // Start live conversation
  socket.on('start-live-conversation', async (data) => {
    try {
      const { doctorId, userId } = data;
      console.log(`🎤 Starting live conversation with ${doctorId} for user ${userId}`);

      // Initialize conversation state
      const conversationState = {
        doctorId,
        userId,
        isListening: false,
        isSpeaking: false,
        transcriptionBuffer: '',
        conversationHistory: [],
        assemblyaiSession: null
      };

      activeConversations.set(socket.id, conversationState);

      // Send welcome message
      const doctor = DOCTOR_VOICES[doctorId];
      const welcomeMessage = getWelcomeMessage(doctorId);
      
      conversationState.conversationHistory.push({
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      });

      // Send welcome message to client
      socket.emit('ai-response', { text: welcomeMessage });
      await streamTextToSpeech(socket, welcomeMessage, doctor.voiceId);

      socket.emit('conversation-started', { 
        doctorId, 
        message: 'Live conversation started. Start speaking!' 
      });

    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      socket.emit('error', { message: 'Failed to start conversation' });
    }
  });

  // Simplified text message handling for now (we can add real-time audio later)
  socket.on('send-message', async (data) => {
    console.log('📨 Received send-message:', data);
    const { message } = data;
    const conversation = activeConversations.get(socket.id);
    
    console.log('🔍 Conversation found:', !!conversation);
    console.log('💬 User message:', message);
    
    if (conversation) {
      // Add user message
      conversation.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      console.log('🗣️ Starting AI response generation...');
      // Generate AI response
      await generateAndStreamResponse(socket, message, conversation);
    } else {
      console.log('❌ No conversation found for socket:', socket.id);
      socket.emit('error', { message: 'No active conversation found' });
    }
  });

  // Handle ping response
  socket.on('pong', () => {
    // Client is alive
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    clearInterval(keepAlive);
    activeConversations.delete(socket.id);
  });
});

// Old transcribe and speak endpoints removed - using WebSocket for live voice

// Old speak endpoint removed - using WebSocket streaming TTS

// OpenAI API proxy endpoint
app.post('/api/chat', async (req, res) => {
  try {
    console.log('📨 Received chat request');
    console.log('Request body:', req.body);
    
    const { message, language } = req.body;
    
    if (!message) {
      console.log('❌ No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!OPENAI_API_KEY) {
      console.log('❌ OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Check API key format before making request
    if (!keyValidation.valid) {
      console.log('❌ Invalid API key format:', keyValidation.error);
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
- Keep responses 2-3 sentences but meaningful and therapeutic

EXAMPLE RESPONSES:
- If they say "mko accha ni lag raha hai I am feeling frustrated" respond like: "Main samajh sakta hun ki aap frustrated feel kar rahe hain. It's completely normal to feel this way sometimes. Kya aap mujhe bata sakte hain ki kya cheez aapko aise feel kara rahi hai?"
- Always respond as a caring therapist, not just a chatbot`;

    console.log('🤖 Calling OpenAI API...');
    console.log('Using API Key:', OPENAI_API_KEY.substring(0, 20) + '...');
    
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

    console.log('📡 OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error:', errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid OpenAI API key. Please get a valid key from https://platform.openai.com/api-keys and add credits to your account.' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      } else if (response.status === 403) {
        return res.status(403).json({ error: 'API quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/settings/organization/billing/overview' });
      }
      
      return res.status(response.status).json({ error: errorData.error?.message || 'OpenAI API error' });
    }

    const data = await response.json();
    console.log('✅ OpenAI API success');
    
    const aiMessage = data.choices?.[0]?.message?.content?.trim();
    if (!aiMessage) {
      console.error('❌ No response content from OpenAI:', data);
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    console.log('💬 Sending response:', aiMessage.substring(0, 100) + '...');
    res.json({ response: aiMessage });
    
  } catch (error) {
    console.error('💥 Server error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - serve index.html for all other routes
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Run "npm run build" first.');
  }
});

// Generate AI response and stream as audio
async function generateAndStreamResponse(socket, userMessage, conversationState) {
  try {
    console.log('🤖 Generating AI response for message:', userMessage);
    
    const { doctorId } = conversationState;
    const doctor = DOCTOR_VOICES[doctorId];
    console.log('👨‍⚕️ Using doctor:', doctorId, doctor ? 'found' : 'not found');
    
    // Create therapeutic prompt
    const systemPrompt = createTherapeuticPrompt(doctorId, doctor);
    
    // Prepare conversation context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationState.conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.6, // Slightly lower for more consistent short responses
        max_tokens: 80, // Even shorter for faster generation and speech
        stream: false,
        frequency_penalty: 0.2, // Reduce repetition
        presence_penalty: 0.1
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

    // Start TTS generation immediately (don't await)
    const ttsPromise = streamTextToSpeech(socket, aiResponse, doctor.voiceId);
    
    // Send text response to client immediately after TTS starts
    socket.emit('ai-response', { text: aiResponse });
    
    // Wait for TTS to complete
    await ttsPromise;

  } catch (error) {
    console.error('❌ Error generating AI response:', error);
    console.error('❌ Error details:', error.message);
    
    // Send a fallback response instead of just an error
    const fallbackResponse = "I'm sorry, I'm having trouble processing that right now. Could you please try again?";
    
    // Add to conversation history
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: fallbackResponse,
      timestamp: new Date()
    });

    // Send fallback response
    socket.emit('ai-response', { text: fallbackResponse });
    
    // Try to generate TTS for fallback
    try {
      const doctor = DOCTOR_VOICES[conversationState.doctorId];
      await streamTextToSpeech(socket, fallbackResponse, doctor.voiceId);
    } catch (ttsError) {
      console.error('❌ TTS fallback also failed:', ttsError);
      socket.emit('error', { message: 'Having technical difficulties. Please try again.' });
    }
  }
}

// Stream text to speech using Eleven Labs
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
        model_id: 'eleven_turbo_v2', // Faster model
        voice_settings: {
          stability: 0.6, // Slightly lower for faster processing
          similarity_boost: 0.8,
          style: 0.2, // Lower for speed
          use_speaker_boost: false // Disable for speed
        },
        optimize_streaming_latency: 4, // Maximum optimization
        output_format: 'mp3_22050_32', // Lower quality for speed
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('⚠️ Rate limit hit, skipping TTS for this message');
        return; // Skip TTS but don't throw error
      }
      throw new Error(`Eleven Labs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ TTS completed, audio size:', audioBuffer.byteLength, 'bytes');

    // Send audio to client immediately
    socket.emit('audio-response', { 
      audio: Array.from(new Uint8Array(audioBuffer)),
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('❌ Error streaming TTS:', error);
    // Don't emit error for TTS failures, just log them
    console.log('🔇 Continuing without audio for this message');
  }
}

// Create therapeutic prompt based on doctor
function createTherapeuticPrompt(doctorId, doctor) {
  const basePrompt = `You are ${doctorId}, a professional AI therapist specializing in ${doctor.approach}. Your personality is ${doctor.personality}.

CRITICAL: This is a LIVE VOICE conversation - responses must be VERY SHORT (10-15 words maximum, 1 sentence only).

GUIDELINES:
- Maximum 10-15 words per response
- One sentence only
- Be warm and supportive
- Ask simple follow-up questions
- Match the user's language (English, Hindi, Hinglish)
- Sound natural and conversational

EXAMPLES OF GOOD RESPONSES:
- "I hear you. How are you feeling right now?"
- "That sounds difficult. Can you tell me more?"
- "I understand. What's been most challenging?"
- "How has that been affecting you?"

Remember: BREVITY is key for live conversation flow.`;

  return basePrompt;
}

// Get welcome message based on doctor
function getWelcomeMessage(doctorId) {
  if (doctorId === 'Dr. Aarav') {
    return "Hello, I'm Dr. Aarav. I'm here to listen and support you. What's on your mind today?";
  } else if (doctorId === 'Dr. Aarchi') {
    return "Hi there, I'm Dr. Aarchi. This is a safe space for you. How are you feeling right now?";
  }
  return "Hello, I'm here to listen. How can I support you today?";
}

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log('🎤 =====================================');
  console.log('🎯 LIVE VOICE THERAPY SERVER STARTED');
  console.log('🎤 =====================================');
  console.log(`✅ WebSocket Server: http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
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
  console.log('🎤 Ready for live voice conversations!');
  console.log('🎤 =====================================');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is busy. Try a different port or kill the process using this port.`);
  } else {
    console.error('❌ Server error:', err);
  }
}); 