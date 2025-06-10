import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import io, { Socket } from 'socket.io-client';
import { API_SERVER_URL } from '@/lib/config';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  isAudio?: boolean;
}

interface VoiceChatProps {
  selectedDoctor?: string;
}

const VoiceChat = ({ selectedDoctor }: VoiceChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize audio context for visual feedback
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Setup audio analysis for visual feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start visual feedback
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak naturally. Click stop when you're done.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Please check your microphone permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Add user message placeholder
      const userMessage: Message = {
        id: Date.now().toString(),
        content: "🎤 Voice message",
        type: 'user',
        timestamp: new Date(),
        isAudio: true
      };
      setMessages(prev => [...prev, userMessage]);

      // Convert audio to text using OpenAI Whisper
      const transcription = await transcribeAudio(audioBlob);
      
      if (!transcription) {
        throw new Error("Couldn't understand the audio. Please try again.");
      }

      // Update user message with transcription
      setMessages(prev => prev.map(msg => 
        msg.id === userMessage.id 
          ? { ...msg, content: transcription }
          : msg
      ));

      // Get AI response
      const aiResponse = await generateAIResponse(transcription, 'English');
      
      // Add AI message
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        type: 'ai',
        timestamp: new Date(),
        isAudio: true
      };
      setMessages(prev => [...prev, aiMessage]);

      // Convert AI response to speech
      await speakText(aiResponse);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process audio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // Convert webm to wav for better compatibility
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await fetch(`${API_SERVER_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.text;
  };

  const speakText = async (text: string): Promise<void> => {
    try {
      setIsPlaying(true);
      
      const response = await fetch(`${API_SERVER_URL}/api/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Text-to-speech failed');
      }

      const responseData = await response.json();
      
      // Check if it's a fallback response (browser TTS)
      if (responseData.fallback) {
        console.log('Using browser TTS fallback');
        
        // Use browser's speech synthesis API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onend = () => {
            setIsPlaying(false);
          };
          
          utterance.onerror = () => {
            setIsPlaying(false);
            toast({
              title: "Speech failed",
              description: "Browser speech synthesis failed",
              variant: "destructive"
            });
          };
          
          speechSynthesis.speak(utterance);
        } else {
          throw new Error('Speech synthesis not supported');
        }
        return;
      }

      // Handle Eleven Labs audio response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error speaking text:', error);
      setIsPlaying(false);
      
      // Final fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsPlaying(false);
        speechSynthesis.speak(utterance);
      } else {
        toast({
          title: "Speech failed",
          description: "Couldn't convert text to speech",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio element for playback */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Messages Display */}
      <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-gradient-to-br from-mint-50 to-mint-100 rounded-lg">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-lavender-100 text-lavender-900 rounded-br-none'
                  : 'bg-therapy-100 text-therapy-900 rounded-bl-none'
              } shadow-sm animate-fade-in`}
            >
              <p className="text-sm">{message.content}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-60">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.isAudio && message.type === 'ai' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => speakText(message.content)}
                    disabled={isPlaying}
                    className="h-6 w-6 p-0"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-therapy-100 text-therapy-900 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing your message...</span>
            </div>
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <Card className="p-6">
        <CardContent className="space-y-4">
          <div className="text-center">
            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="mb-4">
                <div className="flex justify-center items-center space-x-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-mint-500 rounded-full transition-all duration-150 ${
                        audioLevel > i * 25 ? 'h-8' : 'h-2'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Listening...</p>
              </div>
            )}

            {/* Recording Button */}
            <div className="flex justify-center space-x-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={isProcessing || isPlaying}
                  className={`w-20 h-20 rounded-full ${
                    isProcessing || isPlaying 
                      ? 'bg-gray-400' 
                      : 'bg-mint-600 hover:bg-mint-700'
                  } text-white shadow-lg hover:shadow-xl transition-all duration-300`}
                >
                  <Mic className="h-8 w-8" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
                >
                  <Square className="h-8 w-8" />
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {isRecording && (
                <p className="text-sm font-medium text-mint-700">
                  🎤 Recording... Click stop when you're done speaking
                </p>
              )}
              {isProcessing && (
                <p className="text-sm font-medium text-therapy-700">
                  🤖 Processing your message and generating response...
                </p>
              )}
              {isPlaying && (
                <p className="text-sm font-medium text-lavender-700">
                  🔊 AI is speaking...
                </p>
              )}
              {!isRecording && !isProcessing && !isPlaying && (
                <p className="text-sm text-muted-foreground">
                  Click the microphone to start talking to your therapist
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gradient-to-r from-therapy-50 to-mint-50">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 text-therapy-700">How Voice Chat Works:</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>🎤 <strong>Record:</strong> Click the microphone and speak naturally</p>
            <p>🤖 <strong>AI Response:</strong> The therapist will respond with both text and voice</p>
            <p>🔊 <strong>Listen:</strong> The AI's response will be spoken automatically</p>
            <p>🌐 <strong>Language:</strong> You can speak in English, Hindi, or Hinglish</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceChat; 