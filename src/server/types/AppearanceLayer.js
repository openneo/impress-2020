import * as path from "path";

import { gql } from "apollo-server";
import { loadAssetManifest } from "../neopets-assets";

const typeDefs = gql`
  enum LayerImageSize {
    SIZE_600
    SIZE_300
    SIZE_150
  }

  enum LayerType {
    PET_LAYER
    ITEM_LAYER
  }

  # Cache for 1 week (unlikely to change)
  type AppearanceLayer @cacheControl(maxAge: 604800) {
    "The DTI ID. Guaranteed unique across all layers of all types."
    id: ID!

    """
    The Neopets ID. Guaranteed unique across layers of the _same_ type, but
    not of different types. That is, it's allowed and common for an item
    layer and a pet layer to have the same remoteId.
    """
    remoteId: ID!

    zone: Zone!

    """
    This layer as a single PNG, if available.

    This will sometimes be a Neopets.com URL, if there's an official PNG at the
    requested size.

    This might not be available at all, if there's no official PNG, and also
    DTI Classic is still converting or failed to convert it from SWF.

    DEPRECATED: See imageUrlV2 instead!
    """
    imageUrl(size: LayerImageSize): String

    """
    This layer as a single PNG, if available.

    This will sometimes be a Neopets.com URL, if there's an official PNG at the
    requested size.

    This might not be available at all, if there's no official PNG, and also
    DTI Classic is still converting or failed to convert it from SWF.

    The idealSize parameter is a hint for what size image would be best to
    return (e.g. if you only need 150x150, requesting that size can make image
    loading faster). Note that the endpoint might return an image that's not of
    the correct size, and callers should be prepared to handle that and resize
    if necessary!
    """
    imageUrlV2(idealSize: LayerImageSize): String

    """
    This layer as a single SVG, if available.

    This might not be available if the asset isn't converted yet by Neopets,
    or if it's not as simple as a single SVG (e.g. animated).
    """
    svgUrl: String

    """
    This layer as a single SWF, if available.

    At time of writing, all layers have SWFs. But I've marked this nullable
    because I'm not sure this will continue to be true after the HTML5
    migration, and I'd like clients to guard against it.
    """
    swfUrl: String

    """
    This layer as an HTML canvas library JS file, if available.

    This will be empty for layers that don't animate, and might also be empty
    for animated layers not yet converted by Neopets.
    """
    canvasMovieLibraryUrl: String

    """
    This layer can fit on PetAppearances with the same bodyId. "0" is a
    special body ID that indicates it fits all PetAppearances.
    """
    bodyId: ID!

    """
    The item this layer is for, if any. (For pet layers, this is null.)
    """
    item: Item

    """
    Glitches that we know to affect this appearance layer. This can be useful
    for changing our behavior to match official behavior, or to alert the user
    that our behavior _doesn't_ match official behavior.
    """
    knownGlitches: [AppearanceLayerKnownGlitch!]!
  }

  enum AppearanceLayerKnownGlitch {
    """
    This glitch means that the official SWF art for this layer is known to
    contain a glitch. (It probably also affects the PNG captured by Classic
    DTI, too.)

    In this case, there's no correct art we _can_ show until it's converted
    to HTML5. We'll show a message explaining the situation, and automatically
    change it to be more hesitant after HTML5 conversion, because we don't
    know in advance whether the layer will be fixed during conversion.
    """
    OFFICIAL_SWF_IS_INCORRECT

    """
    This glitch means that, while the official manifest declares an SVG
    version of this layer, it is incorrect and does not visually match the
    PNG version that the official pet editor users.

    For affected layers, svgUrl will be null, regardless of the manifest.
    """
    OFFICIAL_SVG_IS_INCORRECT

    """
    This glitch means that the official movie JS library (or supporting data)
    for this layer is known to contain a glitch.

    In this case, we _could_ fall back to the PNG, but we choose not to: it
    could mislead people about how the item will appear on-site. We like our
    previews to match the real on-site appearance whenever possible! Instead,
    we show a message, asking users to send us info if they know it to be
    fixed on-site. (This could happen by our manifest getting out of date, or
    TNT replacing it with a new asset that needs re-modeling.)
    """
    OFFICIAL_MOVIE_IS_INCORRECT

    """
    This glitch means that we know the layer doesn't display correctly on
    DTI, but we're not sure why, or whether it works differently on-site. We
    show a vague apologetic message, asking users to send us info.
    """
    DISPLAYS_INCORRECTLY_BUT_CAUSE_UNKNOWN

    """
    This glitch means that the official body ID for this asset is not correct
    (usually 0), so it will fit some pets that it shouldn't. We reflect this
    accurately on DTI, with a message to explain that it's not our error, and
    as a warning that this might not work if TNT changes it later.
    """
    OFFICIAL_BODY_ID_IS_INCORRECT

    """
    This glitch is a hack for a bug in DTI: some items, like "Living in
    Watermelon Foreground and Background", have a background layer that's
    shared across all bodies - but it should NOT fit pets that don't have a
    corresponding body-specific foreground!

    The long-term fix here is to refactor our data to not use bodyId=0, and
    instead have a more robust concept of item appearance across bodies.
    """
    REQUIRES_OTHER_BODY_SPECIFIC_ASSETS
  }

  extend type Query {
    """
    Return the item appearance layers with the given remoteIds. We use this
    in Support tool to bulk-add a range of layers to an item. When we can't
    find a layer with the given ID, we omit its entry from the returned list.
    """
    itemAppearanceLayersByRemoteId(remoteIds: [ID!]!): [AppearanceLayer]!

    """
    Return the number of layers that have been converted to HTML5, optionally
    filtered by type. Cache for 30 minutes (we re-sync with Neopets every
    hour).
    """
    numAppearanceLayersConverted(type: LayerType): Int!
      @cacheControl(maxAge: 1800)

    """
    Return the total number of layers, optionally filtered by type. Cache for
    30 minutes (we re-sync with Neopets every hour).
    """
    numAppearanceLayersTotal(type: LayerType): Int! @cacheControl(maxAge: 1800)

    """
    Return the appearance layer with the given type and remoteId, if any.
    """
    appearanceLayerByRemoteId(type: LayerType, remoteId: ID!): AppearanceLayer
  }
`;

