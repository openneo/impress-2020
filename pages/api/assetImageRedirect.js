/**
 * /api/assetImageRedirect takes an asset type, Neopets ID, and image size,
 * and redirects to a corresponding image URL.
 *
 * Parameters:
 *   - type: "biology" or "object"
 *   - remoteId: The Neopets ID of the asset
 *   - idealSize: "600x600", "300x300", or "150x150"
 *
 * This is designed to be a new backend for impress-asset-images.openneo.net,
 * which has URLs like: http://impress-asset-images.openneo.net/biology/000/000/000/596/600x600.png?1326426317
 * (That said, we still need some of the AWS images, which will still be
 * accessible at aws.impress-asset-images.openneo.net.)
 *
 * Note that this endpoint doesn't always respect the `idealSize` parameter very
 * closely; when our best canonical image is on images.neopets.com, it's
 * usually 600x600, and I don't think it's worth the negligible network savings
 * on Classic DTI to do resizing work here (and add another cache layer vs just
 * serving from the original CDN that's much more likely to be a cache hit!).
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
import { gql, loadGraphqlQuery } from "../../src/server/ssr-graphql";

async function handle(req, res) {
  if (!["biology", "object"].includes(req.query.type)) {
    res.setHeader("Content-Type", "text/plain");
    res.status(400).end(`type must be "biology" or "object"`);
    return;
  }
  if (!["600x600", "300x300", "150x150"].includes(req.query.idealSize)) {
    res.setHeader("Content-Type", "text/plain");
    res.status(400).end(`idealSize must be 600x600, 300x300, or 150x150`);
    return;
  }

  const { data, errors } = await loadGraphqlQuery({
    query: gql`
      query ApiAssetImageRedirect_GetImageUrl(
        $type: LayerType!
        $remoteId: ID!
        $idealSize: LayerImageSize!
      ) {
        appearanceLayerByRemoteId(type: $type, remoteId: $remoteId) {
          imageUrlV2(idealSize: $idealSize)
        }
      }
    `,
    variables: {
      type: req.query.type === "biology" ? "PET_LAYER" : "ITEM_LAYER",
      remoteId: req.query.remoteId,
      idealSize: "SIZE_" + parseInt(req.query.idealSize),
    },
  });
  if (errors) {
    console.error("Error loading image URL from GraphQL:");
    for (const error of errors) {
      console.error(error);
    }
    res.setHeader("Content-Type", "text/plain");
    res.status(500).end(`Error loading image URL from GraphQL`);
    return;
  }

  const layer = data.appearanceLayerByRemoteId;
  if (layer == null) {
    res.setHeader("Content-Type", "text/plain");
    res.status(404).end(`appearance layer not found`);
    return;
  }
  const imageUrl = layer.imageUrlV2;
  if (imageUrl == null) {
    res.setHeader("Content-Type", "text/plain");
    res.status(404).end(`appearance layer has no image available`);
    return;
  }

  // Cache for 5 minutes, and immediately serve stale data for an hour.
  // I don't expect asset image URLs to change often, but when they do, it'll
  // probably be important! And this is a pretty fast operation tbh.
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, stale-while-revalidate=3600"
  );
  res.setHeader("Content-Type", "image/png");
  return res.redirect(imageUrl);
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    {
      name: "api/assetImageRedirect",
      operation_name: "api/assetImageRedirect",
    },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
