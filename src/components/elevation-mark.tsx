export function ElevationMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 280" className={className} aria-hidden>
      <rect x="0" y="0" width="640" height="280" fill="none" />
      <line x1="24" y1="248" x2="616" y2="248" stroke="currentColor" strokeWidth="1" />
      {/* podium */}
      <rect x="80" y="200" width="480" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {/* towers */}
      {[0, 1, 2].map((t) => {
        const x = 110 + t * 150;
        const h = t === 1 ? 168 : 132;
        const y = 200 - h;
        return (
          <g key={t}>
            <rect x={x} y={y} width="108" height={h} fill="none" stroke="currentColor" strokeWidth="1.2" />
            {Array.from({ length: Math.floor(h / 16) }).map((_, i) => (
              <g key={i}>
                <line x1={x} y1={y + 16 * (i + 1)} x2={x + 108} y2={y + 16 * (i + 1)} stroke="currentColor" opacity="0.35" />
                <rect x={x + 10} y={y + 4 + 16 * i} width="14" height="8" fill="currentColor" opacity="0.12" />
                <rect x={x + 32} y={y + 4 + 16 * i} width="14" height="8" fill="currentColor" opacity="0.12" />
                <rect x={x + 62} y={y + 4 + 16 * i} width="14" height="8" fill="currentColor" opacity="0.12" />
                <rect x={x + 84} y={y + 4 + 16 * i} width="14" height="8" fill="currentColor" opacity="0.12" />
              </g>
            ))}
          </g>
        );
      })}
      <text x="80" y="270" fontSize="10" fill="currentColor" opacity="0.55">
        ELEVATION · TYPICAL BLOCK
      </text>
    </svg>
  );
}
