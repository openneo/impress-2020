const { gql } = require("apollo-server");

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    contactNeopetsUsername: String
    itemsTheyOwn: [Item!]!
    itemsTheyWant: [Item!]!
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

    contactNeopetsUsername: async (
      { id },
      _,
      { userLoader, neopetsConnectionLoader }
    ) => {
      const user = await userLoader.load(id);
      if (user.contactNeopetsConnectionId == null) {
        return null;
      }

      const neopetsConnection = await neopetsConnectionLoader.load(
        user.contactNeopetsConnectionId
      );
      return neopetsConnection.neopetsUsername;
    },

    itemsTheyOwn: async (
      { id },
      _,
      {
        currentUserId,
        userClosetListsLoader,
        userLoader,
        userClosetHangersLoader,
      }
    ) => {
      const [allClosetHangers, closetLists, user] = await Promise.all([
        userClosetHangersLoader.load(id),
        userClosetListsLoader.load(id),
        userLoader.load(id),
      ]);

      const closetListsById = new Map(closetLists.map((l) => [l.id, l]));

      const visibleClosetHangers = allClosetHangers
        .filter((h) => h.owned)
        .filter(
          (h) =>
            user.id === currentUserId ||
            (h.listId == null && user.ownedClosetHangersVisibility >= 1) ||
            (h.listId != null && closetListsById.get(h.listId).visibility >= 1)
        );

      const items = visibleClosetHangers.map((h) => ({
        id: h.itemId,
        // We get this for the ORDER BY clause anyway - may as well include it
        // here to avoid an extra lookup!
        name: h.itemName,
      }));
      return items;
    },

    itemsTheyWant: async (
      { id },
      _,
      {
        currentUserId,
        userClosetListsLoader,
        userLoader,
        userClosetHangersLoader,
      }
    ) => {
      const [allClosetHangers, closetLists, user] = await Promise.all([
        userClosetHangersLoader.load(id),
        userClosetListsLoader.load(id),
        userLoader.load(id),
      ]);

      const closetListsById = new Map(closetLists.map((l) => [l.id, l]));

      const visibleClosetHangers = allClosetHangers
        .filter((h) => !h.owned)
        .filter(
          (h) =>
            user.id === currentUserId ||
            (h.listId == null && user.wantedClosetHangersVisibility >= 1) ||
            (h.listId != null && closetListsById.get(h.listId).visibility >= 1)
        );

      const items = visibleClosetHangers.map((h) => ({
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
