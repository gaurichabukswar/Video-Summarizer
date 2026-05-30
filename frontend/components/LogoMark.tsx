/**
 * The Video Summarizer brand mark.
 * A coral-gradient squircle with 7 white horizontal lines whose lengths
 * grow then shrink to trace a ▶ play-button silhouette.
 * Matches Logo.html from the design handoff exactly.
 */

interface Props {
  size?: number;
  className?: string;
}

// Line endpoints computed from the design's JS:
// rows = [26,34,42,50,58,66,74], left=30, halfH=28, halfW=46, cy=50
// x2 = 30 + 46 * (1 - |y - 50| / 28)
const LINES = [
  { y: 26, x2: 36.57 },
  { y: 34, x2: 49.71 },
  { y: 42, x2: 62.86 },
  { y: 50, x2: 76.00 },
  { y: 58, x2: 62.86 },
  { y: 66, x2: 49.71 },
  { y: 74, x2: 36.57 },
];

export function LogoMark({ size = 40, className }: Props) {
  const id = `vs-cg-${size}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Video Summarizer"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7d5e" />
          <stop offset="1" stopColor="#ec4631" />
        </linearGradient>
      </defs>
      {/* Squircle background */}
      <rect x="2" y="2" width="96" height="96" rx="27" fill={`url(#${id})`} />
      {/* Subtle inner border for depth */}
      <rect
        x="2.75" y="2.75" width="94.5" height="94.5" rx="26.25"
        fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.5"
      />
      {/* Play-button lines */}
      <g stroke="#ffffff" strokeWidth="7" strokeLinecap="round">
        {LINES.map(({ y, x2 }) => (
          <line key={y} x1="30" y1={y} x2={x2} y2={y} />
        ))}
      </g>
    </svg>
  );
}
