const { gql } = require("apollo-server");

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    itemsTheyOwn: [Item!]!
  }

  extend type Query {
    user(id: ID!): User
    currentUser: User
  }
`;

const resolvers = {
  User: {
    username: async ({ id }, _, { userLoader }) => {
      const user = await userLoader.load(id);
      return user.name;
    },
    itemsTheyOwn: async (
      { id },
      _,
      { currentUserId, userLoader, userOwnedClosetHangersLoader }
    ) => {
      const user = await userLoader.load(id);
      const hangersAreVisible =
        user.ownedClosetHangersVisibility >= 2 || user.id === currentUserId;
      if (!hangersAreVisible) {
        return [];
      }

      const allClosetHangers = await userOwnedClosetHangersLoader.load(id);
      const closetHangersWithNoList = allClosetHangers.filter(
        (h) => h.listId == null
      );

      const items = closetHangersWithNoList.map((h) => ({
        id: h.itemId,
        // We get this for the ORDER BY clause anyway - may as well include it
        // here to avoid an extra lookup!
        name: h.itemName,
      }));
      return items;
    },
  },

  Query: {
    user: async (_, { id }, { userLoader }) => {
      try {
        await userLoader.load(id);
      } catch (e) {
        if (e.message.includes("could not find user")) {
          return null;
        } else {
          throw e;
        }
      }

      return { id };
    },
    currentUser: async (_, __, { currentUserId, userLoader }) => {
      if (currentUserId == null) {
        return null;
      }

      try {
        await userLoader.load(currentUserId);
      } catch (e) {
        if (e.message.includes("could not find user")) {
          return null;
        } else {
          throw e;
        }
      }

      return { id: currentUserId };
    },
  },
};

module.exports = { typeDefs, resolvers };