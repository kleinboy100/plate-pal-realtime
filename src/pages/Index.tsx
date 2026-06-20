import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { KFCMenuItem } from '@/components/KFCMenuItem';
import { HeroSlideshow } from '@/components/HeroSlideshow';
import { PrivacyPolicyDialog } from '@/components/PrivacyPolicyDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurantOperatingStatus } from '@/hooks/useRestaurantOperatingStatus';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';
import { useIsRestaurantDriver } from '@/hooks/useIsRestaurantDriver';
import { cn } from '@/lib/utils';
import proudlySaLogo from '@/assets/proudly-sa.png';
import africanPattern from '@/assets/african-pattern.jpg';

// Nosty's restaurant ID
const NOSTY_RESTAURANT_ID = '7f5250bb-263f-4bca-a4af-d325f761542b';

interface MenuItemType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
}

interface Restaurant {
  id: string;
  name: string;
}

const mealCategories = ['All', 'Mains', 'Sides', 'Drinks', 'Desserts', 'Combos', 'Specials'];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsRestaurantOwner();
  const { isStaff, loading: staffLoading } = useIsRestaurantStaff();
  const { isDriver, loading: driverLoading } = useIsRestaurantDriver();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const { isOpen, loading: statusLoading } = useRestaurantOperatingStatus(NOSTY_RESTAURANT_ID);

  // Show privacy policy on first signup / login
  useEffect(() => {
    if (user) {
      const key = `privacy_accepted_${user.id}`;
      if (!localStorage.getItem(key)) {
        setShowPrivacy(true);
      }
    }
  }, [user]);

  const handleAcceptPrivacy = () => {
    if (user) localStorage.setItem(`privacy_accepted_${user.id}`, new Date().toISOString());
    setShowPrivacy(false);
  };

  const handleDeclinePrivacy = async () => {
    setShowPrivacy(false);
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Redirect restaurant owners, staff, and drivers to their dashboards
  useEffect(() => {
    if (ownerLoading || staffLoading || driverLoading) return;
    if (isDriver) navigate('/driver/dashboard', { replace: true });
    else if (isOwner || isStaff) navigate('/restaurant/dashboard', { replace: true });
  }, [isOwner, isStaff, isDriver, ownerLoading, staffLoading, driverLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [restaurantRes, menuRes] = await Promise.all([
      supabase.from('restaurants_public').select('id, name').eq('id', NOSTY_RESTAURANT_ID).maybeSingle(),
      supabase.from('menu_items').select('*').eq('restaurant_id', NOSTY_RESTAURANT_ID).eq('is_available', true).order('category', { ascending: true }).order('price', { ascending: true })
    ]);

    if (restaurantRes.error) {
      console.error('Error fetching restaurant:', restaurantRes.error);
    } else {
      setRestaurant(restaurantRes.data);
    }

    if (menuRes.error) {
      console.error('Error fetching menu:', menuRes.error);
    } else {
      const categoryOrder = ['Kota Menu', 'Dagwoods', 'Loafs', 'Chips', 'Tops', 'Combo Menu'];
      const getOrder = (cat: string) => {
        const idx = categoryOrder.findIndex(c => c.toLowerCase() === cat.toLowerCase());
        return idx === -1 ? 999 : idx;
      };
      const sorted = [...(menuRes.data || [])].sort((a, b) => {
        const diff = getOrder(a.category) - getOrder(b.category);
        if (diff !== 0) return diff;
        return Number(a.price) - Number(b.price);
      });
      setMenuItems(sorted);
    }
    setLoading(false);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get available categories from menu items
  const availableCategories = ['All', ...new Set(menuItems.map(item => item.category))];

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fcd03c_0%,#e73211_55%,#1e3a8a_100%)]">
      {/* Privacy Policy Popup */}
      <PrivacyPolicyDialog
        open={showPrivacy}
        onAccept={handleAcceptPrivacy}
        onDecline={handleDeclinePrivacy}
      />

      {/* Operating Status Banner */}
      {!statusLoading && (
        <div
          className="relative py-3 px-4 text-sm font-medium transition-all duration-300 animate-slide-down border-b border-black/20"
          style={{
            backgroundImage: `url(${africanPattern})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '320px auto',
          }}
        >
          {/* Readability overlay */}
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            isOpen ? "bg-black/30" : "bg-black/55"
          )} />
          <div className="container mx-auto flex items-center justify-between gap-2 relative">
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isOpen ? "bg-success" : "bg-muted-foreground"
              )} />
              <Clock className="w-4 h-4" />
              <span className="font-semibold">
                {/* Temporary: show closed today message on May 31, 2026 */}
                {new Date().toDateString() === 'Sun May 31 2026'
                  ? "The store will be closed today"
                  : isOpen ? "We're open!" : "Closed due to power outage. We'll be back tomorrow!"
                }
              </span>
            </div>
            <div className="flex-1 flex justify-end">
              <img
                src={proudlySaLogo}
                alt="Proudly South African"
                width={40}
                height={40}
                loading="lazy"
                className="h-9 w-9 md:h-10 md:w-10 object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Slideshow */}
      <section className="relative h-[200px] md:h-[260px] overflow-hidden bg-[hsl(220,70%,40%)]">
        <HeroSlideshow 
          menuItems={menuItems} 
          restaurantId={restaurant?.id || NOSTY_RESTAURANT_ID}
          restaurantName={restaurant?.name || "Nosty's Fresh Fast Food"}
        />
      </section>

       {/* Search Bar - Below Slideshow */}
       <section className="py-3 px-4">
         <div className="container mx-auto">
           <div className="relative max-w-md mx-auto">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
             <Input
               placeholder="Search meals..."
               className="pl-11 h-12 bg-card border-0 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 shadow-sm transition-all duration-200"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
         </div>
       </section>

      {/* Category Filters - Sticky */}
      <section className="py-3 border-b border-border/50 sticky top-16 bg-[#fcd03c]/95 backdrop-blur-lg z-40 shadow-sm">
        <div className="container mx-auto px-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {availableCategories.map((category, index) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "chip",
                  selectedCategory === category ? "chip-active" : "chip-inactive",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Menu Items Section */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 animate-fade-in">
            {selectedCategory === 'All' ? 'Menu' : selectedCategory}
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-card rounded-2xl overflow-hidden shadow-sm animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="aspect-square skeleton" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 skeleton rounded-lg w-3/4" />
                    <div className="h-3 skeleton rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold text-lg">No meals found</p>
              <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-fade-in opacity-0"
                  style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
                >
                  <KFCMenuItem
                    name={item.name}
                    description={item.description}
                    price={Number(item.price)}
                    imageUrl={item.image_url}
                    category={item.category}
                    restaurantId={restaurant?.id || NOSTY_RESTAURANT_ID}
                    restaurantName={restaurant?.name || "Nosty's Fresh Fast Food"}
                    id={item.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
