import zeePhone from '@/assets/zee-large-phone.jpg';
import zeeWide from '@/assets/zee-slide-wide.jpg';
import zeeFull from '@/assets/zee-slide-full.jpg';

export const ZEE_DISPLAY_NUMBER = '081 791 5471';
export const ZEE_WHATSAPP_URL =
  "https://wa.me/27817915471?text=Hi%20Zee%20Hot%20Wings%2C%20I'd%20like%20to%20pre-order%201kg%20Hot%20Wings%20at%20R100.";

/**
 * Zee Hot Wings advert slide.
 *
 * The poster is the whole slide: the phone crop (2.0) fills the short phone
 * band, the wide crop fills tablet and desktop. Below it sits a plain
 * "Order Now on WhatsApp" strip — a real button, not baked into the artwork —
 * and the whole slide is a link so either target opens the chat.
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
        <div className="flex h-full w-full flex-col">
          <div className="relative min-h-0 flex-1">
            <img
              src={zeePhone}
              alt={`Zee Hot Wings, R100 for 1kg, raw not cooked, pre-orders only. WhatsApp or call ${ZEE_DISPLAY_NUMBER}. Delivery in Jouberton, Klerksdorp and Alabama.`}
              loading="lazy"
              width={1536}
              height={768}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain sm:hidden"
            />
            <img
              src={zeeWide}
              alt={`Zee Hot Wings, R100 for 1kg, raw not cooked, pre-orders only. WhatsApp or call ${ZEE_DISPLAY_NUMBER}. Delivery in Jouberton, Klerksdorp and Alabama.`}
              loading="lazy"
              width={2064}
              height={576}
              draggable={false}
              className="absolute inset-0 hidden h-full w-full object-contain sm:block lg:hidden"
            />
            <img
              src={zeeFull}
              alt={`Zee Hot Wings, R100 for 1kg, raw not cooked, pre-orders only. WhatsApp or call ${ZEE_DISPLAY_NUMBER}. Delivery in Jouberton, Klerksdorp and Alabama.`}
              loading="lazy"
              width={2623}
              height={608}
              draggable={false}
              className="absolute inset-0 hidden h-full w-full object-contain lg:block"
            />
          </div>

          <div className="flex h-10 shrink-0 items-center justify-center border-t border-white/10 bg-[#42060a] md:h-12">
            <span className="rounded-full bg-[#ffc107] px-6 py-1.5 text-[13px] font-black uppercase tracking-wider text-[#42060a] shadow-md md:px-8 md:py-2 md:text-base">
              Order Now on WhatsApp
            </span>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl border-[3px] border-black/90 md:border-4"
        />
      </a>
    </div>
  );
}
