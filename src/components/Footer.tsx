
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full py-6 px-6 bg-muted/50">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="text-lg font-semibold bg-gradient-to-r from-therapy-600 to-lavender-600 bg-clip-text text-transparent">MindfulAI</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/chat" className="hover:text-foreground transition-colors">Therapy Chat</Link>
            <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-destructive animate-breathing" />
            <span>for mental wellbeing</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} MindfulAI. This is an AI-powered service and not a substitute for professional mental health care.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
