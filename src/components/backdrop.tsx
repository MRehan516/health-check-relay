/**
 * Decorative animated background: three slow, layered motifs drawn only in
 * the primary/neutral palette (status colors stay reserved for status).
 *  1. drifting contour lines (the "terrain" of recovery)
 *  2. a heartbeat line that draws itself across the page
 *  3. small message bubbles rising, like check-in texts
 * Motion is disabled for users who prefer reduced motion.
 */
export function Backdrop({ intensity = "full" }: { intensity?: "full" | "soft" }) {
  const soft = intensity === "soft";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. contour lines */}
      <svg
        className="bd-drift absolute -left-1/4 -top-1/4 h-[150%] w-[150%] text-primary"
        viewBox="0 0 800 800"
        fill="none"
        style={{ opacity: soft ? 0.07 : 0.1 }}
      >
        {Array.from({ length: 11 }).map((_, i) => (
          <ellipse
            key={i}
            cx={520}
            cy={300}
            rx={60 + i * 42}
            ry={40 + i * 30}
            stroke="currentColor"
            strokeWidth={1}
            transform={`rotate(${-18 + i * 2} 520 300)`}
          />
        ))}
      </svg>

      {/* 2. heartbeat line */}
      <svg
        className="absolute inset-x-0 bottom-0 h-32 w-full text-primary"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
        fill="none"
        style={{ opacity: soft ? 0.18 : 0.28 }}
      >
        <path
          className="bd-pulse"
          pathLength={1}
          d="M0 90 H300 L330 90 L350 40 L372 140 L392 20 L414 110 L432 90 H760 L790 90 L808 55 L826 120 L846 90 H1200"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* 3. rising message bubbles */}
      {!soft &&
        BUBBLES.map((b, i) => (
          <span
            key={i}
            className="bd-rise absolute block rounded-[10px] border border-primary/25 bg-surface/60"
            style={{
              left: b.left,
              width: b.w,
              height: b.w * 0.42,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
    </div>
  );
}

const BUBBLES = [
  { left: "8%", w: 54, delay: 0, dur: 22 },
  { left: "22%", w: 38, delay: 7, dur: 26 },
  { left: "71%", w: 60, delay: 3, dur: 24 },
  { left: "86%", w: 42, delay: 11, dur: 28 },
  { left: "54%", w: 34, delay: 15, dur: 25 },
];
