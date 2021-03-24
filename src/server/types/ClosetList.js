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

  extend type Mutation {
    # Edit the metadata of a closet list. Requires the current user to own the
    # list, or for the correct supportSecret to be provided.
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
                  url: `https://impress-2020.openneo.net/user/${user.id}/items#list-${closetListId}`,
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
