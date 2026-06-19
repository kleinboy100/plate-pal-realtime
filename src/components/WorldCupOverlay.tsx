export function WorldCupOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Bouncing, spinning soccer ball */}
      <div
        className="absolute h-9 w-9 md:h-12 md:w-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
        style={{
          animation:
            'ballBounceX 3.2s ease-in-out infinite alternate, ballBounceY 1.1s ease-in-out infinite',
        }}
      >
        <span
          className="block h-full w-full text-2xl md:text-4xl leading-none"
          style={{ animation: 'ballSpin 1.1s linear infinite' }}
        >
          ⚽
        </span>
      </div>

      {/* Bafana Bafana support message */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-600 via-yellow-400 to-green-600 px-3 py-1 text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-black shadow-lg animate-[bounceSoft_1.4s_ease-in-out_infinite]">
          🇿🇦 Go Bafana Bafana! World Cup 2026 ⚽
        </span>
      </div>
    </div>
  );
}
