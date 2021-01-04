const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

const { renderOutfitImage } = require("../src/server/outfit-images");

const VALID_LAYER_URLS = [
  /^https:\/\/impress-asset-images\.s3\.amazonaws\.com\/(biology|object)\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+\/150x150\.png$/,
  /^http:\/\/images\.neopets\.com\/cp\/(biology|object)\/data\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+\.svg$/,
];

async function handle(req, res) {
  if (!req.query.layerUrls) {
    res.setHeader("Content-Type", "text/plain");
    return res.status(400).send(`Missing required parameter: layerUrls`);
  }

  const layerUrls = req.query.layerUrls.split(",");

  for (const layerUrl of layerUrls) {
    if (!VALID_LAYER_URLS.some((pattern) => layerUrl.match(pattern))) {
      return res.status(400).send(`Unexpected layer URL format: ${layerUrl}`);
    }
  }

  let imageResult;
  try {
    imageResult = await renderOutfitImage(layerUrls, 150);
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/plain");
    return res.status(400).send(`Error rendering image: ${e.message}`);
  }

  const { image, status } = imageResult;

  if (status === "success") {
    // On success, we use very aggressive caching, on the assumption that
    // layers are ~immutable too, and that our rendering algorithm will almost
    // never change in a way that requires pushing changes. If it does, we
    // should add a cache-buster to the URL!
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.status(200);
  } else {
    // On partial failure, we still send the image, but with a 500 status. We
    // send a long-lived cache header, but in such a way that the user can
    // refresh the page to try again. (`private` means the CDN won't cache it,
    // and we don't send `immutable`, which would save it even across reloads.)
    // The 500 won't really affect the client, which will still show the image
    // without feedback to the user - but it's a helpful debugging hint.
    res.setHeader("Cache-Control", "private, max-age=604800");
    res.status(500);
  }

  res.setHeader("Content-Type", "image/png");
  return res.send(image);
}

export default async (req, res) => {
  beeline.withTrace({ name: "outfitImage" }, () => handle(req, res));
};
