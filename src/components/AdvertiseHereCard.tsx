import { MessageCircle, Phone } from 'lucide-react';

const WHATSAPP_NUMBER = '27670405952';
const DISPLAY_NUMBER = '+27 67 040 5952';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi Nosty'$, I'd like to advertise my business on your app."
)}`;

/**
 * Promo tile shown between meal cards inviting businesses to advertise.
 * Tapping anywhere opens WhatsApp with a pre-filled message.
 */
export function AdvertiseHereCard() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Advertise your business here - contact us on WhatsApp at ${DISPLAY_NUMBER}`}
    >
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Ad space
        </span>
        <p className="mt-3 font-display text-base font-extrabold leading-tight sm:text-lg">
          Advertise your business on this space
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold opacity-90">
          <Phone size={14} className="shrink-0" />
          Call or WhatsApp {DISPLAY_NUMBER}
        </p>
      </div>

      <span className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-foreground px-3 py-2 text-xs font-bold text-primary transition-colors group-hover:bg-primary-foreground/90">
        <MessageCircle size={14} />
        Click here to chat
      </span>
    </a>
  );
}
