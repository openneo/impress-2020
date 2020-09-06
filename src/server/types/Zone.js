const { gql } = require("apollo-server");

const typeDefs = gql`
  # Cache for 1 week (unlikely to change)
  type Zone @cacheControl(maxAge: 604800) {
    id: ID!
    depth: Int!
    label: String!
    isCommonlyUsedByItems: Boolean!
  }

  extend type Query {
    allZones: [Zone!]!
  }
`;

const resolvers = {
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
    isCommonlyUsedByItems: async ({ id }, _, { zoneLoader }) => {
      // Zone metadata marks item zones with types 2, 3, and 4. But also, in
      // practice, the Biology Effects zone (type 1) has been used for a few
      // items too. So, that's what we return true for!
      const zone = await zoneLoader.load(id);
      const isMarkedForItems = ["2", "3", "4"].includes(zone.typeId);
      const isBiologyEffects = zone.id === "4";
      return isMarkedForItems || isBiologyEffects;
    },
  },

  Query: {
    allZones: async (_, __, { zoneLoader }) => {
      const zones = await zoneLoader.loadAll();
      return zones.map(({ id }) => ({ id }));
    },
  },
};

module.exports = { typeDefs, resolvers };
