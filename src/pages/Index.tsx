import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { KFCMenuItem } from '@/components/KFCMenuItem';
import { HeroSlideshow } from '@/components/HeroSlideshow';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantOperatingStatus } from '@/hooks/useRestaurantOperatingStatus';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { useIsRestaurantStaff } from '@/hooks/useIsRestaurantStaff';
import { cn } from '@/lib/utils';

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
  const { isOwner, loading: ownerLoading } = useIsRestaurantOwner();
  const { isStaff, loading: staffLoading } = useIsRestaurantStaff();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const { isOpen, loading: statusLoading } = useRestaurantOperatingStatus(NOSTY_RESTAURANT_ID);

  // Redirect restaurant owners and staff to dashboard
  useEffect(() => {
    if (!ownerLoading && !staffLoading && (isOwner || isStaff)) {
      navigate('/restaurant/dashboard', { replace: true });
    }
  }, [isOwner, isStaff, ownerLoading, staffLoading, navigate]);

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
      setMenuItems(menuRes.data || []);
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
      {/* Operating Status Banner */}
      {!statusLoading && (
        <div className={cn(
          "py-3 px-4 text-center text-sm font-medium transition-all duration-300 animate-slide-down",
          isOpen 
            ? 'bg-success/10 text-success border-b border-success/20' 
            : 'bg-muted text-muted-foreground border-b border-border'
        )}>
          <div className="container mx-auto flex items-center justify-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isOpen ? "bg-success" : "bg-muted-foreground"
            )} />
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{isOpen ? "We're open!" : "We're closed"}</span>
          </div>
        </div>
      )}

      {/* Hero Section with Slideshow */}
      <section className="relative h-[225px] md:h-[275px] overflow-hidden bg-[hsl(220,70%,40%)]">
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
