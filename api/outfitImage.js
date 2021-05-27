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

import fetch from "node-fetch";
import gql from "graphql-tag";
import { print as graphqlPrint } from "graphql/language/printer";

import { renderOutfitImage } from "../src/server/outfit-images";
import getVisibleLayers, {
  petAppearanceFragmentForGetVisibleLayers,
  itemAppearanceFragmentForGetVisibleLayers,
} from "../src/shared/getVisibleLayers";

const VALID_LAYER_URLS = [
  /^https:\/\/(impress-asset-images\.openneo\.net|impress-asset-images\.s3\.amazonaws\.com)\/(biology|object)\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+\/(150|300|600)x(150|300|600)\.png(\?[a-zA-Z0-9_-]+)?$/,
  /^http:\/\/images\.neopets\.com\/cp\/(bio|object|items)\/data\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(svg|png)(\?.*)?$/,
];

async function handle(req, res) {
  const size = parseInt(req.query.size);
  if (size !== 150 && size !== 300 && size !== 600) {
    return reject(res, `Size must be 150, 300, or 600`);
  }

  let layerUrls;
  let isSafeToCacheLongTerm;
  if (req.query.layerUrls) {
    layerUrls = req.query.layerUrls.split(",");

    // When layerUrls are provided, it's always safe to cache long-term. We
    // assume layer assets are immutable, and that TNT generally creates new
    // IDs when they're not. (Or, if TNT's conversion strategy or our rendering
    // strategy dramatically changes, we might add a cache-buster to the URL.)
    isSafeToCacheLongTerm = true;
  } else if (req.query.id) {
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

    // When an outfit ID is provided, it's only safe to cache long-term if
    // `updatedAt` is also provided.
    isSafeToCacheLongTerm = Boolean(req.query.updatedAt);
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

  if (status === "success" && isSafeToCacheLongTerm) {
    // This image is safe to cache long-term, so send a long-term cache header!
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.status(200);
  } else if (status === "success") {
    // This image rendered successfully, but isn't safe to cache long-term. We
    // cache for a short period of time, instead, to avoid thrashing too hard
    // on individual users, while still keeping it relatively fresh.
    res.setHeader("Cache-Control", "public, max-age=600, immutable");
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

const GRAPHQL_ENDPOINT = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/graphql`
  : process.env.NODE_ENV === "development"
  ? "http://localhost:3000/api/graphql"
  : "https://impress-2020.openneo.net/api/graphql";

// NOTE: Unlike in-app views, we only load PNGs here. We expect this to
//       generally perform better, and be pretty reliable now that TNT is
//       generating canonical PNGs for every layer!
const GRAPHQL_QUERY = gql`
  query ApiOutfitImage($outfitId: ID!, $size: LayerImageSize) {
    outfit(id: $outfitId) {
      petAppearance {
        layers {
          imageUrl(size: $size)
        }
        ...PetAppearanceForGetVisibleLayers
      }
      itemAppearances {
        layers {
          imageUrl(size: $size)
        }
        ...ItemAppearanceForGetVisibleLayers
      }
    }
  }
  ${petAppearanceFragmentForGetVisibleLayers}
  ${itemAppearanceFragmentForGetVisibleLayers}
`;
const GRAPHQL_QUERY_STRING = graphqlPrint(GRAPHQL_QUERY);

async function loadLayerUrlsForSavedOutfit(outfitId, size) {
  const { errors, data } = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY_STRING,
      variables: { outfitId, size: `SIZE_${size}` },
    }),
  }).then((res) => res.json());

  if (errors && errors.length > 0) {
    throw new Error(
      `GraphQL Error: ${errors.map((e) => e.message).join(", ")}`
    );
  }

  const { petAppearance, itemAppearances } = data.outfit;
  const visibleLayers = getVisibleLayers(petAppearance, itemAppearances);
  return visibleLayers
    .sort((a, b) => a.depth - b.depth)
    .map((layer) => layer.imageUrl);
}

function reject(res, message, status = 400) {
  res.setHeader("Content-Type", "text/plain");
  return res.status(status).send(message);
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/outfitImage", operation_name: "api/outfitImage" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
