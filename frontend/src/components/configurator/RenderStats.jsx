import { useEffect, useState } from "react";

// Development only. The renderer cannot be observed from where this is built,
// so it reports on screen instead and a screenshot carries the answer.
export default function RenderStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const id = window.setInterval(() => {
      setStats(window.__render ? { ...window.__render } : null);
    }, 400);

    return () => window.clearInterval(id);
  }, []);

  if (!import.meta.env.DEV) return null;

  const distance = stats
    ? Math.hypot(...stats.camera).toFixed(1)
    : "—";

  return (
    <div className="pointer-events-none absolute top-5 left-5 z-30 border border-line bg-ink/85 px-3 py-2">
      <p className="label">Render</p>
      <p className="readout mt-1 text-[10px] leading-relaxed text-fog">
        {stats ? (
          <>
            frame loop: <span className="text-data">running</span>
            <br />
            triangles: {stats.triangles.toLocaleString()}
            <br />
            draw calls: {stats.calls}
            <br />
            programs: {stats.programs}
            <br />
            camera dist: {distance}
            <br />
            environment: {stats.hasEnvironment ? "yes" : "no"}
          </>
        ) : (
          <span className="text-signal">frame loop: NOT RUNNING</span>
        )}
      </p>
    </div>
  );
}
