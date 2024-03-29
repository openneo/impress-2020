import { createCanvas, loadImage } from "canvas";

async function renderOutfitImage(layerUrls, size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const images = await Promise.all(layerUrls.map(loadImageAndSkipOnFailure));

  const loadedImages = images.filter((image) => image);
  if (loadedImages.length === 0) {
    throw new Error(
      `Could not load any of the layer images: ${layerUrls.join(", ")}`
    );
  }

  for (const image of loadedImages) {
    ctx.drawImage(image, 0, 0, size, size);
  }

  return {
    image: canvas.toBuffer(),
    status:
      loadedImages.length === layerUrls.length ? "success" : "partial-failure",
  };
}

async function loadImageAndSkipOnFailure(url) {
  try {
    const image = await loadImage(url);
    return image;
  } catch (e) {
    console.warn(`Error loading layer, skipping: ${e.message}. (${url})`);
    return null;
  }
}

module.exports = { renderOutfitImage };
