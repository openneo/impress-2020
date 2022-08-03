/**
 * /api/outfitImage returns an image of an outfit!
 *
 * Parameters:
 *   - size: Must be "150", "300", or "600", to indicate the image size you'd
 *           like back. (For example, "150" will return a 150x150 image.)
 *   - layerUrls: A comma-separated list of URLs to render, in order from
 *                bottom to top. This is a sorta "independent" render mode,
 *                not bound to any saved outfit. The URLs must match a known
 *                layer URL format. This mode will return a long-term cache
 *                header, so the client and our CDN cache can cache the
 *                requested URL forever. (NOTE: The Vercel cache seems pretty
 *                quick to eject them, though...)
 *   - id: Instead of `layerUrls`, you can instead provide an outfit ID, which
 *         will load the outfit data and render it directly. By default, this
 *         will return a 10-minute cache header, to keep individual users from
 *         re-loading the image from scratch too often, while still keeping it
 *         relatively fresh. (If you provide `updatedAt` too, we cache it for
 *         longer!)
 *   - updatedAt: If you provide an `id`, you may also provide `updatedAt`:
 *                the UNIX timestamp for when the outfit was last updated. This
 *                has no effect on image output, but it enables us to return a
 *                long-term cache header, so the client and our CDN cache can
 *                cache the requested URL forever. (NOTE: The Vercel cache
 *                seems pretty quick to eject them, though...)
 */
const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
  sampleRate: 10,
});

import gql from "graphql-tag";
import { ApolloServer } from "apollo-server";
import { createTestClient } from "apollo-server-testing";

import connectToDb from "../../src/server/db";
import { config as graphqlConfig } from "../../src/server";
import { renderOutfitImage } from "../../src/server/outfit-images";
import getVisibleLayers, {
  petAppearanceFragmentForGetVisibleLayers,
  itemAppearanceFragmentForGetVisibleLayers,
} from "../../src/shared/getVisibleLayers";

// We're overly cautious about what image URLs we're willing to download and
// layer together for our output! We'll only accept `layerUrls` that match one
// of the following patterns:
const VALID_LAYER_URLS = [
  // Some layers are converted from SWF to PNG by Classic DTI, living on S3.
  /^https:\/\/(impress-asset-images\.openneo\.net|impress-asset-images\.s3\.amazonaws\.com)\/(biology|object)\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+\/(150x150|300x300|600x600)\.png(\?[a-zA-Z0-9_-]+)?$/,

  // Some layers are converted to PNG or SVG by Neopets themselves, extracted
  // from the manifest file.
  // TODO: I don't think we serve the `http://` variant of this layer URL
  //       anymore, we could disallow that someday, but I'm keeping it for
  //       compatibility with any potential old caches for now!
  /^https?:\/\/images\.neopets\.com\/cp\/(bio|object|items)\/data\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(svg|png)(\?.*)?$/,

  // Some layers are converted from HTML5 movie to PNG, by our new system.
  // NOTE: We don't validate the layer's libraryUrl, because we're expecting
  //       the assetImage endpoint to have its own validation!
  /^https:\/\/impress-2020\.openneo\.net\/api\/assetImage\?libraryUrl=[^&]+(&size=(150|300|600))?$/,
];

