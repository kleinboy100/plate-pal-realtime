import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, ClipboardList, Menu as MenuIcon, MessageSquare, Bell, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import nostyLogo from '@/assets/nosty-logo.jpg';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOwner } = useIsRestaurantOwner();
  const { isStaff } = useIsRestaurantStaff();
  const { isDriver } = useIsRestaurantDriver();

  const isStaffSide = isOwner || isStaff || isDriver;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const AppMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50" aria-label="Menu">
          <MenuIcon size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isStaffSide ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/notifications" className="flex items-center gap-2 cursor-pointer">
                <Bell size={16} /> Notification Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/earnings" className="flex items-center gap-2 cursor-pointer">
                <Wallet size={16} /> Earnings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User size={16} /> Profile
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/orders" className="flex items-center gap-2 cursor-pointer">
                <ClipboardList size={16} /> My Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User size={16} /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/orders" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare size={16} /> Chat
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
          <LogOut size={16} /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 shadow-sm bg-[hsl(var(--brand))]" style={{ backdropFilter: 'blur(16px)' }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src={nostyLogo} 
              alt="Nosty's Fresh Fast Food" 
              className="h-12 w-auto rounded-lg shadow-md transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base sm:text-xl md:text-3xl font-bold text-white drop-shadow-md tracking-tight" style={{ fontFamily: "'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', cursive" }}>
              It's All About Mongko Le Manyeke!
            </span>
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
              <AppMenu />
            ) : (
              <Link to="/auth">
                <Button className="btn-primary rounded-xl px-5">Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            {user ? (
              <>
                <Link to="/cart" className="relative">
                  <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Cart">
                    <ShoppingCart size={20} />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-md">
                        {itemCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <AppMenu />
              </>
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
