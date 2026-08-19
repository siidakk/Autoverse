import { useProgress } from "@react-three/drei";

// The heavier models run to nineteen megabytes across three hundred meshes, and
// three.js still has to parse and upload all of it. Without this the viewport is
// simply black for several seconds and the car looks broken rather than busy.
export default function ViewportLoader({ car }) {
  const { active, progress } = useProgress();

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="w-56 text-center">
        <p className="label">Loading {car.name}</p>

        <div className="mt-3 h-[2px] w-full bg-line">
          <div
            className="h-full bg-signal transition-[width] duration-200"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>

        <p className="readout mt-2 text-[10px] text-fog">
          {Math.round(progress)}% · {car.weightMb} MB
        </p>
      </div>
    </div>
  );
}
