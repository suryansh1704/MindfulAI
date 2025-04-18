
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/use-auth';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, signIn, signOut } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="w-full bg-white/80 backdrop-blur-md py-4 px-6 shadow-sm fixed top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="text-xl font-semibold bg-gradient-to-r from-therapy-600 to-lavender-600 bg-clip-text text-transparent">MindfulAI</span>
        </Link>

        {isMobile ? (
          <>
            <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle menu">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            
            {isMenuOpen && (
              <div className="fixed inset-0 top-[72px] bg-white z-40 p-6 animate-fade-in">
                <nav className="flex flex-col gap-4">
                  <Link to="/" className="text-lg font-medium p-2 hover:bg-muted rounded-md" onClick={toggleMenu}>Home</Link>
                  <Link to="/chat" className="text-lg font-medium p-2 hover:bg-muted rounded-md" onClick={toggleMenu}>Therapy Chat</Link>
                  {user ? (
                    <Button onClick={() => { signOut(); toggleMenu(); }} variant="outline" className="w-full justify-start">Sign Out</Button>
                  ) : (
                    <Button onClick={() => { signIn(); toggleMenu(); }} className="w-full">Sign In</Button>
                  )}
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-6 mr-6">
              <Link to="/" className="font-medium text-foreground/80 hover:text-foreground transition-colors">Home</Link>
              <Link to="/chat" className="font-medium text-foreground/80 hover:text-foreground transition-colors">Therapy Chat</Link>
            </nav>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {(user.displayName || 'User').charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-medium hidden md:inline">{user.displayName}</span>
                </div>
                <Button onClick={signOut} variant="outline" size="sm">Sign Out</Button>
              </div>
            ) : (
              <Button onClick={signIn}>Sign In</Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
