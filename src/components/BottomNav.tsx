import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const { isOwner } = useIsRestaurantOwner();
  const { isStaff } = useIsRestaurantStaff();

  // Hide bottom nav for restaurant owners and staff
  if (isOwner || isStaff) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { to: '/', icon: Home, label: 'Home', show: true },
    { to: '/orders', icon: ClipboardList, label: 'Orders', show: !!user },
    { to: '/cart', icon: ShoppingCart, label: 'Cart', show: true, badge: itemCount },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50 md:hidden safe-area-inset-bottom">
      <div className="flex items-center justify-around h-[52px] px-2">
        {visibleItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 relative transition-all duration-200",
              isActive(item.to) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "relative p-1 rounded-lg transition-all duration-200",
              isActive(item.to) && "bg-primary/10"
            )}>
              <item.icon size={16} className={cn(
                "transition-transform duration-200",
                isActive(item.to) && "scale-110"
              )} />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 w-3.5 flex items-center justify-center font-bold shadow-md">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[9px] mt-0.5 font-medium transition-all duration-200",
              isActive(item.to) && "font-semibold"
            )}>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
