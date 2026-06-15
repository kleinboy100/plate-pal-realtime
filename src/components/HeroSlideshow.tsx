import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isPromoApplicable, getEffectivePrice, PROMO_LABEL, PROMO_DEADLINE_TEXT } from '@/lib/promo';

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

  // Top 5 Kota Menu items, sorted from most expensive to least expensive
  const kotaItems = menuItems
    .filter(item => item.category?.toLowerCase() === 'kota menu')
    .sort((a, b) => Number(b.price) - Number(a.price))
    .slice(0, 5);

  const slides = kotaItems.length > 0
    ? kotaItems.map(item => ({
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
      price: getEffectivePrice(slide.id, slide.price),
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
          <div className="w-1/2 flex flex-col z-10 bg-gradient-to-br from-secondary via-secondary to-secondary/90 overflow-y-auto">
            {/* Main Content - Centered, scrollable so nothing is clipped */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2.5 py-3 md:px-8 md:py-6 lg:px-12">
              <span className="text-secondary-foreground/80 text-[9px] md:text-sm font-semibold tracking-wider uppercase mb-1.5">
                Fresh & Fast
              </span>
              <div className={cn(
                "w-full max-w-md transition-all duration-700 delay-200",
                index === currentSlide 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-4"
              )}>
                {isPromoApplicable(slide.id) && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1">
                    <span className="inline-block bg-success text-success-foreground px-2 py-0.5 rounded-full text-[9px] md:text-xs font-extrabold shadow animate-pulse">
                      {PROMO_LABEL}
                    </span>
                    <span className="inline-block bg-secondary-foreground/10 text-secondary-foreground px-2 py-0.5 rounded-full text-[8px] md:text-[11px] font-semibold">
                      {PROMO_DEADLINE_TEXT}
                    </span>
                  </div>
                )}
                <h2 className="font-display text-sm md:text-2xl lg:text-3xl font-bold text-secondary-foreground mb-1.5 break-words leading-tight">
                  {slide.title}
                </h2>
                <p className="text-secondary-foreground/70 text-[10px] md:text-sm lg:text-base mb-2.5 break-words leading-snug">
                  {isPromoApplicable(slide.id) ? 'Save 10% on this meal — limited time!' : slide.subtitle}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {slide.price > 0 && (
                    <span className="inline-flex items-center gap-1.5 bg-secondary-foreground text-secondary px-2.5 py-1 rounded-full text-xs md:text-sm font-bold shadow-lg">
                      {isPromoApplicable(slide.id) && (
                        <span className="text-secondary/60 line-through text-[10px] md:text-xs font-semibold">
                          R{slide.price.toFixed(2)}
                        </span>
                      )}
                      R{getEffectivePrice(slide.id, slide.price).toFixed(2)}
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
                      className="h-6 md:h-7 text-[9px] md:text-[11px] px-2.5 gap-1 bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90 rounded-full shadow-lg transition-all duration-200 hover:scale-105 [&_svg]:size-3"
                    >
                      <ShoppingCart size={12} />
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
