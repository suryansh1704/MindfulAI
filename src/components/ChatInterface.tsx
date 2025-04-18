import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import LanguageSelector from './LanguageSelector';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { generateAIResponse } from '@/lib/openai';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
}

const presetPrompts = [
  "I'm feeling anxious today",
  "Help me manage my stress",
  "I need help with my negative thoughts",
  "How can I improve my sleep?",
  "I'm feeling down today"
];

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: "Hello! I'm your AI therapy assistant. How are you feeling today? Feel free to share what's on your mind, or select one of the suggested prompts below.",
      type: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [language, setLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (content: string, type: 'user' | 'ai') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    addMessage(inputValue, 'user');
    setInputValue('');
    setIsProcessing(true);

    try {
      // Call OpenAI API to get AI response
      const response = await generateAIResponse(inputValue, language);
      
      // Add AI response
      addMessage(response, 'ai');
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get response from the AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-foreground">Therapy Session</h2>
        <LanguageSelector selectedLanguage={language} onChange={setLanguage} />
      </div>
      
      <div className="chat-container therapy-gradient">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            type={message.type}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}
        {isProcessing && (
          <div className="flex justify-start w-full my-2">
            <div className="message-ai flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Prompt suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 my-4">
          {presetPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="bg-white/50 hover:bg-white"
              onClick={() => handlePromptClick(prompt)}
            >
              <Sparkles className="h-3 w-3 mr-2 text-primary" />
              {prompt}
            </Button>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="mt-4 flex gap-2">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="resize-none min-h-[60px]"
          disabled={isProcessing || !user}
        />
        <Button 
          onClick={handleSendMessage} 
          size="icon" 
          className="h-[60px] w-[60px]"
          disabled={!inputValue.trim() || isProcessing || !user}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      
      {!user && (
        <div className="mt-2 p-2 text-sm text-center bg-muted rounded">
          Please sign in to start a therapy session
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
