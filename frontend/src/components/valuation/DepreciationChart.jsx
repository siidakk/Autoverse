// What the same car is worth as it ages. A single number answers "what is it
// worth"; the curve answers "what happens if I wait", which is the question
// behind it.
export default function DepreciationChart({ curve }) {
  if (!curve?.length) return null;

  const width = 560;
  const height = 190;
  const padding = { top: 16, right: 16, bottom: 26, left: 16 };

  const values = curve.map((point) => point.value);
  const top = Math.max(...values);
  const bottom = Math.min(...values);
  const span = Math.max(top - bottom, 1);

  const x = (index) =>
    padding.left +
    (index / (curve.length - 1)) * (width - padding.left - padding.right);

  const y = (value) =>
    padding.top +
    (1 - (value - bottom) / span) * (height - padding.top - padding.bottom);

  const line = curve
    .map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`)
    .join(" ");

  const area =
    `${line} L${x(curve.length - 1)},${height - padding.bottom} ` +
    `L${x(0)},${height - padding.bottom} Z`;

  const now = curve.findIndex((point) => point.now);

  return (
    <figure>
      <figcaption className="label">Value as it ages</figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Estimated value against age in years"
      >
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#fade)" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="1.5"
        />

        {/* WHERE THIS CAR IS ON THAT CURVE */}
        {now >= 0 && (
          <>
            <line
              x1={x(now)}
              y1={padding.top}
              x2={x(now)}
              y2={height - padding.bottom}
              stroke="var(--color-line)"
              strokeDasharray="2 3"
            />
            <circle
              cx={x(now)}
              cy={y(curve[now].value)}
              r="3.5"
              fill="var(--color-signal)"
            />
          </>
        )}

        {/* AGE MARKERS */}
        {curve.map((point, index) =>
          point.age % 5 === 0 ? (
            <text
              key={point.age}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              fill="var(--color-fog)"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {point.age}y
            </text>
          ) : null
        )}
      </svg>
    </figure>
  );
}
