// AR on iPhone and iPad.
//
// Safari has no WebXR and is not getting it, so the Android path cannot be made
// to work here however hard it is pushed. What iOS has instead is AR Quick
// Look: hand Safari a USDZ file through a link marked `rel="ar"` and the system
// opens its own AR viewer, full screen, with its own placement and scaling.
//
// The interesting part is that the file does not have to exist in advance.
// three.js can write USDZ from a scene graph, so the car is exported from what
// is on screen at the moment the button is pressed -- the paint you chose, the
// wheels you fitted, the ride height you set. A pre-baked file per car could
// never do that.
//
// Two details Safari is strict about, both learned the hard way by everyone who
// has built this:
//
//   * the anchor must contain an <img> child, or the link is treated as an
//     ordinary download and the viewer never opens;
//   * the URL must end in .usdz, which a blob: URL does not, so the file name
//     is carried in the fragment where Quick Look still reads it.

import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { snapshot, release } from "./arScene";

export function isApple() {
  if (typeof navigator === "undefined") return false;

  // iPadOS reports itself as a Mac, and the touch points are what give it away.
  const iPadOnDesktopSafari =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(navigator.userAgent) || iPadOnDesktopSafari;
}

// Whether this browser will actually intercept the link. Safari says yes;
// Chrome on iOS says yes as well, because it is Safari underneath.
export function quickLookSupported() {
  if (typeof document === "undefined") return false;

  const anchor = document.createElement("a");
  return Boolean(anchor.relList?.supports?.("ar"));
}

/**
 * Exports the configured car and opens it in Quick Look.
 *
 * Resolves once the link has been handed over. There is no way to be told what
 * the system viewer does next, which is the trade for not having to build one.
 */
export async function openQuickLook(stage, { onStatus, name = "AutoVerse" } = {}) {
  if (!quickLookSupported()) {
    throw new Error(
      "This browser will not open AR Quick Look. On iPhone and iPad it works in Safari."
    );
  }

  const car = snapshot(stage);
  if (!car) throw new Error("The car is still loading.");

  onStatus?.("Preparing the car");

  let blob;
  try {
    const exporter = new USDZExporter();
    // Quick Look reads metres, and the car is already in metres because the
    // configurator normalises every model to 4.6 of them.
    const usdz = await exporter.parseAsync(car);
    blob = new Blob([usdz], { type: "model/vnd.usdz+zip" });
  } finally {
    release(car);
  }

  const url = URL.createObjectURL(blob);

  onStatus?.("Opening AR");

  const anchor = document.createElement("a");
  // The fragment is what gives Quick Look a .usdz to look at; without it a
  // blob URL is refused.
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", `${url}#${name}.usdz`);
  anchor.style.display = "none";

  // Required. Safari ignores rel="ar" on an anchor with no image inside it.
  const pixel = document.createElement("img");
  pixel.style.display = "none";
  anchor.appendChild(pixel);

  document.body.appendChild(anchor);
  anchor.click();

  // Given a generous window before revoking: Safari reads the blob after the
  // click returns, and revoking too early opens an empty viewer.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 60000);

  onStatus?.(null);

  return { bytes: blob.size };
}
