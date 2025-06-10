import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Mic, ArrowLeft, User } from 'lucide-react';
import ChatInterface from './ChatInterface';
import LiveVoiceChat from './LiveVoiceChat';
import DoctorSelection from './DoctorSelection';

type TherapyMode = 'selection' | 'text' | 'voice' | 'doctor-selection';

const TherapyModeSelector = () => {
  const [mode, setMode] = useState<TherapyMode>('selection');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');

  const handleModeSelect = (selectedMode: TherapyMode) => {
    setMode(selectedMode);
  };

  const handleBackToSelection = () => {
    setMode('selection');
    setSelectedDoctor('');
  };

  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctor(doctorId);
    setMode('voice');
  };

  if (mode === 'text') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-slate-700">Text Session</h2>
            <p className="text-slate-500 text-sm">Take your time, express yourself freely</p>
          </div>
        </div>
        <ChatInterface />
      </div>
    );
  }

  if (mode === 'doctor-selection') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-slate-700">Choose Your Therapist</h2>
            <p className="text-slate-500 text-sm">Select who you'd like to speak with today</p>
          </div>
        </div>
        <DoctorSelection onSelectDoctor={handleDoctorSelect} />
      </div>
    );
  }

  if (mode === 'voice') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="space-y-2">
            <h2 className="text-2xl font-light text-slate-700">Voice Session</h2>
            <p className="text-slate-500 text-sm">
              {selectedDoctor ? `Speaking with ${selectedDoctor}` : 'Speak naturally, I\'m here to listen'}
            </p>
          </div>
        </div>
        <LiveVoiceChat selectedDoctor={selectedDoctor} onBack={() => setMode('doctor-selection')} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-light text-slate-800 mb-3">
          Welcome to Your Session
        </h1>
        <p className="text-slate-600 text-lg font-light leading-relaxed">
          This is a safe space for you. Choose how you'd like to begin.
        </p>
      </div>

      <div className="space-y-4">
        {/* Text Chat Option */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-slate-300"
          onClick={() => handleModeSelect('text')}
        >
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-slate-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-slate-800 mb-1">Write & Reflect</h3>
                <p className="text-slate-600 text-sm">
                  Express your thoughts through writing. Take your time to find the right words.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Chat Option */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-300 border border-slate-200 hover:border-slate-300"
          onClick={() => handleModeSelect('doctor-selection')}
        >
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Mic className="h-6 w-6 text-slate-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-slate-800 mb-1">Speak & Connect</h3>
                <p className="text-slate-600 text-sm">
                  Have a natural conversation. Sometimes it's easier to just talk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-xs">
          Your privacy is protected. All conversations are confidential.
        </p>
      </div>
    </div>
  );
};

export default TherapyModeSelector; 