async function handle(req, res) {
  const size = parseInt(req.query.size);
  if (size !== 150 && size !== 300 && size !== 600) {
    return reject(res, `Size must be 150, 300, or 600`);
  }

  let layerUrls;
  if (req.query.layerUrls) {
    layerUrls = req.query.layerUrls.split(",");
  } else if (req.query.id && req.query.updatedAt) {
    const outfitId = req.query.id;
    try {
      layerUrls = await loadLayerUrlsForSavedOutfit(outfitId, size);
    } catch (e) {
      console.error(e);
      return reject(
        res,
        `Error loading data for outfit ${outfitId}: ${e.message}`,
        500
      );
    }
  } else if (req.query.id) {
    // If there's an outfit ID, but no `updatedAt`, redirect to the URL with
    // `updatedAt` added. (NOTE: Our Fastly config will try to handle this
    // redirect internally, instead of making the user do a round-trip! That
    // way, we load the version cached at the CDN instead of regenerating it,
    // if possible.)
    const outfitId = req.query.id;
    let updatedAt;
    try {
      updatedAt = await loadUpdatedAtForSavedOutfit(outfitId);
    } catch (e) {
      return reject(
        res,
        `Error loading data for outfit ${outfitId}: ${e.message}`,
        500
      );
    }

    const updatedAtTimestamp = Math.floor(updatedAt.getTime() / 1000);
    const urlWithUpdatedAt =
      `/outfits` +
      `/${encodeURIComponent(outfitId)}` +
      `/v/${encodeURIComponent(updatedAtTimestamp)}` +
      `/${encodeURIComponent(req.query.size)}.png`;

    // Cache this result for 10 minutes, so individual users don't wait on
    // image reloads too much, but it's still always relatively fresh!
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.redirect(urlWithUpdatedAt);
  } else {
    return reject(res, `Missing required parameter: layerUrls`);
  }

  for (const layerUrl of layerUrls) {
    if (!VALID_LAYER_URLS.some((pattern) => layerUrl.match(pattern))) {
      return reject(res, `Unexpected layer URL format: ${layerUrl}`);
    }
  }

  let imageResult;
  try {
    imageResult = await renderOutfitImage(layerUrls, size);
  } catch (e) {
    console.error(e);
    return reject(res, `Error rendering image: ${e.message}`);
  }

  const { image, status } = imageResult;

  if (status === "success") {
    // This image is ready, and it either used `layerUrls` or `updatedAt`, so
    // it shouldn't change much, if ever. Send a long-term cache header!
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200);
  } else {
    // On partial failure, we still send the image, but with a 500 status. We
    // send a one-week cache header, but in such a way that the user can
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

// Check out this scrappy way of making a query against server code ^_^`
const graphqlClient = createTestClient(new ApolloServer(graphqlConfig));

async function loadLayerUrlsForSavedOutfit(outfitId, size) {
  const { errors, data } = await graphqlClient.query({
    query: gql`
      query ApiOutfitImage($outfitId: ID!, $size: LayerImageSize) {
        outfit(id: $outfitId) {
          petAppearance {
            layers {
              id
              imageUrl(size: $size)
            }
            ...PetAppearanceForGetVisibleLayers
          }
          itemAppearances {
            layers {
              id
              imageUrl(size: $size)
            }
            ...ItemAppearanceForGetVisibleLayers
          }
        }
      }
      ${petAppearanceFragmentForGetVisibleLayers}
      ${itemAppearanceFragmentForGetVisibleLayers}
    `,
    variables: { outfitId, size: `SIZE_${size}` },
  });

  if (errors && errors.length > 0) {
    throw new Error(
      `GraphQL Error: ${errors.map((e) => e.message).join(", ")}`
    );
  }

  if (!data.outfit) {
    throw new Error(`outfit ${outfitId} not found`);
  }

  const { petAppearance, itemAppearances } = data.outfit;
  const visibleLayers = getVisibleLayers(petAppearance, itemAppearances);

  for (const layer of visibleLayers) {
    if (!layer.imageUrl) {
      throw new Error(`layer ${layer.id} has no imageUrl for size ${size}`);
    }
  }

  return visibleLayers
    .sort((a, b) => a.depth - b.depth)
    .map((layer) => layer.imageUrl);
}

async function loadUpdatedAtForSavedOutfit(outfitId) {
  const db = await connectToDb();
  const [rows] = await db.query(`SELECT updated_at FROM outfits WHERE id = ?`, [
    outfitId,
  ]);
  const row = rows[0];
  if (!row) {
    throw new Error(`outfit ${outfitId} not found`);
  }
  return row.updated_at;
}

function reject(res, message, status = 400) {
  res.setHeader("Content-Type", "text/plain; charset=utf8");
  return res.status(status).send(message);
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/outfitImage", operation_name: "api/outfitImage" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
