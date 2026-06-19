import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isPromoApplicable, isPromoItem, isPromoActive, getEffectivePrice, PROMO_LABEL, PROMO_DEADLINE_TEXT, isYouthDay } from '@/lib/promo';
import { YouthDaySlide } from '@/components/YouthDaySlide';
import { WorldCupTransition } from '@/components/WorldCupTransition';

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

  const promoActive = isPromoActive();

  // While the promo is active, only show promo meals in the slideshow.
  // Otherwise, top 5 Kota Menu items, sorted from most expensive to least expensive.
  const kotaItems = promoActive
    ? menuItems
        .filter(item => isPromoItem(item.id))
        .sort((a, b) => Number(b.price) - Number(a.price))
    : menuItems
        .filter(item => item.category?.toLowerCase() === 'kota menu')
        .sort((a, b) => Number(b.price) - Number(a.price))
        .slice(0, 5);

  const mealSlides = kotaItems.length > 0
    ? kotaItems.map(item => ({
        id: item.id,
        kind: 'meal' as const,
        image: item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
        title: item.name,
        subtitle: item.description || item.category,
        price: item.price
      }))
    : [
        { id: '', kind: 'meal' as const, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200', title: 'Delicious Meals', subtitle: 'Fresh & Fast', price: 0 }
      ];

  // Insert a World Cup transition slide before every meal.
  const mealsWithTransitions = mealSlides.flatMap((meal, i) => [
    { id: `wc-${i}`, kind: 'transition' as const, image: '', title: '', subtitle: '', price: 0 },
    meal,
  ]);

  // On Youth Day (16 June), feature the commemorative poster as the first slide.
  const slides = isYouthDay()
    ? [{ id: 'youth-day', kind: 'youthDay' as const, image: '', title: 'Youth Day', subtitle: '', price: 0 }, ...mealsWithTransitions]
    : mealsWithTransitions;

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    const tick = () => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length;
        // Transition slides flash by quickly; meals/posters linger.
        const delay = slides[next]?.kind === 'transition' ? 1300 : 5000;
        intervalRef.current = setTimeout(tick, delay);
        return next;
      });
    };
    const firstDelay = slides[currentSlide]?.kind === 'transition' ? 1300 : 5000;
    intervalRef.current = setTimeout(tick, firstDelay);
  }, [slides.length]);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
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
    <div className="absolute inset-0 overflow-hidden rounded-2xl mx-4 my-2 bg-secondary group">
      {/* Slides — full-bleed immersive image with cinematic overlay */}
      {slides.map((slide, index) => {
        const active = index === currentSlide;
        if (slide.kind === 'youthDay') {
          return <YouthDaySlide key={index} active={active} />;
        }
        if (slide.kind === 'transition') {
          return <WorldCupTransition key={index} active={active} />;
        }
        const promo = isPromoApplicable(slide.id);
        return (
          <div
            key={index}
            className={cn(
              "absolute inset-0 transition-all duration-[900ms] ease-out",
              active ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
            )}
          >
            {/* Background image with slow Ken Burns zoom */}
            <img
              src={slide.image}
              alt={slide.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out",
                active ? "scale-125" : "scale-100"
              )}
            />

            {/* Cinematic overlays: strong dark bottom for guaranteed text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/25 via-transparent to-transparent" />

            {/* Top tags */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-lg">
                <Flame size={13} className="animate-pulse" />
                {promo ? PROMO_LABEL : "Today's Pick"}
              </span>
              {promo && (
                <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] md:text-[11px] font-bold text-black shadow backdrop-blur-sm">
                  {PROMO_DEADLINE_TEXT}
                </span>
              )}
            </div>

            {/* Bottom content */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-20 flex flex-col px-4 pb-12 pt-12 md:px-8 md:pb-16 md:pt-20 transition-all duration-700 delay-150",
                active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              <span className="hidden md:inline-flex items-center gap-1.5 text-white/90 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2">
                <Star size={12} className="fill-primary text-primary" />
                Fresh &amp; Fast
              </span>

              <h2 className="font-display text-lg md:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight break-words line-clamp-2">
                {slide.title}
              </h2>

              <p className="text-white/85 text-xs md:text-base mt-2 mb-4 max-w-md break-words leading-relaxed line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                {promo ? 'Grab it now — 10% off for a limited time only!' : slide.subtitle}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                {slide.price > 0 && (
                  <div className="flex items-baseline gap-2 rounded-2xl bg-white px-3.5 py-2 shadow-xl">
                    {promo && (
                      <span className="text-muted-foreground line-through text-xs md:text-sm font-semibold">
                        R{slide.price.toFixed(2)}
                      </span>
                    )}
                    <span className="text-primary text-lg md:text-2xl font-black leading-none">
                      R{getEffectivePrice(slide.id, slide.price).toFixed(2)}
                    </span>
                  </div>
                )}

                {slide.id && (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOrderNow(slide);
                    }}
                    className="h-10 md:h-12 px-5 md:px-7 gap-2 rounded-full bg-primary text-primary-foreground text-sm md:text-base font-extrabold shadow-xl shadow-primary/30 transition-all duration-200 hover:scale-105 hover:shadow-primary/50 active:scale-95"
                  >
                    <ShoppingCart size={18} />
                    Order Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress dots */}
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
                ? "bg-primary w-7 h-2 shadow-md"
                : "bg-card/60 hover:bg-card/90 w-2 h-2"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
