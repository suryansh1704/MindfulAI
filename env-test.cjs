// Environment variable test for Railway debugging
console.log('🔍 RAILWAY ENVIRONMENT TEST');
console.log('==========================');

const requiredVars = [
  'VITE_OPENAI_API_KEY',
  'ELEVEN_LABS_API_KEY', 
  'ASSEMBLYAI_API_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'PORT'
];

console.log('🔑 Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName.includes('API_KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...${value.substring(value.length-10)}`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n🌍 System Environment:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('Railway Port:', process.env.PORT || '3000 (default)');

// Test OpenAI API key format
const openaiKey = process.env.VITE_OPENAI_API_KEY;
if (openaiKey) {
  console.log('\n🔍 OpenAI Key Validation:');
  console.log('Length:', openaiKey.length);
  console.log('Starts with sk-proj-:', openaiKey.startsWith('sk-proj-'));
  console.log('Valid format:', openaiKey.startsWith('sk-proj-') && openaiKey.length > 50);
} 