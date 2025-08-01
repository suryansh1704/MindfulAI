import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables with fallback (same as live voice server)
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

// Middleware - More permissive CORS for development
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('🚀 Starting MindfulAI Server');
console.log('OpenAI API Key:', OPENAI_API_KEY ? 'SET' : 'NOT SET');

// API Routes
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
  console.log('🔥 Chat request received from:', req.get('origin') || req.get('host'));
  console.log('📝 Request body:', req.body);
  console.log('🌐 Headers:', req.headers);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback for all other routes (Express 5.x compatible)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat: http://localhost:${PORT}/api/chat`);
}); 