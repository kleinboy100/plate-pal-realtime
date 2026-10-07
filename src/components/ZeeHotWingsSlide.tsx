import { cn } from '@/lib/utils';
import zeeWide from '@/assets/zee-hot-wings-wide-v2.jpg';
import zeeMobile from '@/assets/zee-hot-wings-mobile.jpg';

const ZEE_NUMBER = '27817915471';
export const ZEE_DISPLAY_NUMBER = '081 791 5471';
export const ZEE_WHATSAPP_URL = `https://wa.me/${ZEE_NUMBER}?text=${encodeURIComponent(
  "Hi Zee Hot Wings, I'd like to pre-order 1kg Hot Wings at R100."
)}`;

const ALT =
  "Zee Hot Wings — raw hot wings, 1kg for R100, pre-orders only. WhatsApp or call 081 791 5471. Delivery in Jouberton, Klerksdorp and Alabama.";

/** Full-bleed Zee Hot Wings advert — the poster fills the slide, tapping anywhere opens WhatsApp. */
export function ZeeHotWingsSlide({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 transition-all duration-[900ms] ease-out',
        active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
      )}
    >
      <a
        href={ZEE_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pre-order Zee Hot Wings on WhatsApp — 081 791 5471"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 block"
      >
        {/* Phone-sized banner on small screens, wide banner from md up — each fills the slide uncropped */}
        <img
          src={zeeMobile}
          alt={ALT}
          className={cn(
            'absolute inset-0 h-full w-full object-cover md:hidden transition-transform duration-[9000ms] ease-out',
            active ? 'scale-110' : 'scale-100'
          )}
        />
        <img
          src={zeeWide}
          alt={ALT}
          className={cn(
            'absolute inset-0 hidden h-full w-full object-cover md:block transition-transform duration-[9000ms] ease-out',
            active ? 'scale-110' : 'scale-100'
          )}
        />
      </a>

      {/* Frame to match the meal slides */}
      <div className="pointer-events-none absolute inset-0 z-20 border-[3px] md:border-4 border-black/90 rounded-2xl" />
    </div>
  );
}
