import { useMemo } from "react";
import { sampleSurfaceHeight } from "../../utils/carGeometry";
import {
  buildSweptGeometry,
  ducktailProfile,
  wingProfile
} from "../../utils/sweep";

const STATION_COUNT = 15;

const CARBON = {
  color: "#15171b",
  metalness: 0.55,
  roughness: 0.32
};

// The mounting height is read off the bodywork at every station, so the part
// follows the curve of the boot lid instead of floating at a fixed offset.
function measureDeck(scene, car, spanWidth, chordOffset) {
  const { box, lengthAxis, rearSign, length } = car;
  const rearEnd = rearSign > 0 ? box.max[lengthAxis] : box.min[lengthAxis];

  const sampled = [];

  for (let i = 0; i < STATION_COUNT; i++) {
    const t = i / (STATION_COUNT - 1);
    const lateral = car.midWidth + (t - 0.5) * spanWidth;

    // Walk forward from the tail until the ray lands on a panel, which keeps
    // the ends of the spoiler on the car where the rear tapers away.
    let height = null;
    for (const step of [0, 0.03, 0.06, 0.1, 0.15]) {
      const along = rearEnd + rearSign * (chordOffset - length * step);
      height = sampleSurfaceHeight(scene, car, along, lateral);
      if (height !== null) break;
    }

    sampled.push({ lateral, height });
  }

  if (sampled.filter((point) => point.height !== null).length < 3) return null;

  // Any station that missed borrows the height of the closest one that hit.
  const points = sampled.map((point, index) => {
    if (point.height !== null) return point;

    let nearest = null;
    let nearestGap = Infinity;

    sampled.forEach((other, otherIndex) => {
      if (other.height === null) return;
      const gap = Math.abs(otherIndex - index);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = other;
      }
    });

    return { lateral: point.lateral, height: nearest.height };
  });

  return { rearEnd, points };
}

export default function Spoiler({ type, car, scene, track }) {

  const enabled = Boolean(car && scene) && type !== "stock";

  // Measuring across the wheels beats the bounding box, which some models
  // inflate with open doors.
  const spanWidth = track ? track * 1.02 : car ? car.width * 0.78 : 0;
  const chordOffset = car ? -car.length * 0.055 : 0;

  const built = useMemo(() => {
    if (!enabled) return null;

    const deck = measureDeck(scene, car, spanWidth, chordOffset);
    if (!deck) return null;

    const { lengthAxis, widthAxis, rearSign, length } = car;
    const { rearEnd, points } = deck;

    const isWing = type === "racing";

    // Sizes come off the car's length; its height is unreliable on models whose
    // doors stand open.
    const chord = isWing ? length * 0.105 : length * 0.09;
    const standHeight = length * 0.05;

    const profile = isWing
      ? wingProfile(chord, chord * 0.13)
      : ducktailProfile(chord, length * 0.012);

    // A wing is a straight aerofoil held above the car, while a ducktail
    // follows the panel it sits on.
    const deckPeak = Math.max(...points.map((point) => point.height));

    const swept = points.map((point, index) => {
      const fromEdge = Math.min(index, points.length - 1 - index);

      return {
        lateral: point.lateral,
        baseY: isWing ? deckPeak + standHeight : point.height,
        chordOffset,
        // Both shapes taper towards their tips so nothing ends in a blunt slab.
        scale: isWing ? 1 : 0.35 + 0.65 * Math.min(1, fromEdge / 2)
      };
    });

    return {
      geometry: buildSweptGeometry({
        profile,
        stations: swept,
        lengthAxis,
        widthAxis,
        rearSign,
        rearEnd
      }),
      isWing,
      chord,
      standHeight,
      deckPeak,
      rearEnd,
      points
    };
  }, [enabled, scene, car, type, spanWidth, chordOffset]);

  if (!built) return null;

  const { lengthAxis, widthAxis, rearSign, length } = car;
  const { geometry, isWing, chord, standHeight, deckPeak, rearEnd, points } = built;

  const place = (along, up, lateral) => {
    const position = [0, up, 0];
    position[lengthAxis === "x" ? 0 : 2] = rearEnd + rearSign * along;
    position[widthAxis === "x" ? 0 : 2] = lateral;
    return position;
  };

  const boxArgs = (alongSize, upSize, lateralSize) => {
    const args = [0, upSize, 0];
    args[lengthAxis === "x" ? 0 : 2] = alongSize;
    args[widthAxis === "x" ? 0 : 2] = lateralSize;
    return args;
  };

  const deckAt = (lateral) =>
    points.reduce(
      (best, point) =>
        Math.abs(point.lateral - lateral) < Math.abs(best.lateral - lateral)
          ? point
          : best,
      points[0]
    ).height;

  const uprightLateral = car.midWidth + spanWidth * 0.33;
  const uprightMirror = car.midWidth - spanWidth * 0.33;

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial {...CARBON} side={2} />
      </mesh>

      {isWing && (
        <>
          {/* UPRIGHTS DOWN TO THE DECK */}
          {[uprightLateral, uprightMirror].map((lateral) => {
            const top = deckPeak + standHeight;
            const bottom = deckAt(lateral);

            return (
              <mesh
                key={lateral}
                position={place(
                  chordOffset - chord * 0.35,
                  (top + bottom) / 2,
                  lateral
                )}
                castShadow
              >
                <boxGeometry
                  args={boxArgs(length * 0.014, top - bottom, length * 0.03)}
                />
                <meshStandardMaterial color="#1b1d21" metalness={0.7} roughness={0.3} />
              </mesh>
            );
          })}

          {/* END PLATES */}
          {[
            car.midWidth + spanWidth / 2,
            car.midWidth - spanWidth / 2
          ].map((lateral) => (
            <mesh
              key={lateral}
              position={place(
                chordOffset - chord * 0.45,
                deckPeak + standHeight + chord * 0.05,
                lateral
              )}
              castShadow
            >
              <boxGeometry
                args={boxArgs(chord * 1.15, chord * 0.5, length * 0.006)}
              />
              <meshStandardMaterial color="#101215" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
