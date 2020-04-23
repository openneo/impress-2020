const { gql } = require("apollo-server");

const connectToDb = require("./db");
const loaders = require("./loaders");

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
    appearanceOn(speciesId: ID!, colorId: ID!): ItemAppearance
  }

  type ItemAppearance {
    layers: [ItemAppearanceLayer!]!
  }

  type ItemAppearanceLayer {
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
  }
`;

const resolvers = {
  Item: {
    name: async (item, _, { itemTranslationLoader }) => {
      const translation = await itemTranslationLoader.load(item.id);
      return translation.name;
    },
    appearanceOn: (item, { speciesId, colorId }) => ({
      itemId: item.id,
      speciesId,
      colorId,
    }),
  },
  ItemAppearance: {
    layers: async (ia, _, { petTypeLoader, swfAssetLoader }) => {
      const petType = await petTypeLoader.load({
        speciesId: ia.speciesId,
        colorId: ia.colorId,
      });
      const swfAssets = await swfAssetLoader.load({
        itemId: ia.itemId,
        bodyId: petType.bodyId,
      });
      return swfAssets;
    },
  },
  ItemAppearanceLayer: {
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

      return `https://impress-asset-images.s3.amazonaws.com/object/${rid1}/${rid2}/${rid3}/${rid}/${sizeNum}x${sizeNum}.png?${time}`;
    },
  },
  Zone: {
    label: async (zone, _, { zoneTranslationLoader }) => {
      const zoneTranslation = await zoneTranslationLoader.load(zone.id);
      return zoneTranslation.label;
    },
  },
  Query: {
    items: async (_, { ids }, { db }) => {
      const items = await loaders.loadItems(db, ids);
      return items;
    },
  },
};

const config = {
  typeDefs,
  resolvers,
  context: async () => {
    const db = await connectToDb();
    return {
      db,
      itemTranslationLoader: loaders.buildItemTranslationLoader(db),
      petTypeLoader: loaders.buildPetTypeLoader(db),
      swfAssetLoader: loaders.buildSwfAssetLoader(db),
      zoneLoader: loaders.buildZoneLoader(db),
      zoneTranslationLoader: loaders.buildZoneTranslationLoader(db),
    };
  },

  // Enable Playground in production :)
  introspection: true,
  playground: true,
};

if (require.main === module) {
  const { ApolloServer } = require("apollo-server");
  const server = new ApolloServer(config);
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
