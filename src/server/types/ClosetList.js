import { gql } from "apollo-server";

import { logToDiscord } from "../util";

const typeDefs = gql`
  enum OwnsOrWants {
    OWNS
    WANTS
  }

  type ClosetList {
    id: ID!
    name: String

    """
    A user-customized description. May contain Markdown and limited HTML.
    WARNING: If you're using this in an application, you MUST ensure that the
             content is rendered safely! Do not render this as HTML unless you
             are confident that you've sanitized it appropriately.
    """
    description: String

    "Whether this is a list of items they own, or items they want."
    ownsOrWantsItems: OwnsOrWants!

    # Each user has a "default list" of items they own/want. When users click
    # the Own/Want button on the item page, items go here automatically. (On
    # the backend, this is managed as the hangers having a null list ID.)
    #
    # This field is true if the list is the default list, so we can style it
    # differently and change certain behaviors (e.g. can't be deleted).
    isDefaultList: Boolean!

    items: [Item!]!

    # The user that created this list.
    creator: User!
  }

  extend type Query {
    # The closet list with the given ID. Will be null if it doesn't exist, or
    # if you're not allowed to see it.
    closetList(id: ID!): ClosetList
  }

  extend type Mutation {
    """
    Edit the metadata of a closet list. Requires the current user to own the
    list, or for the correct supportSecret to be provided.
    """
    editClosetList(
      closetListId: ID!
      name: String!
      description: String!
      supportSecret: String
    ): ClosetList
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

    items: async (
      { isDefaultList, id, userId, ownsOrWantsItems, items: precomputedItems },
      _,
      {
        itemLoader,
        closetHangersForListLoader,
        closetHangersForDefaultListLoader,
      }
    ) => {
      // HACK: When called from User.js, for fetching all of a user's lists at
      //       once, this is provided in the returned object. Just use it!
      // TODO: Might be better to prime the loader with this instead?
      if (precomputedItems) {
        return precomputedItems;
      }

      const closetHangers = isDefaultList
        ? await closetHangersForDefaultListLoader.load({
            userId,
            ownsOrWantsItems,
          })
        : await closetHangersForListLoader.load(id);
      const itemIds = closetHangers.map((h) => h.itemId);
      const items = await itemLoader.loadMany(itemIds);

      return items.map(({ id }) => ({ id }));
    },

    creator: async ({ id, isDefaultList, userId }, _, { closetListLoader }) => {
      if (isDefaultList) {
        return { id: userId };
      }

      const closetList = await closetListLoader.load(id);
      return { id: closetList.userId };
    },
  },

  Query: {
    closetList: async (_, { id }, { currentUserId, closetListLoader }) => {
      // TODO: Accept the `not-in-a-list` case too!
      const closetList = await closetListLoader.load(id);
      if (!closetList) {
        return null;
      }

      const canView =
        closetList.userId === currentUserId || closetList.visibility >= 1;
      if (!canView) {
        return null;
      }

      return { id };
    },
  },

  Mutation: {
    editClosetList: async (
      _,
      { closetListId, name, description, supportSecret },
      { currentUserId, closetListLoader, userLoader, db }
    ) => {
      const oldClosetList = await closetListLoader.load(closetListId);
      if (!oldClosetList) {
        console.warn(
          `Skipping editClosetList for unknown closet list ID: ${closetListId}`
        );
        return null;
      }

      const isCurrentUser = oldClosetList.userId === currentUserId;
      const isSupportUser = supportSecret === process.env["SUPPORT_SECRET"];
      if (!isCurrentUser && !isSupportUser) {
        throw new Error(
          `Current user does not have permission to edit closet list ${closetListId}`
        );
      }

      await db.execute(
        `
        UPDATE closet_lists SET name = ?, description = ? WHERE id = ? LIMIT 1
      `,
        [name, description, closetListId]
      );

      // we changed it, so clear it from cache
      closetListLoader.clear(closetListId);

      // If this was a Support action (rather than a normal edit), log it.
      if (!isCurrentUser && isSupportUser) {
        if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
          try {
            const user = await userLoader.load(oldClosetList.userId);

            await logToDiscord({
              embeds: [
                {
                  title: `🛠 User ${user.name} - List ${closetListId}`,
                  fields: [
                    {
                      name: `Name`,
                      value: `${oldClosetList.name} → **${name}**`,
                    },
                    {
                      name: `Description`,
                      value:
                        `\`${oldClosetList.description.substr(0, 60)}…\`` +
                        `→ **\`${description.substr(0, 60)}…\`**`,
                    },
                  ],
                  timestamp: new Date().toISOString(),
                  url: `https://impress-2020.openneo.net/user/${user.id}/lists#list-${closetListId}`,
                },
              ],
            });
          } catch (e) {
            console.error("Error sending Discord support log", e);
          }
        } else {
          console.warn("No Discord support webhook provided, skipping");
        }
      }

      return { id: closetListId };
    },
  },
};

module.exports = { typeDefs, resolvers };
