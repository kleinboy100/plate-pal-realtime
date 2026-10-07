import { cn } from '@/lib/utils';
import zeePhone from '@/assets/zee-hot-wings-phone.jpg';
import zeeWide from '@/assets/zee-hot-wings-wide-v3.jpg';
import zeeFull from '@/assets/zee-hot-wings-full.jpg';

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
        style={{ backgroundColor: '#42060a' }}
      >
        {/* Phones */}
        <img
          src={zeePhone}
          alt={ALT}
          className="absolute inset-0 h-full w-full object-contain sm:hidden"
        />
        {/* Narrow windows */}
        <img
          src={zeeWide}
          alt={ALT}
          className="absolute inset-0 hidden h-full w-full object-contain sm:block lg:hidden"
        />
        {/* Screens */}
        <img
          src={zeeFull}
          alt={ALT}
          className="absolute inset-0 hidden h-full w-full object-contain lg:block"
        />
      </a>

      {/* Frame to match the meal slides */}
      <div className="pointer-events-none absolute inset-0 z-20 border-[3px] md:border-4 border-black/90 rounded-2xl" />
    </div>
  );
}
