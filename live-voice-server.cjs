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
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

// Initialize AssemblyAI
const assemblyai = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY
});

// Validate API key format
function validateOpenAIKey(key) {
  if (!key) return { valid: false, error: 'No API key provided' };
  
  // Basic validation - just check if key exists and has reasonable length
  if (key.length < 20) {
    return { 
      valid: false, 
      error: 'API key appears too short' 
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
        assemblyaiSession: null,
        isInterrupted: false  // Track if user interrupted AI
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

  // Handle user interruption (natural conversation flow)
  socket.on('interrupt-ai', () => {
    console.log('🛑 User interrupted AI - stopping current response');
    const conversation = activeConversations.get(socket.id);
    if (conversation) {
      conversation.isInterrupted = true;
      // The TTS generation will check this flag and stop
    }
  });

  // Handle user interrupting with acknowledgment (like ChatGPT live mode)
  socket.on('user-interrupting', async () => {
    console.log('👂 User is interrupting - sending acknowledgment');
    const conversation = activeConversations.get(socket.id);
    if (conversation) {
      // Send immediate acknowledgment sounds like "hmm", "uh-huh"
      const acknowledgments = ["Hmm", "Uh-huh", "Yeah", "Mhmm", "I see"];
      const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
      
      socket.emit('ai-response', { text: ack });
      
      const doctor = DOCTOR_VOICES[conversation.doctorId];
      await streamTextToSpeech(socket, ack, doctor.voiceId);
    }
  });

  // Handle user ready to speak
  socket.on('user-listening', () => {
    console.log('👂 User is ready to speak');
    // Could be used for analytics or preparing the AI
  });

  // Handle partial transcript (live processing like ChatGPT)
  socket.on('partial-transcript', (data) => {
    console.log('📝 Partial transcript:', data.text);
    const conversation = activeConversations.get(socket.id);
    if (conversation && data.text.length > 10) {
      // For very responsive AI, we could start preparing response
      // while user is still speaking (advanced feature)
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
      // Reset interruption flag
      conversation.isInterrupted = false;
      
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
    
    // Prepare conversation context - keep it minimal for faster responses
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationState.conversationHistory.slice(-4), // Keep last 4 messages for context
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI API with optimized parameters for faster responses
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Fast model for real-time conversation
        messages: messages,
        temperature: 0.8, // Natural, empathetic responses
        max_tokens: 100, // SHORTER responses for faster, more conversational feel
        top_p: 0.95, // More focused responses
        presence_penalty: 0.3, // Encourage varied responses
        frequency_penalty: 0.2, // Reduce repetition strongly
        stream: false // Could enable streaming for even faster responses
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
    
    // Generate and stream audio in parallel
    await streamTextToSpeech(socket, aiResponse, doctor.voiceId);

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
    // Check if user interrupted before starting TTS
    const conversation = activeConversations.get(socket.id);
    if (conversation && conversation.isInterrupted) {
      console.log('🛑 TTS cancelled - user interrupted');
      return;
    }

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
        model_id: 'eleven_turbo_v2_5', // Fastest model for real-time
        voice_settings: {
          stability: 0.6, // Lower for faster generation
          similarity_boost: 0.7, // Reduced for speed
          style: 0.3, // Less processing for speed
          use_speaker_boost: false // Disable for faster processing
        },
        optimize_streaming_latency: 4, // Maximum optimization for speed
        output_format: 'mp3_22050_32' // Balanced quality and speed
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

    // Final check for interruption before sending audio
    if (conversation && conversation.isInterrupted) {
      console.log('🛑 TTS cancelled after generation - user interrupted');
      return;
    }

    socket.emit('audio-response', { 
      audio: Array.from(new Uint8Array(audioBuffer)),
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('❌ Error streaming TTS:', error);
  }
}

// Create therapeutic prompt based on doctor
function createTherapeuticPrompt(doctorId, doctor) {
  const basePrompt = `You are ${doctorId}, a compassionate and experienced AI therapist specializing in ${doctor.approach}. Your personality is ${doctor.personality}.

BE A REAL NATURAL THERAPIST:
- LISTEN FIRST: Actually understand what they said before responding
- RESPOND TO THEIR TOPIC: If they mention WiFi problems, talk about WiFi problems
- BE CONVERSATIONAL: Talk like a real person, not a therapy robot
- SHOW GENUINE INTEREST: Ask follow-up questions about what they shared
- AVOID THERAPY CLICHES: Don't say "I'm here to support you" every time
- BE RELATABLE: Share understanding of their situation
- MATCH THEIR ENERGY: Casual when they're casual, serious when needed
- ACTUALLY HELP: Give practical responses to practical problems

CONVERSATION STYLE FOR LIVE THERAPY - SPEAK NATURALLY LIKE A REAL PERSON:
- Respond naturally based on the situation - sometimes short, sometimes longer, just like real conversation
- Simple question → Simple answer: "How are you?" → "I'm doing well, thanks for asking"
- Deep topic → Thoughtful response: Share insights, examples, complete explanations as needed
- Light moment → Light response: Jokes, casual chat, friendly banter
- Serious moment → Deeper response: Empathy, reflection, therapeutic guidance
- Use therapeutic reflection: "It sounds like you're feeling..." or "I can hear the [emotion] in your voice..."
- Validate feelings: "That's completely understandable" or "It makes perfect sense that you'd feel that way"
- Gentle exploration: "Can you tell me a bit more about that?" or "What does that feel like for you?"
- Supportive presence: "I'm here with you" or "You're not alone in this"
- Match their energy and depth - if they're casual, be casual; if they're serious, be thoughtful
- ALWAYS complete your thoughts naturally - speak like a real human would

🚨🚨🚨 CRITICAL RULE - UNDERSTAND WHAT THEY'RE ACTUALLY SAYING 🚨🚨🚨

SPEECH RECOGNITION CONVERTS ENGLISH TO HINDI SCRIPT! 
When you see: "व्हाई यू आर नॉट टॉकिंग टू मी इन इंग्लिश"
They actually said: "Why you are not talking to me in English"

STEP 1: DECODE THE MESSAGE
- If you see Devanagari script but it sounds like English words, TREAT IT AS ENGLISH
- "हे डॉक्टर" = "Hey Doctor"
- "व्हाई यू आर" = "Why you are"
- "माय गर्लफ्रेंड" = "My girlfriend"

STEP 2: RESPOND IN PURE ENGLISH
- If they're speaking English (even if transcribed in Hindi script), respond in English
- Be natural and conversational
- Address their ACTUAL question/topic

STEP 3: STOP GENERIC RESPONSES
❌ NEVER say "I'm here to support you" unless they ask for support
❌ NEVER say "What's on your mind today?" unless it's relevant
❌ NEVER give therapy-speak when they want normal conversation

EXAMPLES:
User says: "हे डॉक्टर मे वाई-फाई इस नॉट वर्किंग" (Hey doctor my wifi is not working)
You respond: "Oh that's so frustrating! WiFi issues can really mess up your day. Are you trying to work from home or just browsing?"

User says: "व्हाई यू आर टॉकिंग इन हिंदी" (Why you are talking in Hindi)
You respond: "You're absolutely right, I should be speaking English! Sorry about that. What did you want to talk about?"

THERAPEUTIC TECHNIQUES TO USE:
- Reflection: Mirror back what you hear
- Validation: Normalize their feelings
- Gentle curiosity: Ask caring questions
- Presence: Show you're fully there with them
- Hope: Gently introduce possibility for growth

REAL EXAMPLES - RESPOND NATURALLY TO ACTUAL CONTENT:

TECH PROBLEMS (English in Hindi script):
User: "हे डॉक्टर मे वाई-फाई इस नॉट वर्किंग" (Hey doctor my WiFi is not working)
You: "Oh that's so frustrating! WiFi issues can really mess up your day. Are you trying to work from home or just browsing?"

LANGUAGE CONFUSION:
User: "व्हाई यू आर टॉकिंग इन हिंदी" (Why you are talking in Hindi)
You: "You're absolutely right, I should be speaking English! Sorry about that. What did you want to talk about?"

PERSONAL SHARING:
User: "हे आर्ची दो यू नो माय गर्लफ्रेंड'एस नेम वास आर्ची" (Hey Aarchi do you know my girlfriend's name was Aarchi)
You: "Oh wow, that's such a sweet coincidence! Your girlfriend's name was Aarchi too? That must bring up some interesting feelings talking to someone with the same name. Tell me about her."

CASUAL ENGLISH:
User: "I'm feeling anxious today"
You: "That sounds really tough. What's been making you feel anxious? Work stuff or something else?"

FRUSTRATION:
User: "Everything is going wrong today"
You: "Ugh, those days are the worst! What's been going wrong? Sometimes talking through it helps."

JOKES REQUEST:
User: "Tell me a joke"
You: "Sure! Here's one: Why don't scientists trust atoms? Because they make up everything! Did that at least get a little smile?"

Remember: You're creating a healing space through your words. Be the calm, understanding presence they need.`;

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
const PORT = process.env.PORT || 3002;

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