import { MessageCircle, Megaphone, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const WHATSAPP_NUMBER = '27670405952';
export const ADVERT_DISPLAY_NUMBER = '+27 67 040 5952';
export const ADVERT_WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Nosty'$, I'd like to advertise my business on your app."
)}`;

/** Slideshow slide inviting businesses to book this advertising space. */
export function AdvertiseSlide({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 transition-all duration-[900ms] ease-out',
        active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />

      <div className="absolute bottom-3 right-3 z-30">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-black shadow">
          <Megaphone size={13} />
          Ad space available
        </span>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex flex-col px-4 pb-12 pt-12 md:px-8 md:pb-16 md:pt-20 transition-all duration-700 delay-150',
          active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        )}
      >
        <h2 className="font-display text-lg md:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight">
          Advertise your business on this space
        </h2>

        <p className="mt-2 text-white text-sm md:text-lg font-black">
          R250 per month
        </p>

        <p className="mt-1 mb-4 flex items-center gap-2 text-white/90 text-xs md:text-base font-semibold">
          <Phone size={16} className="shrink-0" />
          Call or WhatsApp {ADVERT_DISPLAY_NUMBER}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={ADVERT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-10 md:h-12 items-center gap-2 rounded-full bg-white px-5 md:px-7 text-sm md:text-base font-extrabold text-primary shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <MessageCircle size={18} />
            Click here to chat
          </a>
        </div>
      </div>
    </div>
  );
}
