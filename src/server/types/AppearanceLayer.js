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
    # The DTI ID. Guaranteed unique across all layers of all types.
    id: ID!

    # The Neopets ID. Guaranteed unique across layers of the _same_ type, but
    # not of different types. That is, it's allowed and common for an item
    # layer and a pet layer to have the same remoteId.
    remoteId: ID!

    zone: Zone!
    imageUrl(size: LayerImageSize): String

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
    The zones that this layer restricts, if any. Note that, for item layers,
    this is generally empty and the restriction is on the ItemAppearance, not
    the individual layers. For pet layers, this is generally used for
    Unconverted pets.

    Deprecated, aggregated into PetAppearance for a simpler API.
    """
    restrictedZones: [Zone!]!
  }

  extend type Query {
    # Return the number of layers that have been converted to HTML5, optionally
    # filtered by type. Cache for 30 minutes (we re-sync with Neopets every
    # hour).
    numAppearanceLayersConverted(type: LayerType): Int!
      @cacheControl(maxAge: 1800)

    # Return the total number of layers, optionally filtered by type. Cache for
    # 30 minutes (we re-sync with Neopets every hour).
    numAppearanceLayersTotal(type: LayerType): Int! @cacheControl(maxAge: 1800)
  }
`;

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
    restrictedZones: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return getRestrictedZoneIds(layer.zonesRestrict).map((id) => ({ id }));
    },
    swfUrl: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.url;
    },
    imageUrl: async ({ id }, { size = "SIZE_150" }, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

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
        `https://impress-asset-images.s3.amazonaws.com/${layer.type}` +
        `/${rid1}/${rid2}/${rid3}/${rid}/${sizeNum}x${sizeNum}.png?v2-${time}`
      );
    },
    svgUrl: async ({ id }, _, { db, swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      let manifest = layer.manifest && JSON.parse(layer.manifest);

      // When the manifest is specifically null, that means we don't know if
      // it exists yet. Load it to find out!
      if (manifest === null) {
        manifest = await loadAndCacheAssetManifest(db, layer);
      }

      if (!manifest) {
        return null;
      }

      if (manifest.assets.length !== 1) {
        return null;
      }

      const asset = manifest.assets[0];
      if (asset.format !== "vector" && asset.format !== "lod") {
        return null;
      }

      // In the `lod` case, if there's a JS asset, then don't treat this as an
      // SVG asset at all. (There might be an SVG in the asset list anyway
      // sometimes I think, for the animation, but ignore it if so!)
      //
      // NOTE: I thiiink the `vector` case is deprecated? I haven't verified
      //       whether it's gone from our database yet, though.
      const jsAssetDatum = asset.assetData.find((ad) =>
        ad.path.endsWith(".js")
      );
      if (jsAssetDatum) {
        return null;
      }

      const svgAssetDatum = asset.assetData.find((ad) =>
        ad.path.endsWith(".svg")
      );
      if (!svgAssetDatum) {
        return null;
      }

      const url = new URL(svgAssetDatum.path, "http://images.neopets.com");
      return url.toString();
    },
    canvasMovieLibraryUrl: async ({ id }, _, { db, swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      let manifest = layer.manifest && JSON.parse(layer.manifest);

      // When the manifest is specifically null, that means we don't know if
      // it exists yet. Load it to find out!
      if (manifest === null) {
        manifest = await loadAndCacheAssetManifest(db, layer);
      }

      if (!manifest) {
        return null;
      }

      if (manifest.assets.length !== 1) {
        return null;
      }

      const asset = manifest.assets[0];
      if (asset.format !== "lod") {
        return null;
      }

      const jsAssetDatum = asset.assetData.find((ad) =>
        ad.path.endsWith(".js")
      );
      if (!jsAssetDatum) {
        return null;
      }

      const url = new URL(jsAssetDatum.path, "http://images.neopets.com");
      return url.toString();
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
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return { id: String(rows[0].parent_id) };
    },
  },

  Query: {
    numAppearanceLayersConverted: async (
      _,
      { type },
      { swfAssetCountLoader }
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

async function loadAndCacheAssetManifest(db, layer) {
  let manifest;
  try {
    manifest = await loadAssetManifest(layer.url);
  } catch (e) {
    console.error(
      new Error("Error loading asset manifest, caused by the error below")
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

  const [
    result,
  ] = await db.execute(
    `UPDATE swf_assets SET manifest = ? WHERE id = ? LIMIT 1;`,
    [manifestJson, layer.id]
  );
  if (result.affectedRows !== 1) {
    throw new Error(
      `Expected to affect 1 asset, but affected ${result.affectedRows}`
    );
  }
  console.log(
    `Loaded and saved manifest for ${layer.type} ${layer.remoteId}. ` +
      `DTI ID: ${layer.id}. Exists?: ${Boolean(manifest)}`
  );

  return manifest;
}

module.exports = { typeDefs, resolvers };