// Extract the AppearanceLayerKnownGlitch values, to filter on later.
const ALL_KNOWN_GLITCH_VALUES = new Set(
  typeDefs.definitions
    .find((d) => d.name.value === "AppearanceLayerKnownGlitch")
    .values.map((v) => v.name.value),
);

const resolvers = {
  AppearanceLayer: {
    remoteId: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.remoteId;
    },
    bodyId: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.bodyId;
    },
    zone: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return { id: layer.zoneId };
    },
    swfUrl: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.url;
    },
    imageUrl: async ({ id }, { size = "SIZE_150" }, { swfAssetLoader, db }) => {
      const layer = await swfAssetLoader.load(id);

      const { format, jsAssetUrl, pngAssetUrl } =
        await loadAndCacheAssetDataFromManifest(db, layer);

      // For the largest size, try to use the official Neopets PNG!
      if (size === "SIZE_600") {
        // If there's an official single-image PNG we can use, use it! This is
        // what the official /customise editor uses at time of writing.
        if (format === "lod" && !jsAssetUrl && pngAssetUrl) {
          return pngAssetUrl.toString();
        }
      }

      // Or, if this is a movie, we can generate the PNG ourselves.
      if (format === "lod" && jsAssetUrl) {
        const httpsJsAssetUrl = jsAssetUrl
          .toString()
          .replace(/^http:\/\//, "https://");
        const sizeNum = size.split("_")[1];
        return (
          `https://impress-2020.openneo.net/api/assetImage` +
          `?libraryUrl=${encodeURIComponent(httpsJsAssetUrl)}&size=${sizeNum}`
        );
      }

      // Otherwise, fall back to the Classic DTI image storage, which is
      // generated from the SWFs (or sometimes manually overridden). It's less
      // accurate, but well-tested to generally work okay, and it's the only
      // image we have for assets not yet converted to HTML5.

      // If there's no image, return null. (In the development db, which isn't
      // aware which assets we have images for on the DTI CDN, assume we _do_
      // have the image - it's usually true, and better for testing.)
      const hasImage =
        layer.hasImage || process.env["DB_ENV"] === "development";
      if (!hasImage) {
        return null;
      }

      const sizeNum = size.split("_")[1];

      const rid = layer.remoteId;
      const paddedId = rid.padStart(12, "0");
      const rid1 = paddedId.slice(0, 3);
      const rid2 = paddedId.slice(3, 6);
      const rid3 = paddedId.slice(6, 9);
      const time = Number(new Date(layer.convertedAt));

      return (
        `https://aws.impress-asset-images.openneo.net/${layer.type}` +
        `/${rid1}/${rid2}/${rid3}/${rid}/${sizeNum}x${sizeNum}.png?v2-${time}`
      );
    },
    imageUrlV2: async ({ id }, { idealSize }, { swfAssetLoader, db }) => {
      const layer = await swfAssetLoader.load(id);

      const { format, jsAssetUrl, pngAssetUrl } =
        await loadAndCacheAssetDataFromManifest(db, layer);

      // If there's an official single-image PNG we can use, use it! This is
      // what the official /customise editor uses at time of writing.
      //
      // NOTE: This ignores `idealSize`, and it's the case that you're most
      //       likely to actually trigger! This because we don't think logic to
      //       resize the image server-side is actually likely to be net better
      //       for performance in most cases, so we're not gonna build that
      //       until the need is demonstrated ^_^;
      if (format === "lod" && !jsAssetUrl && pngAssetUrl) {
        return pngAssetUrl.toString();
      }

      // Or, if this is a movie, we can generate the PNG ourselves.
      if (format === "lod" && jsAssetUrl) {
        const httpsJsAssetUrl = jsAssetUrl
          .toString()
          .replace(/^http:\/\//, "https://");
        const sizeNum = idealSize.split("_")[1];
        return (
          `https://impress-2020.openneo.net/api/assetImage` +
          `?libraryUrl=${encodeURIComponent(httpsJsAssetUrl)}&size=${sizeNum}`
        );
      }

      // Otherwise, fall back to the Classic DTI image storage, which is
      // generated from the SWFs (or sometimes manually overridden). It's less
      // accurate, but well-tested to generally work okay, and it's the only
      // image we have for assets not yet converted to HTML5.
      //
      // NOTE: We've stopped generating these images for new assets! This is
      //       mainly for old assets not yet converted to HTML5.

      // If there's no image, return null. (In the development db, which isn't
      // aware which assets we have images for on the DTI CDN, assume we _do_
      // have the image - it's usually true, and better for testing.)
      const hasImage =
        layer.hasImage || process.env["DB_ENV"] === "development";
      if (!hasImage) {
        return null;
      }

      const sizeNum = idealSize.split("_")[1];

      const rid = layer.remoteId;
      const paddedId = rid.padStart(12, "0");
      const rid1 = paddedId.slice(0, 3);
      const rid2 = paddedId.slice(3, 6);
      const rid3 = paddedId.slice(6, 9);
      const time = Number(new Date(layer.convertedAt));

      return (
        `https://aws.impress-asset-images.openneo.net/${layer.type}` +
        `/${rid1}/${rid2}/${rid3}/${rid}/${sizeNum}x${sizeNum}.png?v2-${time}`
      );
    },
    svgUrl: async ({ id }, _, { db, swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

      if (
        layer.knownGlitches.split(",").includes("OFFICIAL_SVG_IS_INCORRECT")
      ) {
        return null;
      }

      const { format, jsAssetUrl, svgAssetUrl } =
        await loadAndCacheAssetDataFromManifest(db, layer);

      // If there's an official single-image SVG we can use, use it! The NC
      // Mall player uses this at time of writing, and we generally prefer it
      // over the PNG, because it scales better for larger high-DPI screens.
      //
      // NOTE: I'm not sure the vector format is still part of the official
      //       data set? New items all seem to be lod now.
      if (
        (format === "vector" || format === "lod") &&
        !jsAssetUrl &&
        svgAssetUrl
      ) {
        return svgAssetUrl.toString();
      } else {
        return null;
      }
    },
    canvasMovieLibraryUrl: async ({ id }, _, { db, swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

      const { format, jsAssetUrl } = await loadAndCacheAssetDataFromManifest(
        db,
        layer,
      );

      if (format === "lod" && jsAssetUrl) {
        return jsAssetUrl.toString();
      } else {
        return null;
      }
    },
    item: async ({ id }, _, { db }) => {
      // TODO: If this becomes a popular request, we'll definitely need to
      // loaderize this! I'm cheating for now because it's just Support, one at
      // a time.
      const [rows] = await db.query(
        `
        SELECT parent_id FROM parents_swf_assets
        WHERE swf_asset_id = ? AND parent_type = "Item" LIMIT 1;
      `,
        [id],
      );

      if (rows.length === 0) {
        return null;
      }

      return { id: String(rows[0].parent_id) };
    },
    knownGlitches: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

      if (!layer.knownGlitches) {
        return [];
      }

      let knownGlitches = layer.knownGlitches.split(",");

      // Skip glitches that our GraphQL definition doesn't recognize. This
      // helps old clients avoid crashing (or even the latest prod client from
      // crashing when we're developing new glitch flags!).
      knownGlitches = knownGlitches.filter((knownGlitch) => {
        if (!ALL_KNOWN_GLITCH_VALUES.has(knownGlitch)) {
          console.warn(
            `Layer ${id}: Skipping unexpected knownGlitches value: ${knownGlitch}`,
          );
          return false;
        }
        return true;
      });

      return knownGlitches;
    },
  },

  Query: {
    itemAppearanceLayersByRemoteId: async (
      _,
      { remoteIds },
      { swfAssetByRemoteIdLoader },
    ) => {
      const layers = await swfAssetByRemoteIdLoader.loadMany(
        remoteIds.map((remoteId) => ({ type: "object", remoteId })),
      );
      return layers.filter((l) => l).map(({ id }) => ({ id }));
    },
    numAppearanceLayersConverted: async (
      _,
      { type },
      { swfAssetCountLoader },
    ) => {
      const count = await swfAssetCountLoader.load({
        type: convertLayerTypeToSwfAssetType(type),
        isConverted: true,
      });
      return count;
    },
    numAppearanceLayersTotal: async (_, { type }, { swfAssetCountLoader }) => {
      const count = await swfAssetCountLoader.load({
        type: convertLayerTypeToSwfAssetType(type),
      });
      return count;
    },
    appearanceLayerByRemoteId: async (
      _,
      { type, remoteId },
      { swfAssetByRemoteIdLoader },
    ) => {
      const swfAsset = await swfAssetByRemoteIdLoader.load({
        type: type === "PET_LAYER" ? "biology" : "object",
        remoteId,
      });
      if (swfAsset == null) {
        return null;
      }
      return { id: swfAsset.id };
    },
  },
};

function convertLayerTypeToSwfAssetType(layerType) {
  switch (layerType) {
    case "PET_LAYER":
      return "biology";
    case "ITEM_LAYER":
      return "object";
    default:
      return null;
  }
}

// We'll keep manifests in the db for up to 3 days! I'm not sure how well this
// will perform in practice re hit ratio... keep an eye on it! But this will
// keep us up-to-date for changes, esp during this HTML5 conversion period,
// while avoiding _too_ much additional latency. (The main risk here is that
// cache misses add a SQL UPDATE to the execution path, so cache misses are
// _worse_ than a no-cache strategy...) We could also consider a regular cron
// re-sync of all of them!
const MAX_MANIFEST_AGE_IN_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * loadAndCacheAssetDataFromManifest loads and caches the manifest (if not
 * already cached on the layer from the database), and then accesses some
 * basic data in a format convenient for our resolvers!
 *
 * Specifically, we return the format, and the first asset available of each
 * common type. (It's important to be careful with this - the presence of a
 * PNG doesn't necessarily indicate that it can be used as a single static
 * image for this layer, it could be a supporting sprite for the JS library!)
 */
async function loadAndCacheAssetDataFromManifest(db, layer) {
  let manifest;
  try {
    manifest = layer.manifest && JSON.parse(layer.manifest);
  } catch (e) {
    console.error(
      `Layer ${layer.id} has invalid manifest JSON: ` +
        `${JSON.stringify(layer.manifest)}`,
    );
    manifest = null;
  }

  const manifestAgeInMs = layer.manifestCachedAt
    ? new Date() - new Date(layer.manifestCachedAt)
    : Infinity;

  // If we don't have a recent copy of the manifest (none at all, or an expired
  // one), load it!
  if (manifest === null || manifestAgeInMs > MAX_MANIFEST_AGE_IN_MS) {
    console.info(
      `[Layer ${layer.id}] Updating manifest cache, ` +
        `last updated ${manifestAgeInMs}ms ago: ${layer.manifestCachedAt}`,
    );
    manifest = await loadAndCacheAssetManifest(db, layer);
  }

  // If we have an empty copy of the manifest, return empty data.
  if (!manifest || manifest.assets.length !== 1) {
    return { format: null, assetUrls: [] };
  }

  const asset = manifest.assets[0];

  const format = asset.format;
  const assetUrls = asset.assetData.map(
    (ad) => new URL(ad.path, "https://images.neopets.com"),
  );

  // In the case of JS assets, we want the *last* one in the list, because
  // sometimes older broken movies are included in the manifest too. In
  // practice, they generally seem to appear later, but I don't know how
  // reliable that actually is. (For PNGs though, we *must* return the first,
  // see the comments there.)
  const jsAssetUrl = [...assetUrls].reverse().find(
    // NOTE: Sometimes the path ends with a ?v= query string, so we need
    //       to use `extname` to find the real extension!
    // TODO: There's a file_ext field in the full manifest, but it's not
    //       included in our cached copy. That would probably be more
    //       reliable!
    (url) => path.extname(url.pathname) === ".js",
  );

  const svgAssetUrl = assetUrls.find(
    // NOTE: Sometimes the path ends with a ?v= query string, so we need
    //       to use `extname` to find the real extension!
    // TODO: There's a file_ext field in the full manifest, but it's not
    //       included in our cached copy. That would probably be more
    //       reliable!
    (url) => path.extname(url.pathname) === ".svg",
  );

  // NOTE: Unlike movies, we *must* use the first PNG and not the last, because
  //       sometimes reference art is included in the manifest as later PNGs.
  //       I wish I understood the underlying logic here, I'm not sure how
  //       reliable this is!
  const pngAssetUrl = assetUrls.find(
    // NOTE: Sometimes the path ends with a ?v= query string, so we need
    //       to use `extname` to find the real extension!
    // TODO: There's a file_ext field in the full manifest, but it's not
    //       included in our cached copy. That would probably be more
    //       reliable!
    (url) => path.extname(url.pathname) === ".png",
  );

  return { format, jsAssetUrl, svgAssetUrl, pngAssetUrl };
}

async function loadAndCacheAssetManifest(db, layer) {
  let manifest;
  try {
    manifest = await Promise.race([
      loadAssetManifest(layer.manifestUrl, layer.url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`manifest request timed out`)), 2000),
      ),
    ]);
  } catch (e) {
    console.error(
      new Error("Error loading asset manifest, caused by the error below"),
    );
    console.error(e);
    return null;
  }

  // Then, write the new manifest. We make sure to write an empty string
  // if there was no manifest, to signify that it doesn't exist, so we
  // don't need to bother looking it up again.
  //
  // TODO: Someday the manifests will all exist, right? So we'll want to
  //       reload all the missing ones at that time.
  const manifestJson = manifest ? JSON.stringify(manifest) : "";

  if (manifestJson.length > 16777215) {
    console.warn(
      `Skipping saving asset manifest for layer ${layer.id}, because its ` +
        `length is ${manifestJson.length}, which exceeds the database limit.`,
    );
    return manifest;
  }

  const [result] = await db.execute(
    `
      UPDATE swf_assets
        SET manifest = ?, manifest_cached_at = CURRENT_TIMESTAMP()
        WHERE id = ? LIMIT 1;
    `,
    [manifestJson, layer.id],
  );
  if (result.affectedRows !== 1) {
    throw new Error(
      `Expected to affect 1 asset, but affected ${result.affectedRows}`,
    );
  }
  console.info(
    `Loaded and saved manifest for ${layer.type} ${layer.remoteId}. ` +
      `DTI ID: ${layer.id}. Exists?: ${Boolean(manifest)}`,
  );

  return manifest;
}

module.exports = { typeDefs, resolvers };
