// Shared decorative background: a faint 5-pointed-star field over a dark
// navy gradient with a soft top glow — matches the reference site's app
// background. Rendered once in the shell as a fixed, full-viewport layer
// behind all content. Hidden in light mode via CSS (see .app-starfield).

// lucide "star" glyph path (24×24), reused as the star shape.
const STAR =
  'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';

// Scattered star placements within one 200×200 repeating tile.
const STARS = [
  { x: 12, y: 18, s: 0.55, o: 0.13 },
  { x: 150, y: 26, s: 0.42, o: 0.08 },
  { x: 92, y: 64, s: 0.6, o: 0.11 },
  { x: 178, y: 118, s: 0.5, o: 0.09 },
  { x: 40, y: 106, s: 0.72, o: 0.14 },
  { x: 118, y: 158, s: 0.45, o: 0.08 },
  { x: 24, y: 170, s: 0.5, o: 0.1 },
];

export function Starfield() {
  return (
    <div aria-hidden className="app-starfield pointer-events-none fixed inset-0 -z-10">
      <svg
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sf-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#08202b" />
            <stop offset="55%" stopColor="#061019" />
            <stop offset="100%" stopColor="#03090f" />
          </linearGradient>
          <radialGradient id="sf-glow" cx="50%" cy="0%" r="75%">
            <stop offset="0%" stopColor="#123243" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#123243" stopOpacity="0" />
          </radialGradient>
          <path id="sf-star" d={STAR} />
          <pattern id="sf-stars" width="200" height="200" patternUnits="userSpaceOnUse">
            {STARS.map((st, i) => (
              <use
                key={i}
                href="#sf-star"
                fill="#cbd5e1"
                opacity={st.o}
                transform={`translate(${st.x} ${st.y}) scale(${st.s})`}
              />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sf-base)" />
        <rect width="100%" height="100%" fill="url(#sf-glow)" />
        <rect width="100%" height="100%" fill="url(#sf-stars)" />
      </svg>
    </div>
  );
}
