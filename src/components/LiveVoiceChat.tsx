import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2, UserCircle, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io, { Socket } from 'socket.io-client';
import { LIVE_VOICE_URL } from '@/lib/config';

interface Message {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface LiveVoiceChatProps {
  selectedDoctor: string;
  onBack: () => void;
}

const LiveVoiceChat = ({ selectedDoctor, onBack }: LiveVoiceChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [textInput, setTextInput] = useState('');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState(''); // Real-time transcript display
  
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isLiveModeRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Initialize connection and speech recognition
  useEffect(() => {
    connectToServer();
    initializeSpeechRecognition();
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Don't disconnect socket immediately - let it stay connected
      // The socket will be cleaned up when component unmounts completely
    };
  }, [selectedDoctor]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };
  }, []);

  // Auto-restart listening when AI finishes speaking in live mode
  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (isLiveMode && !isSpeaking && !isListening && recognitionRef.current) {
      const timer = setTimeout(() => {
        if (isLiveModeRef.current && !isSpeakingRef.current && !isListening && recognitionRef.current) {
          console.log('🔄 Auto-restarting listening after AI finished speaking');
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('⚠️ Could not auto-restart recognition:', error);
          }
        }
      }, 1500); // Reduced wait time for faster conversation flow

      return () => clearTimeout(timer);
    }
  }, [isLiveMode, isSpeaking, isListening]);

  const connectToServer = () => {
    try {
      setConnectionStatus('Connecting to voice server...');
      
      const socket = io(LIVE_VOICE_URL, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Connected to live voice server');
        setIsConnected(true);
        setConnectionStatus('Connected');
        
        // Start conversation with selected doctor
        console.log('🚀 Starting conversation with:', selectedDoctor);
        socket.emit('start-live-conversation', {
          doctorId: selectedDoctor,
          userId: 'user-' + Date.now()
        });
        console.log('✅ start-live-conversation emitted');
      });

      socket.on('conversation-started', (data) => {
        console.log('🎤 Conversation started:', data);
        setConnectionStatus('Conversation active');
        toast({
          title: "Conversation Started",
          description: `Connected with ${selectedDoctor}. You can start speaking or typing.`,
        });
      });

      socket.on('ai-response', (data) => {
        console.log('🤖 AI Response:', data.text);
        setMessages(prev => [...prev, {
          type: 'ai',
          content: data.text,
          timestamp: new Date()
        }]);
      });

      socket.on('audio-response', (data) => {
        console.log('🔊 Received audio response');
        
        // Stop speech recognition while AI is speaking to prevent feedback loop
        if (recognitionRef.current && isListening) {
          console.log('🛑 Stopping recognition - AI is about to speak');
          recognitionRef.current.stop();
        }
        
        setIsSpeaking(true);
        playAudioFromArray(data.audio);
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        setConnectionStatus('Error: ' + error.message);
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive"
        });
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server. Reason:', reason);
        setIsConnected(false);
        setConnectionStatus('Disconnected');
      });

    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('Connection failed');
      toast({
        title: "Connection Failed",
        description: "Could not connect to voice server. Make sure it's running on port 3001.",
        variant: "destructive"
      });
    }
  };

  const playAudioFromArray = (audioArray: number[]) => {
    try {
      // Convert array back to Uint8Array and create blob
      const audioData = new Uint8Array(audioArray);
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play()
          .then(() => {
            console.log('✅ Audio playing');
          })
          .catch(error => {
            console.error('❌ Audio play error:', error);
            setIsSpeaking(false);
          });
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setIsSpeaking(false);
    }
  };

  const initializeSpeechRecognition = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition. Please use text input.",
        variant: "destructive"
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;  // Allow continuous listening
    recognition.interimResults = true;  // Get interim results to track speech
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setCurrentTranscript(''); // Clear previous transcript
    };

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      // Don't process if AI is currently speaking (prevents feedback loop)
      if (isSpeaking) {
        console.log('🚫 Ignoring speech while AI is speaking to prevent feedback');
        return;
      }

      let interimTranscript = '';
      let hasNewFinal = false;
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          hasNewFinal = true;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show real-time transcription to user
      const currentText = finalTranscript + interimTranscript;
      setCurrentTranscript(currentText);

      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // If we have final text or enough interim text, set a shorter timeout
      const isSubstantialText = currentText.trim().length > 3;
      const silenceDelay = hasNewFinal ? 800 : (isSubstantialText ? 1200 : 1800); // Faster response times

      // Set a timeout to process the final result after user stops speaking
      silenceTimeoutRef.current = setTimeout(() => {
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        console.log('🗣️ Processing speech:', fullTranscript);
        
        if (fullTranscript && fullTranscript.length > 2) { // Ensure meaningful input
          setIsProcessingVoice(true);
          setCurrentTranscript(''); // Clear real-time display
          
          // Check for end conversation commands
          const lowerTranscript = fullTranscript.toLowerCase();
          if (lowerTranscript.includes('end conversation') || 
              lowerTranscript.includes('stop conversation') || 
              lowerTranscript.includes('goodbye') ||
              lowerTranscript.includes('bye bye')) {
            console.log('🛑 End conversation command detected');
            setIsLiveMode(false);
            setIsListening(false);
            recognitionRef.current.stop();
            
            // Send goodbye message
            setMessages(prev => [...prev, {
              type: 'user',
              content: fullTranscript,
              timestamp: new Date()
            }]);
            
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('send-message', {
                message: fullTranscript
              });
            }
            setIsProcessingVoice(false);
            return;
          }

          // Add user message to chat immediately
          setMessages(prev => [...prev, {
            type: 'user',
            content: fullTranscript,
            timestamp: new Date()
          }]);

          // Send to server
          if (socketRef.current && socketRef.current.connected) {
            console.log('📤 SENDING TO SERVER:', fullTranscript);
            socketRef.current.emit('send-message', {
              message: fullTranscript
            });
          } else {
            console.log('❌ Socket not ready');
          }
          
          // Reset transcript
          finalTranscript = '';
          setIsProcessingVoice(false);
        }
        silenceTimeoutRef.current = null;
      }, silenceDelay);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentTranscript(''); // Clear transcript on error
      setIsProcessingVoice(false);
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      if (event.error === 'not-allowed') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice input.",
          variant: "destructive"
        });
      } else if (event.error !== 'no-speech') {
        toast({
          title: "Speech Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      setCurrentTranscript(''); // Clear transcript when ended
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // Only restart if in live mode, not speaking, and not manually stopped
      setTimeout(() => {
        if (isLiveModeRef.current && !isSpeakingRef.current && recognitionRef.current) {
          console.log('🔄 Auto-restarting speech recognition');
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.log('⚠️ Could not restart recognition:', error);
            // If we can't restart, might be browser limitation, try again later
            setTimeout(() => {
              if (isLiveModeRef.current && !isSpeakingRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (retryError) {
                  console.log('⚠️ Retry failed, speech recognition may have browser limits');
                }
              }
            }, 2000); // Reduced retry delay
          }
        }
      }, 1000); // Faster restart - reduced from 1500ms to 1000ms
    };

    recognitionRef.current = recognition;
  };

  const toggleVoiceInput = () => {
    console.log('🎤 Toggle voice input clicked');
    
    if (!recognitionRef.current) {
      console.log('❌ No recognition reference');
      toast({
        title: "Speech Recognition Unavailable",
        description: "Speech recognition is not available in your browser.",
        variant: "destructive"
      });
      return;
    }

    if (!socketRef.current || !socketRef.current.connected) {
      console.log('❌ Socket not connected');
      toast({
        title: "Not Connected",
        description: "Please wait for connection to be established.",
        variant: "destructive"
      });
      return;
    }

    if (isLiveMode) {
      // Stop live mode
      console.log('🛑 Stopping live conversation mode');
      setIsLiveMode(false);
      setIsListening(false);
      recognitionRef.current.stop();
      toast({
        title: "Live Mode Ended",
        description: "Voice conversation ended. Click to start again.",
      });
    } else {
      // Start live mode
      console.log('🎤 Starting live conversation mode');
      setIsLiveMode(true);
      try {
        recognitionRef.current.start();
        toast({
          title: "Live Mode Started",
          description: "Now listening continuously. Say 'end conversation' to stop.",
        });
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsLiveMode(false);
        toast({
          title: "Voice Input Error",
          description: "Failed to start voice input. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) {
      console.log('❌ No text input');
      return;
    }
    if (!socketRef.current) {
      console.log('❌ No socket reference');
      return;
    }
    if (!isConnected) {
      console.log('❌ Not connected');
      return;
    }

    console.log('📝 Sending text message:', textInput);

    // Add user message to chat
    setMessages(prev => [...prev, {
      type: 'user',
      content: textInput,
      timestamp: new Date()
    }]);

    // Send to server
    console.log('📤 Emitting text message to server');
    socketRef.current.emit('send-message', {
      message: textInput
    });
    console.log('✅ Text message emitted');

    setTextInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const getDoctorInfo = () => {
    if (selectedDoctor === 'Dr. Aarav') {
      return {
        name: 'Dr. Aarav',
        specialty: 'Cognitive Behavioral Therapy',
        emoji: '👨‍⚕️',
        description: 'Specializes in helping you understand and change thought patterns'
      };
    } else {
      return {
        name: 'Dr. Aarchi',
        specialty: 'Mindfulness & Emotional Wellness',
        emoji: '👩‍⚕️',
        description: 'Focuses on mindfulness techniques and emotional balance'
      };
    }
  };

  const doctor = getDoctorInfo();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="text-slate-600 hover:text-slate-800"
        >
          ← Back to Doctor Selection
        </Button>
        <div className="text-right">
          <div className="text-sm text-slate-500">Connection Status</div>
          <div className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {connectionStatus}
          </div>
        </div>
      </div>

      {/* Doctor Info */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{doctor.emoji}</div>
            <div>
              <CardTitle className="text-slate-800">{doctor.name}</CardTitle>
              <p className="text-slate-600 font-medium">{doctor.specialty}</p>
              <p className="text-sm text-slate-500 mt-1">{doctor.description}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="h-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-slate-700">Live Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <Bot className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <p>Your conversation will appear here...</p>
              <p className="text-sm mt-2">Start by typing a message or speaking!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.type === 'user' ? (
                      <UserCircle className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.type === 'user' ? 'You' : doctor.name}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {/* Real-time transcript display */}
          {currentTranscript && (
            <div className="flex justify-end animate-pulse">
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-100 border-2 border-blue-300 text-slate-700">
                <div className="flex items-center space-x-2 mb-1">
                  <UserCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">You (typing...)</span>
                  <Mic className="h-3 w-3 text-blue-500 animate-pulse" />
                </div>
                <p className="text-sm italic">{currentTranscript}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-3">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected}
            />
            <Button 
              onClick={sendTextMessage}
              disabled={!textInput.trim() || !isConnected}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6"
            >
              Send
            </Button>
          </div>
          
          <div className="flex items-center justify-center mt-4 space-x-4">
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={toggleVoiceInput}
                className={`rounded-full w-16 h-16 ${
                  isLiveMode 
                    ? isProcessingVoice
                      ? 'bg-yellow-50 border-yellow-300 animate-pulse'
                      : isListening 
                        ? 'bg-red-50 border-red-300 animate-pulse' 
                        : 'bg-green-50 border-green-300'
                    : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
                }`}
                disabled={!isConnected}
              >
                {isLiveMode ? (
                  isProcessingVoice ? (
                    <Loader2 className="h-6 w-6 text-yellow-500 animate-spin" />
                  ) : isListening ? (
                    <Mic className="h-6 w-6 text-red-500" />
                  ) : (
                    <Mic className="h-6 w-6 text-green-500" />
                  )
                ) : (
                  <Mic className="h-6 w-6 text-slate-600" />
                )}
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                {isLiveMode 
                  ? isProcessingVoice
                    ? 'Processing...'
                    : isListening 
                      ? 'Listening...' 
                      : 'Live Mode (Ready)'
                  : 'Start Live Chat'
                }
              </p>
              {isLiveMode && !isProcessingVoice && (
                <p className="text-xs text-orange-600 mt-1">
                  Say "end conversation" to stop
                </p>
              )}
            </div>
            
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-50 border-2 border-slate-300'}`}>
                {isSpeaking ? (
                  <Volume2 className="h-6 w-6 text-green-500" />
                ) : (
                  <VolumeX className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isSpeaking ? 'Speaking...' : 'Ready to speak'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => {
          console.log('🔇 AI finished speaking');
          setIsSpeaking(false);
        }}
        onError={() => {
          console.log('❌ Audio error - stopping speaking state');
          setIsSpeaking(false);
        }}
        hidden
      />
    </div>
  );
};

export default LiveVoiceChat; 