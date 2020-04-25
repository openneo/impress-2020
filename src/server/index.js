const { gql } = require("apollo-server");

const connectToDb = require("./db");
const buildLoaders = require("./loaders");

const typeDefs = gql`
  enum LayerImageSize {
    SIZE_600
    SIZE_300
    SIZE_150
  }

  type Item {
    id: ID!
    name: String!
    thumbnailUrl: String!
    appearanceOn(speciesId: ID!, colorId: ID!): Appearance
  }

  type Appearance {
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

  type Query {
    items(ids: [ID!]!): [Item!]!
    itemSearch(query: String!): [Item!]!
    itemSearchToFit(query: String!, speciesId: ID!, colorId: ID!): [Item!]!
    petAppearance(speciesId: ID!, colorId: ID!): Appearance
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
  Query: {
    items: async (_, { ids }, { itemLoader }) => {
      const items = await itemLoader.loadMany(ids);
      return items;
    },
    itemSearch: async (_, { query }, { itemSearchLoader }) => {
      const items = await itemSearchLoader.load(query);
      return items;
    },
    itemSearchToFit: async (
      _,
      { query, speciesId, colorId },
      { petTypeLoader, itemSearchToFitLoader }
    ) => {
      const petType = await petTypeLoader.load({ speciesId, colorId });
      const { bodyId } = petType;
      const items = await itemSearchToFitLoader.load({ query, bodyId });
      return items;
    },
    petAppearance: async (
      _,
      { speciesId, colorId },
      { petTypeLoader, petStateLoader, petSwfAssetLoader }
    ) => {
      const petType = await petTypeLoader.load({
        speciesId,
        colorId,
      });
      const petStates = await petStateLoader.load(petType.id);
      const petState = petStates[0]; // TODO
      const swfAssets = await petSwfAssetLoader.load(petState.id);
      return { layers: swfAssets, restrictedZones: [] };
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
