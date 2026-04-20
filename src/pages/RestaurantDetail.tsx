import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Star, MapPin, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KFCMenuItem } from '@/components/KFCMenuItem';
import { ReviewList } from '@/components/ReviewList';
import { supabase } from '@/integrations/supabase/client';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  cuisine_type: string;
  address: string;
  image_url: string | null;
  rating: number;
  average_prep_time: number;
  accepts_online_payment?: boolean;
}

interface MenuItemType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
}

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');

  useEffect(() => {
    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  const fetchRestaurantData = async () => {
    // Use public view to avoid exposing sensitive data (phone, owner_id, yoco keys)
    const [restaurantRes, menuRes] = await Promise.all([
      supabase.from('restaurants_public').select('*').eq('id', id).maybeSingle(),
      supabase.from('menu_items').select('*').eq('restaurant_id', id).eq('is_available', true).order('category', { ascending: true }).order('price', { ascending: true })
    ]);

    if (restaurantRes.error || !restaurantRes.data) {
      console.error('Error fetching restaurant:', restaurantRes.error);
      navigate('/');
      return;
    }

    setRestaurant(restaurantRes.data);
    setMenuItems(menuRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];
  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen pb-8">
      {/* Hero Image */}
      <div className="relative h-64 md:h-80">
        <img
          src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Button
          variant="ghost"
          className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </Button>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative">
        {/* Restaurant Info Card */}
        <div className="card-elevated p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-full font-medium">
                  {restaurant.cuisine_type}
                </span>
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                >
                  <Star size={16} className="text-accent fill-accent" />
                  <span className="font-medium">
                    {Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'New'}
                  </span>
                </button>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-muted-foreground mb-4">{restaurant.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{restaurant.average_prep_time} min delivery</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={16} />
                  <span>{restaurant.address}</span>
                </div>
                {/* Phone number is no longer exposed publicly for privacy */}
              </div>
            </div>
          </div>
        </div>

        {/* Menu/Reviews Tab Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <MessageSquare size={18} />
            Reviews
          </button>
        </div>

        {activeTab === 'menu' && (
          <>
            {/* Category Tabs */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items - KFC Style Grid */}
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                {selectedCategory === 'All' ? 'Menu' : selectedCategory}
              </h2>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No menu items available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.map(item => (
                    <KFCMenuItem
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      description={item.description}
                      price={Number(item.price)}
                      imageUrl={item.image_url}
                      category={item.category}
                      restaurantId={restaurant.id}
                      restaurantName={restaurant.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'reviews' && (
          <div className="card-elevated p-6">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              Customer Reviews
            </h2>
            <ReviewList restaurantId={restaurant.id} />
          </div>
        )}
      </div>
    </div>
  );
}
