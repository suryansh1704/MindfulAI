// API Configuration for different environments
export const API_CONFIG = {
  // Voice server WebSocket URL
  VOICE_SERVER_URL: import.meta.env.PROD 
    ? import.meta.env.VITE_VOICE_SERVER_URL || 'wss://mindfulai-production.up.railway.app'
    : 'http://localhost:3001',
    
  // Main API server URL  
  API_SERVER_URL: import.meta.env.PROD
    ? import.meta.env.VITE_API_SERVER_URL || 'https://mindfulai-production.up.railway.app'
    : 'http://localhost:3000',
    
  // Live voice server URL
  LIVE_VOICE_URL: import.meta.env.PROD
    ? import.meta.env.VITE_LIVE_VOICE_URL || 'wss://mindfulai-production.up.railway.app'
    : 'http://localhost:3001'
};

// Export individual URLs for convenience
export const VOICE_SERVER_URL = API_CONFIG.VOICE_SERVER_URL;
export const API_SERVER_URL = API_CONFIG.API_SERVER_URL;
export const LIVE_VOICE_URL = API_CONFIG.LIVE_VOICE_URL; 