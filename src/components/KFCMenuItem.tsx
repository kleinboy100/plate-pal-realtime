import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface KFCMenuItemProps {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  restaurantId: string;
  restaurantName: string;
}

export function KFCMenuItem({
  id,
  name,
  description,
  price,
  imageUrl,
  restaurantId,
  restaurantName
}: KFCMenuItemProps) {
  const { addItem, restaurantId: cartRestaurantId } = useCart();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    if (isAdding) return;
    
    setIsAdding(true);
    
    if (cartRestaurantId && cartRestaurantId !== restaurantId) {
      toast({
        title: "Cart cleared",
        description: "Items from the previous restaurant were removed.",
        variant: "default"
      });
    }
    
    addItem({
      menuItemId: id,
      name,
      price,
      quantity: 1,
      restaurantId,
      restaurantName
    });
    
    toast({
      title: "Added to cart",
      description: `${name} added to your cart.`
    });

    setTimeout(() => setIsAdding(false), 800);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

  return (
    <div className="group relative bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imageUrl || defaultImage}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Price Badge */}
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-bold text-xs shadow-lg backdrop-blur-sm">
          R{price.toFixed(0)}
        </div>
        
        {/* Add Button */}
        <Button
          onClick={handleAddToCart}
          size="icon"
          disabled={isAdding}
          className={cn(
            "absolute bottom-2 right-2 h-9 w-9 rounded-full shadow-lg transition-all duration-300",
            isAdding 
              ? "bg-success hover:bg-success scale-110" 
              : "bg-primary hover:bg-primary/90 group-hover:scale-110"
          )}
        >
          {isAdding ? (
            <Check size={18} className="text-success-foreground animate-scale-in" />
          ) : (
            <Plus size={18} className="text-primary-foreground" />
          )}
        </Button>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h4 className="font-display font-bold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-200">
          {name}
        </h4>
        {description && (
          <p className="text-muted-foreground text-xs line-clamp-1 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
