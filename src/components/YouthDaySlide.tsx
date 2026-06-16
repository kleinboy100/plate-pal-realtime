import { cn } from '@/lib/utils';
import youthDayPoster from '@/assets/youth-day-poster.jpg';

interface YouthDaySlideProps {
  active: boolean;
}

export function YouthDaySlide({ active }: YouthDaySlideProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 transition-all duration-[900ms] ease-out',
        active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
      )}
    >
      {/* Poster background with slow Ken Burns zoom */}
      <img
        src={youthDayPoster}
        alt="Nosty's celebrates South Africa Youth Day, 16 June"
        width={1024}
        height={1024}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out',
          active ? 'scale-110' : 'scale-100'
        )}
      />

      {/* Cinematic overlays for guaranteed text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-transparent" />

      {/* Top badge */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-black shadow-lg animate-fade-in">
          🇿🇦 Youth Day · 16 June
        </span>
        <span className="rounded-full bg-primary px-2.5 py-1 text-[9px] md:text-[11px] font-bold text-primary-foreground shadow">
          From Nosty's ❤️
        </span>
      </div>

      {/* Bottom message */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex flex-col px-4 pb-12 pt-12 md:px-8 md:pb-16 md:pt-20 transition-all duration-700 delay-150',
          active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-white/90 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2">
          We Remember · We Celebrate
        </span>

        <h2 className="font-display text-xl md:text-4xl lg:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] leading-[1.1] break-words">
          Honouring the Youth of 1976
        </h2>

        <p className="text-white/90 text-xs md:text-base mt-1.5 mb-3 md:mt-2 md:mb-4 max-w-xl break-words leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          On 16 June 1976, young South Africans stood up against injustice. Their
          courage gave us the freedom we live today — the right to learn in our
          own language, to vote, to dream and to build. We enjoy democracy,
          equal opportunity and a voice that matters because they refused to
          stay silent.
        </p>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-2xl bg-white/95 px-4 py-2 text-sm md:text-base font-extrabold text-black shadow-xl">
          Keep their dream alive — stay strong, stay free. ✊
        </span>
      </div>
    </div>
  );
}
