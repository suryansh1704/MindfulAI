const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

// Middleware
app.use(express.json());

console.log('🚀 Starting MindfulAI Server');
console.log('OpenAI API Key:', OPENAI_API_KEY ? 'SET' : 'NOT SET');

// API Routes FIRST - before static files
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    openai: !!OPENAI_API_KEY,
    message: 'Node.js server is running!'
  });
});

app.get('/api/test', (req, res) => {
  console.log('Test endpoint requested');
  res.json({ 
    status: 'SUCCESS',
    message: 'API routes are working!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/chat', async (req, res) => {
  console.log('Chat request received:', req.body);
  
  try {
    const { message, language } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('Making OpenAI request...');
    
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
      console.error('OpenAI error:', error);
      return res.status(500).json({ error: 'OpenAI API error: ' + error.error?.message });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content?.trim();
    
    console.log('OpenAI response:', aiMessage);
    
    res.json({ response: aiMessage });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for SPA routing - only for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat: http://localhost:${PORT}/api/chat`);
}); 