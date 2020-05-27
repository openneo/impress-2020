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
    appearanceOn(speciesId: ID!, colorId: ID!): ItemAppearance
  }

  type PetAppearance {
    id: ID!
    petStateId: ID!
    bodyId: ID!
    pose: Pose!
    genderPresentation: GenderPresentation # deprecated
    emotion: Emotion # deprecated
    approximateThumbnailUrl: String!
    layers: [AppearanceLayer!]!
  }

  type ItemAppearance {
    layers: [AppearanceLayer!]!
    restrictedZones: [Zone!]!
  }

  type AppearanceLayer {
    id: ID!
    zone: Zone!
    imageUrl(size: LayerImageSize): String

    """
    This layer as a single SVG, if available.

    This might not be available if the asset isn't converted yet by Neopets,
    or if it's not as simple as a single SVG (e.g. animated).
    """
    svgUrl: String
  }

  type Zone {
    id: ID!
    depth: Int!
    label: String!
  }

  type ItemSearchResult {
    query: String!
    items: [Item!]!
  }

  type Color {
    id: ID!
    name: String!
  }

  type Species {
    id: ID!
    name: String!
  }

  type SpeciesColorPair {
    species: Species!
    color: Color!
  }

  type Outfit {
    species: Species!
    color: Color!
    pose: Pose!
    items: [Item!]!
  }

  type Query {
    allColors: [Color!]! @cacheControl(maxAge: 10800) # Cache for 3 hours
    allSpecies: [Species!]! @cacheControl(maxAge: 10800) # Cache for 3 hours
    allValidSpeciesColorPairs: [SpeciesColorPair!]! # deprecated
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
    petAppearances(speciesId: ID!, colorId: ID!): [PetAppearance!]!

    petOnNeopetsDotCom(petName: String!): Outfit
  }
`;

const resolvers = {
  Item: {
    name: async (item, _, { itemTranslationLoader }) => {
      // Search queries pre-fill this!
      if (item.name) return item.name;

      const translation = await itemTranslationLoader.load(item.id);
      return translation.name;
    },
    description: async (item, _, { itemTranslationLoader }) => {
      const translation = await itemTranslationLoader.load(item.id);
      return translation.description;
    },
    appearanceOn: async (
      item,
      { speciesId, colorId },
      { petTypeLoader, itemSwfAssetLoader }
    ) => {
      const petType = await petTypeLoader.load({
        speciesId: speciesId,
        colorId: colorId,
      });
      const allSwfAssets = await itemSwfAssetLoader.load({
        itemId: item.id,
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
      for (const [i, bit] of Array.from(item.zonesRestrict).entries()) {
        if (bit === "1") {
          const zone = { id: i + 1 };
          restrictedZones.push(zone);
        }
      }

      return { layers: swfAssets, restrictedZones };
    },
  },
  PetAppearance: {
    id: ({ petType, petState }) => {
      const { speciesId, colorId } = petType;
      const pose = getPoseFromPetState(petState);
      return `${speciesId}-${colorId}-${pose}`;
    },
    petStateId: ({ petState }) => petState.id,
    bodyId: ({ petType }) => petType.bodyId,
    pose: ({ petState }) => getPoseFromPetState(petState),
    genderPresentation: ({ petState }) =>
      getGenderPresentation(getPoseFromPetState(petState)),
    emotion: ({ petState }) => getEmotion(getPoseFromPetState(petState)),
    approximateThumbnailUrl: ({ petType, petState }) => {
      return `http://pets.neopets.com/cp/${petType.basicImageHash}/${petState.moodId}/1.png`;
    },
    layers: async ({ petState }, _, { petSwfAssetLoader }) => {
      const swfAssets = await petSwfAssetLoader.load(petState.id);
      return swfAssets;
    },
  },
  AppearanceLayer: {
    zone: async (layer, _, { zoneLoader }) => {
      const zone = await zoneLoader.load(layer.zoneId);
      return zone;
    },
    imageUrl: (layer, { size }) => {
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
    svgUrl: async (layer, _, { svgLogger }) => {
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
  },
  Zone: {
    label: async (zone, _, { zoneTranslationLoader }) => {
      const zoneTranslation = await zoneTranslationLoader.load(zone.id);
      return zoneTranslation.label;
    },
  },
  Color: {
    name: async (color, _, { colorTranslationLoader }) => {
      const colorTranslation = await colorTranslationLoader.load(color.id);
      return capitalize(colorTranslation.name);
    },
  },
  Species: {
    name: async (species, _, { speciesTranslationLoader }) => {
      const speciesTranslation = await speciesTranslationLoader.load(
        species.id
      );
      return capitalize(speciesTranslation.name);
    },
  },
  Query: {
    allColors: async (_, { ids }, { loadAllColors }) => {
      const allColors = await loadAllColors();
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
    items: async (_, { ids }, { itemLoader }) => {
      const items = await itemLoader.loadMany(ids);
      return items;
    },
    itemSearch: async (_, { query }, { itemSearchLoader }) => {
      const items = await itemSearchLoader.load(query);
      return { query, items };
    },
    itemSearchToFit: async (
      _,
      { query, speciesId, colorId, offset, limit },
      { petTypeLoader, itemSearchToFitLoader }
    ) => {
      const petType = await petTypeLoader.load({ speciesId, colorId });
      const { bodyId } = petType;
      const items = await itemSearchToFitLoader.load({
        query,
        bodyId,
        offset,
        limit,
      });
      return { query, items };
    },
    petAppearance: async (
      _,
      { speciesId, colorId, pose },
      { petTypeLoader, petStateLoader }
    ) => {
      const petType = await petTypeLoader.load({
        speciesId,
        colorId,
      });

      const petStates = await petStateLoader.load(petType.id);
      // TODO: This could be optimized into the query condition 🤔
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (!petState) {
        return null;
      }

      return { petType, petState };
    },
    petAppearances: async (
      _,
      { speciesId, colorId },
      { petTypeLoader, petStateLoader }
    ) => {
      const petType = await petTypeLoader.load({
        speciesId,
        colorId,
      });
      const petStates = await petStateLoader.load(petType.id);
      return petStates.map((petState) => ({ petType, petState }));
    },
    petOnNeopetsDotCom: async (_, { petName }) => {
      const [petMetaData, customPetData] = await Promise.all([
        neopets.loadPetMetaData(petName),
        neopets.loadCustomPetData(petName),
      ]);
      const outfit = {
        species: { id: customPetData.custom_pet.species_id },
        color: { id: customPetData.custom_pet.color_id },
        pose: getPoseFromPetData(petMetaData, customPetData),
        items: Object.values(customPetData.object_info_registry).map((o) => ({
          id: o.obj_info_id,
        })),
      };
      return outfit;
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
