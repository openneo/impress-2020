const fs = require("fs");
const path = require("path");

function renderOutfitImage(layerRefs) {
  return fs.readFileSync(
    path.join(__dirname, "../app/images/feedback-xwee.png")
  );
}

module.exports = { renderOutfitImage };
