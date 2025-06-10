import { API_SERVER_URL } from '@/lib/config';

// OpenAI API integration via backend proxy (CORS-safe)
export const generateAIResponse = async (
  message: string,
  language: string
): Promise<string> => {
  try {
    console.log('Sending request to backend proxy...');
    console.log('Request data:', { message: message.substring(0, 50) + '...', language });
    console.log('Using API URL:', API_SERVER_URL);
    
    const response = await fetch(`${API_SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        language,
      }),
    });

    console.log('Backend proxy response status:', response.status);
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Backend proxy error:', data);
      
      // Provide specific error messages based on the error type
      if (response.status === 400 && data.error?.includes('Invalid API key format')) {
        throw new Error(`❌ OpenAI API Key Problem: ${data.error}\n\n🔧 How to fix:\n1. Go to https://platform.openai.com/api-keys\n2. Create a new API key (should start with 'sk-proj-')\n3. Add credits to your account\n4. Update your .env file with the new key`);
      } else if (response.status === 401) {
        throw new Error('❌ Invalid OpenAI API key. Please get a valid key from https://platform.openai.com/api-keys and add credits to your account.');
      } else if (response.status === 403) {
        throw new Error('❌ API quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/settings/organization/billing/overview');
      } else if (response.status === 429) {
        throw new Error('❌ Rate limit exceeded. Please try again in a moment.');
      }
      
      throw new Error(data.error || `Backend error: ${response.status}`);
    }

    if (!data.response) {
      console.error('Backend response missing content:', data);
      throw new Error('No response content from backend');
    }
    
    console.log('AI response received successfully');
    console.log('Response length:', data.response.length);
    return data.response;
    
  } catch (error: any) {
    console.error('Error in generateAIResponse:', error);
    
    // Preserve detailed error messages
    if (error.message.includes('❌')) {
      throw error; // Keep the detailed error message
    }
    
    // Provide helpful error messages for other issues
    let errorMessage = 'Failed to get response from AI';
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      errorMessage = `❌ Cannot connect to backend server at ${API_SERVER_URL}\n\n🔧 Check if server is running`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};
