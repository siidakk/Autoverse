/**
 * The photograph at its true size, on a canvas.
 *
 * Everything that reads a photograph has to agree on what a coordinate means,
 * and until this existed, nothing did.
 *
 * tf.browser.fromPixels() reads an <img> at its *layout* size. The repair page
 * styles its photo to fit the panel, so a 1600 by 1000 picture reached the
 * models as roughly 1013 by 633, while the code working out where to look used
 * naturalWidth. Two consequences, one loud and one quiet:
 *
 *   * the sliding window asked for a crop off the right of the smaller tensor
 *     and the scan died outright -- "Negative size values should be exactly -1
 *     but got -87";
 *   * the object detector returned its box in that same shrunken space, and
 *     that box is what decides which panel a dent sits on and where the
 *     overlay is drawn. That one had no error message at all. It would simply
 *     have put damage on the wrong panel, off by the CSS scale factor,
 *     forever.
 *
 * A canvas has no layout size -- its pixels are its pixels -- so passing one to
 * both the detector and the classifiers makes every box mean the same thing.
 * Draw it once and pass it around; it is a full repaint of the photograph.
 */
export function atNaturalSize(image) {
  if (image instanceof HTMLCanvasElement) return image;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth ?? image.width;
  canvas.height = image.naturalHeight ?? image.height;

  canvas.getContext("2d", { willReadFrequently: true }).drawImage(image, 0, 0);

  return canvas;
}
