import { Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import zeePoster from '@/assets/zee-hot-wings-poster.jpg';

const ZEE_WHATSAPP_NUMBER = '27817915471';
export const ZEE_DISPLAY_NUMBER = '081 791 5471';
export const ZEE_WHATSAPP_URL = `https://wa.me/${ZEE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Zee Hot Wings, I'd like to pre-order 1kg Hot Wings at R100."
)}`;

/** Slideshow slide advertising Zee Hot Wings — 1kg raw hot wings, pre-orders only. */
export function ZeeHotWingsSlide({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 transition-all duration-[900ms] ease-out',
        active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
      )}
    >
      {/* Backdrop — charcoal with a warm ember glow, matching the poster */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1010] via-[#2b1210] to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(225,29,46,0.35),transparent_62%)]" />

      {/* Poster artwork on the right — shown whole, never cropped */}
      <div className="absolute right-2 top-1/2 z-20 aspect-square h-[76%] -translate-y-1/2 overflow-hidden rounded-lg border-2 border-black shadow-2xl md:right-3 md:h-[88%]">
        <img
          src={zeePoster}
          alt="Zee Hot Wings poster: raw hot wings, 1kg for R100, pre-orders only"
          width={1024}
          height={1024}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Desktop: the price, large, in the space between the message and the poster */}
      <div className="pointer-events-none absolute left-[53%] top-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center md:flex">
        <span className="font-display text-7xl font-black leading-none text-[#F5B301] drop-shadow-[0_4px_14px_rgba(0,0,0,0.9)] lg:text-8xl">
          R100
        </span>
        <span className="mt-1.5 text-base font-extrabold uppercase tracking-[0.3em] text-white lg:text-lg">
          1kg
        </span>
        <span
          className="mt-3 h-1.5 w-32 rounded-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #E11D2E 0 12px, #111111 12px 15px, #F5B301 15px 27px, #111111 27px 30px, #1D4ED8 30px 42px, #111111 42px 45px, #FFFFFF 45px 57px, #111111 57px 60px)',
          }}
        />
      </div>

      {/* Message on the left — kept clear of the slide dots at the bottom */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 z-20 flex w-[58%] flex-col justify-center gap-1 px-3 pb-6 transition-all duration-700 delay-150 md:w-[68%] md:gap-2.5 md:px-6 md:pb-5',
          active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        )}
      >
        <h2 className="font-display text-base font-black uppercase leading-[1] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-2xl md:text-4xl">
          Zee Hot Wings
        </h2>

        <div className="flex items-baseline gap-1.5 md:hidden">
          <span className="font-display text-xl font-black leading-none text-[#F5B301] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] md:text-3xl">
            R100
          </span>
          <span className="text-[11px] font-extrabold uppercase text-white md:text-lg">1kg</span>
        </div>

        <span className="w-fit rounded-md border-2 border-black bg-white px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-black md:text-[11px]">
          Raw — not cooked
        </span>

        <p className="text-[8px] font-bold leading-snug text-white/90 md:text-sm">
          <span className="text-[#F5B301]">Pre-orders only</span>
          {' · '}Delivery: Jouberton, Klerksdorp &amp; Alabama
        </p>

        <a
          href={ZEE_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-primary shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 md:mt-1 md:gap-2 md:px-5 md:py-2.5 md:text-base"
        >
          <MessageCircle size={13} className="shrink-0 md:hidden" />
          <MessageCircle size={18} className="hidden shrink-0 md:block" />
          <span className="flex items-center gap-0.5 md:gap-1">
            <Phone size={10} className="md:hidden" />
            <Phone size={14} className="hidden md:block" />
            {ZEE_DISPLAY_NUMBER}
          </span>
        </a>
      </div>
    </div>
  );
}
