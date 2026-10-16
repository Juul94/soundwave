export function LogoMark({ size = 32, animate = false }: { size?: number; animate?: boolean }) {
  const bars = [0.4, 0.7, 1, 0.6, 0.85, 0.5];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="sw-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#sw-g)" />
      {bars.map((h, i) => (
        <rect
          key={i}
          className={animate ? "sw-bar" : undefined}
          style={animate ? { animationDelay: `${i * 0.12}s` } : undefined}
          x={9 + i * 6}
          y={24 - h * 14}
          width="3.5"
          height={h * 28}
          rx="1.75"
          fill="#fff"
        />
      ))}
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
      <LogoMark size={size} />
      <span className="text-lg">Soundwave</span>
    </span>
  );
}
