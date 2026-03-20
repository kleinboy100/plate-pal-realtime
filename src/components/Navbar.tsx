import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { cn } from '@/lib/utils';
import nostyLogo from '@/assets/nosty-logo.jpg';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useIsRestaurantOwner();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={nostyLogo} 
              alt="Nosty's Fresh Fast Food" 
              className="h-12 w-auto rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive('/') 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Menu
            </Link>
            {user && (
              <>
                <Link 
                  to="/orders" 
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                    isActive('/orders') 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <ClipboardList size={16} />
                  My Orders
                </Link>
                {isOwner && (
                  <Link 
                    to="/restaurant/dashboard" 
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                      isActive('/restaurant/dashboard') 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Store size={16} />
                    Dashboard
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50">
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md animate-scale-in">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <div className="flex items-center gap-1">
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50">
                    <User size={20} />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-xl hover:bg-muted/50">
                  <LogOut size={20} />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="btn-primary rounded-xl px-5">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile: Show profile/logout if logged in, sign in button if logged out */}
          <div className="md:hidden">
            {user ? (
              <div className="flex items-center gap-1">
                <Link to="/profile">
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <User size={20} />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-xl">
                  <LogOut size={20} />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="btn-primary rounded-xl px-4 text-sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
