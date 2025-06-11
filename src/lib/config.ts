// API Configuration for different environments
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
const RAILWAY_URL = 'https://mindfulai-production.up.railway.app';

export const API_CONFIG = {
  // Voice server WebSocket URL (now unified with main server)
  VOICE_SERVER_URL: isProduction 
    ? import.meta.env.VITE_VOICE_SERVER_URL || `wss://mindfulai-production.up.railway.app`
    : 'http://localhost:3000',
    
  // Main API server URL  
  API_SERVER_URL: isProduction
    ? import.meta.env.VITE_API_SERVER_URL || RAILWAY_URL
    : 'http://localhost:3000',
    
  // Live voice server URL (now unified with main server)
  LIVE_VOICE_URL: isProduction
    ? import.meta.env.VITE_LIVE_VOICE_URL || `wss://mindfulai-production.up.railway.app`
    : 'http://localhost:3000'
};

// Export individual URLs for convenience
export const VOICE_SERVER_URL = API_CONFIG.VOICE_SERVER_URL;
export const API_SERVER_URL = API_CONFIG.API_SERVER_URL;
export const LIVE_VOICE_URL = API_CONFIG.LIVE_VOICE_URL;

// Debug logging
console.log('🔧 API Configuration:', {
  isProduction,
  hostname: window.location.hostname,
  API_SERVER_URL,
  VOICE_SERVER_URL,
  LIVE_VOICE_URL
}); 