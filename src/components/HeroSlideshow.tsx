import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
}

interface HeroSlideshowProps {
  menuItems: MenuItem[];
  restaurantId: string;
  restaurantName: string;
}

export function HeroSlideshow({ menuItems, restaurantId, restaurantName }: HeroSlideshowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addItem } = useCart();

  // Use menu items if available, otherwise use fallback
  const slides = menuItems.length > 0 
    ? menuItems.slice(0, 5).map(item => ({
        id: item.id,
        image: item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
        title: item.name,
        subtitle: item.description || item.category,
        price: item.price
      }))
    : [
        { id: '', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200', title: 'Delicious Meals', subtitle: 'Fresh & Fast', price: 0 }
      ];

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, [slides.length]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startAutoPlay]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    startAutoPlay();
  }, [startAutoPlay]);

  const handleOrderNow = (slide: typeof slides[0]) => {
    if (!slide.id) return;
    
    addItem({
      menuItemId: slide.id,
      name: slide.title,
      price: slide.price,
      quantity: 1,
      restaurantId,
      restaurantName,
    });
    toast.success(`${slide.title} added to cart!`);
  };

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl mx-4 my-2">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={cn(
            "absolute inset-0 transition-all duration-700 ease-out flex",
            index === currentSlide 
              ? "opacity-100 z-10" 
              : "opacity-0 z-0"
          )}
        >
          {/* Left side - Text content (50%) */}
          <div className="w-1/2 flex flex-col px-4 md:px-8 lg:px-12 z-10 bg-gradient-to-br from-secondary via-secondary to-secondary/90">
            {/* Fresh and Fast - Top Center */}
            <div className="flex justify-center pt-4 md:pt-6">
              <span className="text-secondary-foreground/80 text-xs md:text-sm font-semibold tracking-wider uppercase">
                Fresh & Fast
              </span>
            </div>
            
            {/* Main Content - Centered */}
            <div className="flex-1 flex items-center justify-center">
              <div className={cn(
                "max-w-md transition-all duration-700 delay-200",
                index === currentSlide 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-4"
              )}>
                <h2 className="font-display text-lg md:text-2xl lg:text-3xl font-bold text-secondary-foreground mb-2 line-clamp-2">
                  {slide.title}
                </h2>
                <p className="text-secondary-foreground/70 text-xs md:text-sm lg:text-base line-clamp-2 mb-3">
                  {slide.subtitle}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {slide.price > 0 && (
                    <span className="inline-block bg-secondary-foreground text-secondary px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      R{slide.price.toFixed(2)}
                    </span>
                  )}
                  {slide.id && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOrderNow(slide);
                      }}
                      className="h-8 md:h-9 text-xs md:text-sm px-4 gap-1.5 bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <ShoppingCart size={14} />
                      Order Now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Image (50%) */}
          <div className="w-1/2 relative overflow-hidden">
            <img
              src={slide.image}
              alt={slide.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-transform duration-[5000ms] ease-out",
                index === currentSlide ? "scale-110" : "scale-100"
              )}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-transparent" />
          </div>
        </div>
      ))}

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToSlide(index);
            }}
            className={cn(
              "rounded-full transition-all duration-300 cursor-pointer",
              index === currentSlide 
                ? "bg-primary w-6 h-2 shadow-md" 
                : "bg-card/50 hover:bg-card/80 w-2 h-2"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
