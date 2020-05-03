const { gql } = require("apollo-server");

const connectToDb = require("./db");
const buildLoaders = require("./loaders");
const neopets = require("./neopets");
const { capitalize, getEmotion, getGenderPresentation } = require("./util");

const typeDefs = gql`
  enum LayerImageSize {
    SIZE_600
    SIZE_300
    SIZE_150
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
    genderPresentation: GenderPresentation
    emotion: Emotion
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
    items: [Item!]!
  }

  type Query {
    allColors: [Color!]!
    allSpecies: [Species!]!
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
    petAppearance(
      speciesId: ID!
      colorId: ID!
      emotion: Emotion!
      genderPresentation: GenderPresentation!
    ): PetAppearance
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
      const swfAssets = await itemSwfAssetLoader.load({
        itemId: item.id,
        bodyId: petType.bodyId,
      });

      if (swfAssets.length === 0) {
        return null;
      }

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
      const emotion = getEmotion(petState.moodId);
      const genderPresentation = getGenderPresentation(petState.female);
      return `${speciesId}-${colorId}-${emotion}-${genderPresentation}`;
    },
    petStateId: ({ petState }) => petState.id,
    genderPresentation: ({ petState }) =>
      getGenderPresentation(petState.female),
    emotion: ({ petState }) => getEmotion(petState.moodId),
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
      { speciesId, colorId, emotion, genderPresentation },
      { petTypeLoader, petStateLoader }
    ) => {
      const petType = await petTypeLoader.load({
        speciesId,
        colorId,
      });

      const petStates = await petStateLoader.load(petType.id);
      // TODO: This could be optimized into the query condition 🤔
      const petState = petStates.find(
        (ps) =>
          getEmotion(ps.moodId) === emotion &&
          getGenderPresentation(ps.female) === genderPresentation
      );
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
      const petData = await neopets.loadPetData(petName);
      const outfit = {
        species: { id: petData.custom_pet.species_id },
        color: { id: petData.custom_pet.color_id },
        items: Object.values(petData.object_info_registry).map((o) => ({
          id: o.obj_info_id,
        })),
      };
      return outfit;
    },
  },
};

const config = {
  typeDefs,
  resolvers,
  context: async () => {
    const db = await connectToDb();
    return {
      ...buildLoaders(db),
    };
  },

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
