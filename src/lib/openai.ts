// Gemini API integration
export const generateAIResponse = async (
  message: string, 
  language: string
): Promise<string> => {
  // Using the new API key provided by the user
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBTEFy106fZdVZ_FAMJneVOWKlS1YiERwk";
  
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing");
  }

  // Try with different models in order
  const models = [
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  let lastError = null;
  
  // Try each model in order until one works
  for (const model of models) {
    try {
      console.log(`Trying with model: ${model}`);
      
      const apiVersion = model.includes('1.5') ? 'v1beta' : 'v1';
      const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
      
      console.log("Sending request to Gemini API:", apiUrl);
      console.log("Language:", language);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a compassionate and professional AI therapist. Respond in ${language} language. Be empathetic, supportive, and helpful while maintaining professional boundaries. Keep responses concise (around 2-3 sentences) but meaningful. User message: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
          }
        })
      });

      const data = await response.json();
      
      // Log the response status
      console.log(`${model} API response status:`, response.status);
      console.log(`${model} API response data:`, JSON.stringify(data).substring(0, 200) + '...');
      
      if (!response.ok) {
        console.log(`Error with ${model}: Status ${response.status}`);
        lastError = new Error(`API error with status ${response.status}`);
        continue; // Try next model
      }
      
      if (data.error) {
        console.log(`Error with ${model}:`, data.error);
        lastError = new Error(data.error.message || `Error calling ${model} API`);
        continue; // Try next model
      }
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error(`Unexpected ${model} API response structure:`, data);
        lastError = new Error(`Unexpected ${model} API response structure`);
        continue; // Try next model
      }
      
      // If we got here, it worked!
      console.log(`Success with model: ${model}`);
      return data.candidates[0].content.parts[0].text.trim();
      
    } catch (error) {
      console.error(`Error with ${model}:`, error);
      lastError = error;
      // Continue to the next model
    }
  }
  
  // If we get here, all models failed
  console.error('All Gemini models failed');
  throw lastError || new Error('Failed to get response from any Gemini model');
};
