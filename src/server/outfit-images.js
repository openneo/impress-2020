const path = require("path");

const { createCanvas, loadImage } = require("canvas");

async function renderOutfitImage(layerRefs) {
  const canvas = createCanvas(90, 90);
  const ctx = canvas.getContext("2d");

  const image = await loadImage(
    path.join(__dirname, "../app/images/feedback-xwee.png")
  );
  ctx.drawImage(image, 0, 0, 90, 90);

  return canvas.toBuffer();
}

module.exports = { renderOutfitImage };
