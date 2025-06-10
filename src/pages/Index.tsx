
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Shield, Globe, Brain } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/use-auth';

const Index = () => {
  const { user, signIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-therapy-700 via-primary to-lavender-600 bg-clip-text text-transparent">
              Your AI Therapy Companion
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
              A safe space to talk, reflect, and grow with the help of AI-powered therapy, available in multiple languages.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/chat">
                  <Button size="lg" className="px-8">Start Therapy Session</Button>
                </Link>
              ) : (
                <Button size="lg" className="px-8" onClick={signIn}>Sign In to Begin</Button>
              )}
              <Button variant="outline" size="lg" asChild>
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section id="features" className="py-20 px-6 bg-muted/30">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">How MindfulAI Helps You</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-therapy-100 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-therapy-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
                <p className="text-muted-foreground">Access therapeutic conversations anytime, anywhere, without waiting for appointments.</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-mint-100 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-mint-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
                <p className="text-muted-foreground">Your conversations remain confidential with our secure and private platform.</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-lavender-100 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-lavender-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multilingual</h3>
                <p className="text-muted-foreground">Communicate in your preferred language with our AI therapist's multilingual capabilities.</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-therapy-100 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-therapy-700" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Evidence-Based</h3>
                <p className="text-muted-foreground">Our AI is trained on therapeutic approaches backed by psychological research.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">How It Works</h2>
            <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-16">
              Getting started with MindfulAI is simple and straightforward
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Sign In</h3>
                <p className="text-muted-foreground">Create an account using your Google account for a seamless experience.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Start a Session</h3>
                <p className="text-muted-foreground">Begin your therapy session and choose your preferred language.</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Share & Reflect</h3>
                <p className="text-muted-foreground">Express your thoughts and feelings, and receive supportive AI responses.</p>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              {user ? (
                <Link to="/chat">
                  <Button size="lg">Start Your Journey Now</Button>
                </Link>
              ) : (
                <Button size="lg" onClick={signIn}>Sign In to Begin</Button>
              )}
            </div>
          </div>
        </section>
        
        {/* Important Notice */}
        <section className="py-10 px-6 bg-muted/30">
          <div className="container mx-auto max-w-3xl">
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Important Notice</h3>
              <p className="text-amber-700">
                MindfulAI is designed to provide support and is not a replacement for professional mental health treatment.
                If you're experiencing a mental health crisis or emergency, please contact a mental health professional,
                visit your nearest emergency room, or call your local emergency number immediately.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
