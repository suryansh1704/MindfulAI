import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TherapyModeSelector from '@/components/TherapyModeSelector';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { MessageSquareHeart } from 'lucide-react';

const Chat = () => {
  const { user, signIn, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-10 px-6">
        <div className="container mx-auto max-w-4xl">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-muted rounded-full mb-4"></div>
                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </div>
          ) : user ? (
            <TherapyModeSelector />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <MessageSquareHeart className="h-16 w-16 text-muted mb-6" />
              
              {/* Check if Firebase is configured */}
              {import.meta.env.VITE_FIREBASE_API_KEY ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">Sign in to start your therapy session</h2>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Connect with our AI therapist for supportive conversations in your preferred language.
                  </p>
                  <Button size="lg" onClick={signIn}>Sign In with Google</Button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-4">Welcome to MindfulAI</h2>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Connect with our AI therapist for supportive conversations. Authentication is currently disabled.
                  </p>
                  <TherapyModeSelector />
                </>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Chat;
