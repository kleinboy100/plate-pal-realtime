import { cn } from '@/lib/utils';

interface WorldCupTransitionProps {
  active: boolean;
}

export function WorldCupTransition({ active }: WorldCupTransitionProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-green-700 via-emerald-600 to-yellow-500 transition-all duration-500',
        active ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105'
      )}
    >
      {/* Soft pitch stripes */}
      <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_36px,rgba(255,255,255,0.6)_36px,rgba(255,255,255,0.6)_72px)]" />

      {/* Bouncing, spinning soccer ball */}
      {active && (
        <div
          className="absolute h-10 w-10 md:h-14 md:w-14"
          style={{
            animation:
              'ballBounceX 2.4s ease-in-out infinite alternate, ballBounceY 0.9s ease-in-out infinite',
          }}
        >
          <span
            className="block h-full w-full text-3xl md:text-5xl leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            style={{ animation: 'ballSpin 0.9s linear infinite' }}
          >
            ⚽
          </span>
        </div>
      )}

      {/* Centered Bafana Bafana message */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <span className="text-4xl md:text-6xl">🇿🇦</span>
        <h2 className="mt-3 font-display text-2xl md:text-4xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] uppercase tracking-wide">
          Go Bafana Bafana!
        </h2>
        <p className="mt-1 text-sm md:text-lg font-bold text-white/90 uppercase tracking-[0.25em] drop-shadow">
          World Cup 2026 ⚽
        </p>
      </div>
    </div>
  );
}
