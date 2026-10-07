import zeePhone from '@/assets/zee-large-phone.jpg';
import zeeWide from '@/assets/zee-slide-wide.jpg';

export const ZEE_DISPLAY_NUMBER = '081 791 5471';
export const ZEE_WHATSAPP_URL =
  "https://wa.me/27817915471?text=Hi%20Zee%20Hot%20Wings%2C%20I'd%20like%20to%20pre-order%201kg%20Hot%20Wings%20at%20R100.";

/**
 * Zee Hot Wings advert slide.
 *
 * The poster fills the slide above a reserved maroon strip at the bottom, so
 * the slideshow's progress dots never sit on the wording. The strip is the same
 * maroon as the poster, so the slide reads as one panel. The "Order Now" pill
 * floats over the top right, clear of the headline, and the whole slide is a
 * link so tapping anywhere opens WhatsApp with the pre-order message ready.
 */
export function ZeeHotWingsSlide({ active }: { active: boolean }) {
  return (
    <div
      className={
        'absolute inset-0 cursor-pointer transition-all duration-[900ms] ease-out ' +
        (active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105')
      }
      aria-hidden={!active}
    >
      <a
        href={ZEE_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Pre-order Zee Hot Wings on WhatsApp, ${ZEE_DISPLAY_NUMBER}`}
        className="relative block h-full w-full overflow-hidden rounded-2xl"
        style={{ backgroundColor: '#42060a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={zeePhone}
          alt={`Zee Hot Wings, R100 for 1kg, raw not cooked, pre-orders only. WhatsApp or call ${ZEE_DISPLAY_NUMBER}. Delivery in Jouberton, Klerksdorp and Alabama.`}
          loading="lazy"
          width={1536}
          height={768}
          draggable={false}
          className="absolute inset-x-0 top-0 bottom-7 h-auto w-full object-contain sm:hidden"
        />
        <img
          src={zeeWide}
          alt={`Zee Hot Wings, R100 for 1kg, raw not cooked, pre-orders only. WhatsApp or call ${ZEE_DISPLAY_NUMBER}. Delivery in Jouberton, Klerksdorp and Alabama.`}
          loading="lazy"
          width={2370}
          height={600}
          draggable={false}
          className="absolute inset-x-0 top-0 bottom-7 hidden h-auto w-full object-contain sm:block md:bottom-9"
        />

        <span className="absolute right-2 top-2 z-30 flex items-center gap-1.5 rounded-full bg-[#ffc107] px-3 py-1.5 text-[12px] font-black uppercase tracking-wide text-[#42060a] shadow-lg md:right-4 md:top-3 md:px-5 md:py-2 md:text-base">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 md:h-4 md:w-4"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5l.7 1.7c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z" />
          </svg>
          Order Now
        </span>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl border-[3px] border-black/90 md:border-4"
        />
      </a>
    </div>
  );
}
