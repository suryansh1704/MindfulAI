const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables - MUST be set in production
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Simple CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));

console.log('🚀 Starting Simple API Server');
console.log('OpenAI API Key:', OPENAI_API_KEY ? 'SET' : 'NOT SET');

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    openai: !!OPENAI_API_KEY,
    message: 'Simple API server is running!'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  console.log('🔥 Chat request received');
  console.log('📝 Request body:', req.body);
  
  try {
    const { message, language } = req.body;
    
    if (!message) {
      console.log('❌ No message provided');
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!OPENAI_API_KEY) {
      console.log('❌ No OpenAI API key');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('🤖 Making OpenAI request for message:', message.substring(0, 50) + '...');
    
    // Import fetch for Node.js
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'You are a compassionate AI therapist. Provide supportive, empathetic responses in 1-2 sentences.' 
          },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI error:', error);
      return res.status(500).json({ error: 'OpenAI API error: ' + error.error?.message });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content?.trim();
    
    console.log('✅ OpenAI response:', aiMessage);
    
    res.json({ response: aiMessage });
    
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Simple MindfulAI API Server is running!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Simple API server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat: http://localhost:${PORT}/api/chat`);
}); 