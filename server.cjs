const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Setup multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Check and log OpenAI API Key configuration
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

// Add Eleven Labs API key (you'll need to get this)
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

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
    message: 'Server is running',
    openaiConfigured: !!OPENAI_API_KEY,
    apiKeyLength: OPENAI_API_KEY ? OPENAI_API_KEY.length : 0,
    apiKeyValid: keyValidation.valid,
    apiKeyError: keyValidation.error || null,
    elevenLabsConfigured: !!ELEVEN_LABS_API_KEY && ELEVEN_LABS_API_KEY !== 'your_eleven_labs_api_key_here'
  });
});

// OpenAI Whisper Speech-to-Text endpoint
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    console.log('📝 Received transcription request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!OPENAI_API_KEY || !keyValidation.valid) {
      return res.status(400).json({ 
        error: `Invalid OpenAI API key: ${keyValidation.error}. Please get a valid API key from https://platform.openai.com/api-keys`
      });
    }

    console.log('🎵 Processing audio file:', req.file.size, 'bytes');

    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', audioBlob, req.file.originalname || 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', req.body.language || 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    console.log('🤖 OpenAI Whisper response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI Whisper error:', errorData);
      return res.status(response.status).json({ error: errorData.error?.message || 'Transcription failed' });
    }

    const data = await response.json();
    console.log('✅ Transcription successful:', data.text.substring(0, 100) + '...');
    
    res.json({ text: data.text });

  } catch (error) {
    console.error('💥 Transcription error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Eleven Labs Text-to-Speech endpoint
app.post('/api/speak', async (req, res) => {
  try {
    console.log('🔊 Received TTS request');
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    if (!ELEVEN_LABS_API_KEY || ELEVEN_LABS_API_KEY === 'your_eleven_labs_api_key_here') {
      console.log('⚠️ Eleven Labs not configured, using browser TTS fallback');
      
      // Fallback: Return instructions for browser TTS
      return res.json({ 
        fallback: true, 
        text: text,
        message: 'Using browser speech synthesis' 
      });
    }

    console.log('🎙️ Calling Eleven Labs API...');

    // Default voice ID (you can change this to any Eleven Labs voice)
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
    
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

    console.log('🔊 Eleven Labs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Eleven Labs error:', errorText);
      
      // Fallback to browser TTS
      return res.json({ 
        fallback: true, 
        text: text,
        message: 'Eleven Labs failed, using browser speech synthesis' 
      });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ TTS successful, audio size:', audioBuffer.byteLength, 'bytes');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('💥 TTS error:', error);
    
    // Fallback to browser TTS
    res.json({ 
      fallback: true, 
      text: req.body.text,
      message: 'Server error, using browser speech synthesis' 
    });
  }
});

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

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 =====================================');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`🎤 Transcribe API: http://localhost:${PORT}/api/transcribe`);
  console.log(`🔊 Speak API: http://localhost:${PORT}/api/speak`);
  console.log(`🔑 OpenAI API Key configured: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
  if (OPENAI_API_KEY) {
    console.log(`🔐 API Key preview: ${OPENAI_API_KEY.substring(0, 20)}...`);
    console.log(`✅ Key validation: ${keyValidation.valid ? 'VALID' : 'INVALID - ' + keyValidation.error}`);
  }
  console.log(`🎙️ Eleven Labs configured: ${ELEVEN_LABS_API_KEY && ELEVEN_LABS_API_KEY !== 'your_eleven_labs_api_key_here' ? 'Yes' : 'No'}`);
  console.log('🚀 =====================================');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is busy. Try a different port or kill the process using this port.`);
  } else {
    console.error('❌ Server error:', err);
  }
}); 