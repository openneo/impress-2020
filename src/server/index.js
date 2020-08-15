const { gql } = require("apollo-server");

const connectToDb = require("./db");
const buildLoaders = require("./loaders");
const neopets = require("./neopets");
const {
  capitalize,
  getPoseFromPetState,
  getPoseFromPetData,
  getEmotion,
  getGenderPresentation,
} = require("./util");

const typeDefs = gql`
  enum LayerImageSize {
    SIZE_600
    SIZE_300
    SIZE_150
  }

  """
  The poses a PetAppearance can take!
  """
  enum Pose {
    HAPPY_MASC
    SAD_MASC
    SICK_MASC
    HAPPY_FEM
    SAD_FEM
    SICK_FEM
    UNCONVERTED
    UNKNOWN # for when we have the data, but we don't know what it is
  }

  """
  A pet's gender presentation: masculine or feminine.

  Neopets calls these "male" and "female", and I think that's silly and not wise
  to propagate further, especially in the context of a strictly visual app like
  Dress to Impress! This description isn't altogether correct either, but idk
  what's better :/
  """
  enum GenderPresentation {
    MASCULINE
    FEMININE
  }

  """
  A pet's emotion: happy, sad, or sick.

  Note that we don't ever show the angry emotion on Dress to Impress, because
  we don't have the data: it's impossible for a pet's passive emotion on the
  pet lookup to be angry!
  """
  enum Emotion {
    HAPPY
    SAD
    SICK
  }

  type Item {
    id: ID!
    name: String!
    description: String!
    thumbnailUrl: String!
    rarityIndex: Int!
    isNc: Boolean!
    appearanceOn(speciesId: ID!, colorId: ID!): ItemAppearance

    # This is set manually by Support users, when the pet is only for e.g.
    # Maraquan pets, and our usual auto-detection isn't working. We provide
    # this for the Support UI; it's not very helpful for most users, because it
    # can be empty even if the item _has_ an auto-detected special color.
    manualSpecialColor: Color

    # This is set manually by Support users, when the item _seems_ to fit all
    # pets the same because of its zones, but it actually doesn't - e.g.,
    # the Dug Up Dirt Foreground actually looks different for each body. We
    # provide this for the Support UI; it's not very helpful for most users,
    # because it's only used at modeling time. This value does not change how
    # layer data from this API should be interpreted!
    explicitlyBodySpecific: Boolean!
  }

  # Cache for 1 week (unlikely to change)
  type PetAppearance @cacheControl(maxAge: 604800) {
    id: ID!
    species: Species!
    color: Color!
    pose: Pose!
    bodyId: ID!

    layers: [AppearanceLayer!]!
    petStateId: ID! # Convenience field for developers
  }

  type ItemAppearance {
    layers: [AppearanceLayer!]!
    restrictedZones: [Zone!]!
  }

  # Cache for 1 week (unlikely to change)
  type AppearanceLayer @cacheControl(maxAge: 604800) {
    id: ID!
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
    This layer can fit on PetAppearances with the same bodyId. "0" is a
    special body ID that indicates it fits all PetAppearances.
    """
    bodyId: ID!

    """
    The item this layer is for, if any. (For pet layers, this is null.)
    """
    item: Item
  }

  # Cache for 1 week (unlikely to change)
  type Zone @cacheControl(maxAge: 604800) {
    id: ID!
    depth: Int!
    label: String!
  }

  type ItemSearchResult {
    query: String!
    items: [Item!]!
  }

  # Cache for 1 week (unlikely to change)
  type Color @cacheControl(maxAge: 604800) {
    id: ID!
    name: String!
    isStandard: Boolean!
  }

  # Cache for 1 week (unlikely to change)
  type Species @cacheControl(maxAge: 604800) {
    id: ID!
    name: String!
  }

  type SpeciesColorPair {
    species: Species!
    color: Color!
  }

  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!

    species: Species! # to be deprecated? can use petAppearance? 🤔
    color: Color! # to be deprecated? can use petAppearance? 🤔
    pose: Pose! # to be deprecated? can use petAppearance? 🤔
    items: [Item!]! # deprecated alias for wornItems
  }

  type Query {
    allColors: [Color!]! @cacheControl(maxAge: 10800) # Cache for 3 hours (we might add more!)
    allSpecies: [Species!]! @cacheControl(maxAge: 10800) # Cache for 3 hours (we might add more!)
    allValidSpeciesColorPairs: [SpeciesColorPair!]! # deprecated
    item(id: ID!): Item
    items(ids: [ID!]!): [Item!]!
    itemSearch(query: String!): ItemSearchResult!
    itemSearchToFit(
      query: String!
      speciesId: ID!
      colorId: ID!
      offset: Int
      limit: Int
    ): ItemSearchResult!
    petAppearance(speciesId: ID!, colorId: ID!, pose: Pose!): PetAppearance
      @cacheControl(maxAge: 604800) # Cache for 1 week (unlikely to change)
    petAppearances(speciesId: ID!, colorId: ID!): [PetAppearance!]!
      @cacheControl(maxAge: 10800) # Cache for 3 hours (we might add more!)
    outfit(id: ID!): Outfit

    petOnNeopetsDotCom(petName: String!): Outfit
  }

  type Mutation {
    setManualSpecialColor(
      itemId: ID!
      colorId: ID
      supportSecret: String!
    ): Item!

    setItemExplicitlyBodySpecific(
      itemId: ID!
      explicitlyBodySpecific: Boolean!
      supportSecret: String!
    ): Item!

    setLayerBodyId(
      layerId: ID!
      bodyId: ID!
      supportSecret: String!
    ): AppearanceLayer!
  }
`;

