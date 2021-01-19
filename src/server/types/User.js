const { gql } = require("apollo-server");

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    contactNeopetsUsername: String

    closetLists: [ClosetList!]!

    itemsTheyOwn: [Item!]!
    itemsTheyWant: [Item!]!

    # These items represent potential trade matches. We use this as a preview
    # in the trade list table.
    itemsTheyOwnThatCurrentUserWants: [Item!]!
    itemsTheyWantThatCurrentUserOwns: [Item!]!

    # When this user last updated any of their trade lists, as an ISO 8601
    # timestamp.
    lastTradeActivity: String!

    # This user's outfits. Returns an empty list if the current user is not
    # authorized to see them.
    outfits: [Outfit!]!
  }

  extend type Query {
    user(id: ID!): User
    userByName(name: String!): User
    userByEmail(email: String!, supportSecret: String!): User
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
      if (!neopetsConnection) {
        return null;
      }

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

    itemsTheyOwnThatCurrentUserWants: async (
      { id: publicUserId },
      _,
      { currentUserId, tradeMatchesLoader }
    ) => {
      if (!currentUserId) {
        return [];
      }

      const itemIds = await tradeMatchesLoader.load({
        publicUserId,
        currentUserId,
        direction: "public-owns-current-wants",
      });
      return itemIds.map((id) => ({ id }));
    },
    itemsTheyWantThatCurrentUserOwns: async (
      { id: publicUserId },
      _,
      { currentUserId, tradeMatchesLoader }
    ) => {
      if (!currentUserId) {
        return [];
      }

      const itemIds = await tradeMatchesLoader.load({
        publicUserId,
        currentUserId,
        direction: "public-wants-current-owns",
      });
      return itemIds.map((id) => ({ id }));
    },

    closetLists: async (
      { id },
      _,
      {
        currentUserId,
        userLoader,
        userClosetListsLoader,
        userClosetHangersLoader,
      }
    ) => {
      const isCurrentUser = currentUserId === id;
      const [allClosetHangers, closetLists, user] = await Promise.all([
        userClosetHangersLoader.load(id),
        userClosetListsLoader.load(id),
        userLoader.load(id),
      ]);

      const hangersByList = new Map(closetLists.map((l) => [l.id, []]));
      const defaultListOwnedHangers = [];
      const defaultListWantedHangers = [];
      for (const hanger of allClosetHangers) {
        if (hanger.listId) {
          hangersByList.get(hanger.listId).push(hanger);
        } else if (hanger.owned) {
          defaultListOwnedHangers.push(hanger);
        } else {
          defaultListWantedHangers.push(hanger);
        }
      }

      const closetListNodes = closetLists
        .filter((closetList) => isCurrentUser || closetList.visibility >= 1)
        .map((closetList) => ({
          id: closetList.id,
          items: hangersByList
            .get(closetList.id)
            .map((h) => ({ id: h.itemId })),
        }));

      if (isCurrentUser || user.ownedClosetHangersVisibility >= 1) {
        closetListNodes.push({
          isDefaultList: true,
          userId: id,
          ownsOrWantsItems: "OWNS",
          items: defaultListOwnedHangers.map((h) => ({ id: h.itemId })),
        });
      }

      if (isCurrentUser || user.wantedClosetHangersVisibility >= 1) {
        closetListNodes.push({
          isDefaultList: true,
          userId: id,
          ownsOrWantsItems: "WANTS",
          isDefaultList: true,
          items: defaultListWantedHangers.map((h) => ({ id: h.itemId })),
        });
      }

      return closetListNodes;
    },

    lastTradeActivity: async ({ id }, _, { userLastTradeActivityLoader }) => {
      const lastTradeActivity = await userLastTradeActivityLoader.load(id);
      return lastTradeActivity.toISOString();
    },

    outfits: async ({ id }, _, { currentUserId, userOutfitsLoader }) => {
      if (currentUserId !== id) {
        return [];
      }

      const outfits = await userOutfitsLoader.load(id);
      return outfits.map((outfit) => ({ id: outfit.id }));
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

    userByName: async (_, { name }, { userByNameLoader }) => {
      const user = await userByNameLoader.load(name);
      if (!user) {
        return null;
      }

      return { id: user.id };
    },

    userByEmail: async (_, { email, supportSecret }, { userByEmailLoader }) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const user = await userByEmailLoader.load(email);
      if (!user) {
        return null;
      }

      return { id: user.id };
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
