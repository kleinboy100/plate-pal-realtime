import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isPromoApplicable, isPromoItem, isPromoActive, getEffectivePrice, PROMO_LABEL, PROMO_DEADLINE_TEXT, isYouthDay } from '@/lib/promo';
import { YouthDaySlide } from '@/components/YouthDaySlide';
import { AdvertiseSlide } from '@/components/AdvertiseSlide';


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
        .slice(0, 10);

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

  // Insert an "advertise here" slide after every second meal slide.
  const withAds: Array<typeof mealSlides[0] | { id: string; kind: 'advert'; image: string; title: string; subtitle: string; price: number }> = [];
  mealSlides.forEach((slide, i) => {
    withAds.push(slide);
    if ((i + 1) % 2 === 0) {
      withAds.push({ id: `advert-${i}`, kind: 'advert' as const, image: '', title: 'Advertise here', subtitle: '', price: 0 });
    }
  });

  // On Youth Day (16 June), feature the commemorative poster as the first slide.
  const slides = isYouthDay()
    ? [{ id: 'youth-day', kind: 'youthDay' as const, image: '', title: 'Youth Day', subtitle: '', price: 0 }, ...withAds]
    : withAds;


  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    const tick = () => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length;
        intervalRef.current = setTimeout(tick, 9000);
        return next;
      });
    };
    intervalRef.current = setTimeout(tick, 9000);
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
        if (slide.kind === 'advert') {
          return <AdvertiseSlide key={index} active={active} />;
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
            {/* Background image — kept bright and clear */}
            <img
              src={slide.image}
              alt={slide.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-transform duration-[9000ms] ease-out",
                active ? "scale-110" : "scale-100"
              )}
            />

            {/* Only a soft bottom shade so the meal stays fully visible */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

            {/* Ndebele geometric frame */}
            <div className="pointer-events-none absolute inset-0 z-20 border-[3px] md:border-4 border-black/90 rounded-2xl" />
            <div
              className="pointer-events-none absolute top-0 inset-x-0 z-20 h-2 md:h-3"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #E11D2E 0 14px, #111111 14px 18px, #F5B301 18px 32px, #111111 32px 36px, #1D4ED8 36px 50px, #111111 50px 54px, #FFFFFF 54px 68px, #111111 68px 72px)',
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 z-20 h-2 md:h-3"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #1D4ED8 0 14px, #111111 14px 18px, #FFFFFF 18px 32px, #111111 32px 36px, #F5B301 36px 50px, #111111 50px 54px, #E11D2E 54px 68px, #111111 68px 72px)',
              }}
            />

            {/* Top tags */}
            <div className="absolute top-5 left-3 right-3 z-30 flex items-start justify-between gap-2">
              {promo ? (
                <span className="rounded-md bg-white px-2.5 py-1 text-[9px] md:text-[11px] font-bold text-black shadow border-2 border-black">
                  {PROMO_DEADLINE_TEXT}
                </span>
              ) : <span />}
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1 text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-lg">
                <Flame size={13} className="animate-pulse" />
                {promo ? PROMO_LABEL : "Today's Pick"}
              </span>
            </div>

            {/* Bottom content — panel with Ndebele accent */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-30 flex flex-col px-4 pb-10 pt-6 md:px-8 md:pb-14 md:pt-10 transition-all duration-700 delay-150",
                active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
            >
              <span className="hidden md:inline-flex items-center gap-1.5 text-[#F5B301] text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] mb-2">
                <Star size={12} className="fill-[#F5B301] text-[#F5B301]" />
                Fresh &amp; Fast
              </span>

              <h2 className="font-display text-lg md:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] leading-tight break-words line-clamp-2">
                {slide.title}
              </h2>

              <div className="mt-2 h-1 w-16 md:w-24" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #E11D2E 0 10px, #111111 10px 13px, #F5B301 13px 23px, #111111 23px 26px, #1D4ED8 26px 36px, #111111 36px 39px)' }} />

              {slide.subtitle && (
                <div className="mt-2 mb-3 max-w-md rounded-md border-2 border-black bg-black/80 px-3 py-2 backdrop-blur-sm">
                  <p className="text-white text-[13px] md:text-lg font-semibold break-words leading-snug line-clamp-4">
                    {slide.subtitle}
                  </p>
                </div>
              )}

              {promo && (
                <p className="text-[#F5B301] text-xs md:text-base font-bold mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                  Grab it now — 10% off for a limited time only!
                </p>
              )}


              <div className="flex items-center gap-3 flex-wrap">
                {slide.price > 0 && (
                  <div className="flex items-baseline gap-2 rounded-md border-2 border-black bg-white px-3.5 py-2 shadow-xl">
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
                    className="h-10 md:h-12 px-5 md:px-7 gap-2 rounded-md border-2 border-black bg-primary text-primary-foreground text-sm md:text-base font-extrabold shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
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