const resolvers = {
  Item: {
    name: async ({ id, name }, _, { itemTranslationLoader }) => {
      if (name) return name;
      const translation = await itemTranslationLoader.load(id);
      return translation.name;
    },
    description: async ({ id, description }, _, { itemTranslationLoader }) => {
      if (description) return description;
      const translation = await itemTranslationLoader.load(id);
      return translation.description;
    },
    thumbnailUrl: async ({ id, thumbnailUrl }, _, { itemLoader }) => {
      if (thumbnailUrl) return thumbnailUrl;
      const item = await itemLoader.load(id);
      return item.thumbnailUrl;
    },
    rarityIndex: async ({ id, rarityIndex }, _, { itemLoader }) => {
      if (rarityIndex) return rarityIndex;
      const item = await itemLoader.load(id);
      return item.rarityIndex;
    },
    isNc: async ({ id, rarityIndex }, _, { itemLoader }) => {
      if (rarityIndex != null) return rarityIndex === 500 || rarityIndex === 0;
      const item = await itemLoader.load(id);
      return item.rarityIndex === 500 || item.rarityIndex === 0;
    },
    appearanceOn: async (
      { id },
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader, itemSwfAssetLoader, itemLoader }
    ) => {
      const itemPromise = itemLoader.load(id);
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: speciesId,
        colorId: colorId,
      });
      const allSwfAssets = await itemSwfAssetLoader.load({
        itemId: id,
        bodyId: petType.bodyId,
      });

      if (allSwfAssets.length === 0) {
        // If there's no assets at all, treat it as non-fitting: no appearance.
        // (If there are assets but they're non-SWF, we'll treat this as
        // fitting, but with an *empty* appearance.)
        return null;
      }

      const swfAssets = allSwfAssets.filter((sa) => sa.url.endsWith(".swf"));

      const restrictedZones = [];
      const item = await itemPromise;
      for (const [i, bit] of Array.from(item.zonesRestrict).entries()) {
        if (bit === "1") {
          const zone = { id: i + 1 };
          restrictedZones.push(zone);
        }
      }

      return { layers: swfAssets, restrictedZones };
    },
    manualSpecialColor: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.manualSpecialColorId != null
        ? { id: item.manualSpecialColorId }
        : null;
    },
    explicitlyBodySpecific: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.explicitlyBodySpecific;
    },
  },
  PetAppearance: {
    id: async ({ petStateId }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(petStateId);
      const petType = await petTypeLoader.load(petState.petTypeId);
      const pose = getPoseFromPetState(petState);
      return `${petType.speciesId}-${petType.colorId}-${pose}`;
    },
    color: async ({ petStateId }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(petStateId);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.colorId };
    },
    species: async ({ petStateId }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(petStateId);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.speciesId };
    },
    bodyId: async ({ petStateId }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(petStateId);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return petType.bodyId;
    },
    pose: async ({ petStateId }, _, { petStateLoader }) => {
      const petState = await petStateLoader.load(petStateId);
      return getPoseFromPetState(petState);
    },
    layers: async ({ petStateId }, _, { petSwfAssetLoader }) => {
      const swfAssets = await petSwfAssetLoader.load(petStateId);
      return swfAssets;
    },
  },
  AppearanceLayer: {
    bodyId: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.bodyId;
    },
    zone: async ({ id }, _, { swfAssetLoader, zoneLoader }) => {
      const layer = await swfAssetLoader.load(id);
      const zone = await zoneLoader.load(layer.zoneId);
      return zone;
    },
    swfUrl: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.url;
    },
    imageUrl: async ({ id }, { size }, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

      if (!layer.hasImage) {
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
    svgUrl: async ({ id }, _, { swfAssetLoader, svgLogger }) => {
      const layer = await swfAssetLoader.load(id);

      const manifest = await neopets.loadAssetManifest(layer.url);
      if (!manifest) {
        svgLogger.log("no-manifest");
        return null;
      }

      if (manifest.assets.length !== 1) {
        svgLogger.log(`wrong-asset-count:${manifest.assets.length}!=1`);
        return null;
      }

      const asset = manifest.assets[0];
      if (asset.format !== "vector") {
        svgLogger.log(`wrong-asset-format:${asset.format}`);
        return null;
      }

      if (asset.assetData.length !== 1) {
        svgLogger.log(`wrong-assetData-length:${asset.assetData.length}!=1`);
        return null;
      }

      svgLogger.log("success");
      const assetDatum = asset.assetData[0];
      const url = new URL(assetDatum.path, "http://images.neopets.com");
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
  Zone: {
    depth: async ({ id }, _, { zoneLoader }) => {
      // TODO: Should we extend this loader-in-field pattern elsewhere? I like
      //       that we avoid the fetch in cases where we only want the zone ID,
      //       but it adds complexity 🤔
      const zone = await zoneLoader.load(id);
      return zone.depth;
    },
    label: async ({ id }, _, { zoneTranslationLoader }) => {
      const zoneTranslation = await zoneTranslationLoader.load(id);
      return zoneTranslation.label;
    },
  },
  Color: {
    name: async ({ id }, _, { colorTranslationLoader }) => {
      const colorTranslation = await colorTranslationLoader.load(id);
      return capitalize(colorTranslation.name);
    },
    isStandard: async ({ id }, _, { colorLoader }) => {
      const color = await colorLoader.load(id);
      return color.standard ? true : false;
    },
  },
  Species: {
    name: async ({ id }, _, { speciesTranslationLoader }) => {
      const speciesTranslation = await speciesTranslationLoader.load(id);
      return capitalize(speciesTranslation.name);
    },
  },
  Outfit: {
    name: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.name;
    },
    petAppearance: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return { petStateId: outfit.petStateId };
    },
    wornItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
    closetedItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => !oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
  },
  Query: {
    allColors: async (_, { ids }, { colorLoader }) => {
      const allColors = await colorLoader.loadAll();
      return allColors;
    },
    allSpecies: async (_, { ids }, { loadAllSpecies }) => {
      const allSpecies = await loadAllSpecies();
      return allSpecies;
    },
    allValidSpeciesColorPairs: async (_, __, { loadAllPetTypes }) => {
      const allPetTypes = await loadAllPetTypes();
      const allPairs = allPetTypes.map((pt) => ({
        color: { id: pt.colorId },
        species: { id: pt.speciesId },
      }));
      return allPairs;
    },
    item: (_, { id }) => ({ id }),
    items: (_, { ids }) => {
      return ids.map((id) => ({ id }));
    },
    itemSearch: async (_, { query }, { itemSearchLoader }) => {
      const items = await itemSearchLoader.load(query.trim());
      return { query, items };
    },
    itemSearchToFit: async (
      _,
      { query, speciesId, colorId, offset, limit },
      { petTypeBySpeciesAndColorLoader, itemSearchToFitLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      const { bodyId } = petType;
      const items = await itemSearchToFitLoader.load({
        query: query.trim(),
        bodyId,
        offset,
        limit,
      });
      return { query, items };
    },
    petAppearance: async (
      _,
      { speciesId, colorId, pose },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });

      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      // TODO: This could be optimized into the query condition 🤔
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (!petState) {
        return null;
      }

      return { petStateId: petState.id };
    },
    petAppearances: async (
      _,
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      petStates.sort((a, b) => a.id - b.id);
      return petStates.map((petState) => ({ petStateId: petState.id }));
    },
    outfit: (_, { id }) => ({ id }),
    petOnNeopetsDotCom: async (_, { petName }) => {
      const [petMetaData, customPetData] = await Promise.all([
        neopets.loadPetMetaData(petName),
        neopets.loadCustomPetData(petName),
      ]);
      const outfit = {
        // TODO: This isn't a fully-working Outfit object. It works for the
        //       client as currently implemented, but we'll probably want to
        //       move the client and this onto our more generic fields!
        species: { id: customPetData.custom_pet.species_id },
        color: { id: customPetData.custom_pet.color_id },
        pose: getPoseFromPetData(petMetaData, customPetData),
        items: Object.values(customPetData.object_info_registry).map((o) => ({
          id: o.obj_info_id,
          name: o.name,
          description: o.description,
          thumbnailUrl: o.thumbnail_url,
          rarityIndex: o.rarity_index,
        })),
      };
      return outfit;
    },
  },
  Mutation: {
    setManualSpecialColor: async (
      _,
      { itemId, colorId, supportSecret },
      { db }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const [
        result,
      ] = await db.execute(
        `UPDATE items SET manual_special_color_id = ? WHERE id = ? LIMIT 1`,
        [colorId, itemId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 item, but affected ${result.affectedRows}`
        );
      }

      return { id: itemId };
    },

    setItemExplicitlyBodySpecific: async (
      _,
      { itemId, explicitlyBodySpecific, supportSecret },
      { db }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const [
        result,
      ] = await db.execute(
        `UPDATE items SET explicitly_body_specific = ? WHERE id = ? LIMIT 1`,
        [explicitlyBodySpecific ? 1 : 0, itemId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 item, but affected ${result.affectedRows}`
        );
      }

      return { id: itemId };
    },

    setLayerBodyId: async (_, { layerId, bodyId, supportSecret }, { db }) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const [
        result,
      ] = await db.execute(
        `UPDATE swf_assets SET body_id = ? WHERE id = ? LIMIT 1`,
        [bodyId, layerId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 layer, but affected ${result.affectedRows}`
        );
      }

      return { id: layerId };
    },
  },
};

let lastSvgLogger = null;
const svgLogging = {
  requestDidStart() {
    return {
      willSendResponse({ operationName }) {
        const logEntries = lastSvgLogger.entries;
        if (logEntries.length === 0) {
          return;
        }

        console.log(`[svgLogger] Operation: ${operationName}`);

        const logEntryCounts = {};
        for (const logEntry of logEntries) {
          logEntryCounts[logEntry] = (logEntryCounts[logEntry] || 0) + 1;
        }

        const logEntriesSortedByCount = Object.entries(logEntryCounts).sort(
          (a, b) => b[1] - a[1]
        );
        for (const [logEntry, count] of logEntriesSortedByCount) {
          console.log(`[svgLogger] - ${logEntry}: ${count}`);
        }
      },
    };
  },
};

const config = {
  typeDefs,
  resolvers,
  context: async () => {
    const db = await connectToDb();

    const svgLogger = {
      entries: [],
      log(entry) {
        this.entries.push(entry);
      },
    };
    lastSvgLogger = svgLogger;

    return {
      svgLogger,
      db,
      ...buildLoaders(db),
    };
  },

  plugins: [svgLogging],

  // Enable Playground in production :)
  introspection: true,
  playground: {
    endpoint: "/api/graphql",
  },
};

if (require.main === module) {
  const { ApolloServer } = require("apollo-server");
  const server = new ApolloServer(config);
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
