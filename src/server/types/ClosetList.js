const { gql } = require("apollo-server");

const typeDefs = gql`
  enum OwnsOrWants {
    OWNS
    WANTS
  }

  type ClosetList {
    id: ID!
    name: String

    # A user-customized description. May contain Markdown and limited HTML.
    description: String

    # Whether this is a list of items they own, or items they want.
    ownsOrWantsItems: OwnsOrWants!

    # Each user has a "default list" of items they own/want. When users click
    # the Own/Want button on the item page, items go here automatically. (On
    # the backend, this is managed as the hangers having a null list ID.)
    #
    # This field is true if the list is the default list, so we can style it
    # differently and change certain behaviors (e.g. can't be deleted).
    isDefaultList: Boolean!

    items: [Item!]!
  }
`;

const resolvers = {
  ClosetList: {
    id: ({ id, isDefaultList, userId, ownsOrWantsItems }) => {
      if (isDefaultList) {
        return `user-${userId}-default-list-${ownsOrWantsItems}`;
      }

      return id;
    },

    name: async ({ id, isDefaultList }, _, { closetListLoader }) => {
      if (isDefaultList) {
        return "Not in a list";
      }

      const list = await closetListLoader.load(id);
      return list.name;
    },

    description: async ({ id, isDefaultList }, _, { closetListLoader }) => {
      if (isDefaultList) {
        return null;
      }

      const list = await closetListLoader.load(id);
      return list.description;
    },

    ownsOrWantsItems: async (
      { id, isDefaultList, ownsOrWantsItems },
      _,
      { closetListLoader }
    ) => {
      if (isDefaultList) {
        return ownsOrWantsItems;
      }

      const list = await closetListLoader.load(id);
      return list.hangersOwned ? "OWNS" : "WANTS";
    },

    isDefaultList: ({ isDefaultList }) => {
      return Boolean(isDefaultList);
    },

    items: ({ items }) => {
      // HACK: When called from User.js, for fetching all of a user's lists at
      //       once, this is provided in the returned object. This was before
      //       we separated out the ClosetList resolvers at all! But I'm not
      //       bothering to port it, because it would mean writing a new
      //       loader, and we don't yet have any endpoints that actually need
      //       this.
      if (items) {
        return items;
      }

      throw new Error(
        `TODO: Not implemented, we still duplicate / bulk-implement some of ` +
          `the list resolver stuff in User.js. Break that out into real ` +
          `ClosetList loaders and resolvers!`
      );
    },
  },
};

module.exports = { typeDefs, resolvers };
