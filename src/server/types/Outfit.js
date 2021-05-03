import { gql } from "apollo-server";
import { getPoseFromPetState } from "../util";

const typeDefs = gql`
  type Outfit {
    id: ID!
    name: String
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!
    creator: User

    # When this outfit was created. ISO 8601 string.
    createdAt: String!

    # When this outfit was last updated. ISO 8601 string.
    updatedAt: String!

    # This is a convenience field: you could query this from the combination of
    # petAppearance and wornItems, but this gets you it in one shot!
    itemAppearances: [ItemAppearance!]!
  }

  extend type Query {
    outfit(id: ID!): Outfit
  }

  extend type Mutation {
    saveOutfit(
      id: ID # Optional, is null when saving new outfits.
      name: String # Optional, server may fill in a placeholder.
      speciesId: ID!
      colorId: ID!
      pose: Pose!
      wornItemIds: [ID!]!
      closetedItemIds: [ID!]!
    ): Outfit!
  }
`;

const resolvers = {
  Outfit: {
    name: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.name;
    },
    petAppearance: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return { id: outfit.petStateId };
    },
    itemAppearances: async (
      { id },
      _,
      {
        outfitLoader,
        petStateLoader,
        petTypeLoader,
        itemOutfitRelationshipsLoader,
      }
    ) => {
      const [petType, relationships] = await Promise.all([
        outfitLoader
          .load(id)
          .then((outfit) => petStateLoader.load(outfit.petStateId))
          .then((petState) => petTypeLoader.load(petState.petTypeId)),
        itemOutfitRelationshipsLoader.load(id),
      ]);

      const wornItemIds = relationships
        .filter((oir) => oir.isWorn)
        .map((oir) => oir.itemId);

      return wornItemIds.map((itemId) => ({
        item: { id: itemId },
        bodyId: petType.bodyId,
      }));
    },
    wornItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
    closetedItems: async ({ id }, _, { itemOutfitRelationshipsLoader }) => {
      const relationships = await itemOutfitRelationshipsLoader.load(id);
      return relationships
        .filter((oir) => !oir.isWorn)
        .map((oir) => ({ id: oir.itemId }));
    },
    creator: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      if (!outfit.userId) {
        return null;
      }

      return { id: outfit.userId };
    },
    createdAt: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.createdAt.toISOString();
    },
    updatedAt: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.updatedAt.toISOString();
    },
  },

  Query: {
    outfit: async (_, { id }, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      if (!outfit) {
        return null;
      }

      return { id };
    },
  },

  Mutation: {
    saveOutfit: async (
      _,
      {
        id,
        name: rawName,
        speciesId,
        colorId,
        pose,
        wornItemIds,
        closetedItemIds,
      },
      {
        currentUserId,
        db,
        petTypeBySpeciesAndColorLoader,
        petStatesForPetTypeLoader,
      }
    ) => {
      if (!currentUserId) {
        throw new Error(
          "saveOutfit requires login for now. This might change!"
        );
      }

      if (id) {
        throw new Error("TODO: Add support for updating existing outfits");
      }

      // Get the base name of the provided name: trim it, and strip any "(1)"
      // suffixes.
      const baseName = (rawName || "Untitled outfit").replace(
        /\s*\([0-9]+\)\s*$/,
        ""
      );
      const namePlaceholder = baseName.trim().replace(/_%/g, "\\$0") + "%";

      // Then, look for outfits from this user with the same base name.
      const [outfitRows] = await db.query(
        `
          SELECT name FROM outfits WHERE user_id = ? AND name LIKE ?;
        `,
        [currentUserId, namePlaceholder]
      );
      const existingOutfitNames = new Set(
        outfitRows.map(({ name }) => name.trim())
      );

      // Then, get the unique name to use for this outfit: try the base name
      // first, but, if it's taken, keep incrementing the "(1)" suffix until
      // it's not.
      let name = baseName;
      for (let i = 1; existingOutfitNames.has(name); i++) {
        name = `${baseName} (${i})`;
      }

      // Next, get the petState corresponding to this species/color/pose.
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      if (!petType) {
        throw new Error(
          `could not find pet type for species=${speciesId}, color=${colorId}`
        );
      }
      // TODO: We could query for this more directly, instead of loading all
      //       appearances 🤔
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (!petState) {
        throw new Error(
          `could not find appearance for species=${speciesId}, color=${colorId}, pose=${pose}`
        );
      }

      // Save the outfit, and its item_outfit_relationships rows, in a
      // transaction.
      await db.beginTransaction();
      let newOutfitId;
      try {
        const [result] = await db.execute(
          `
            INSERT INTO outfits
              (name, pet_state_id, user_id, created_at, updated_at)
              VALUES (?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
          `,
          [name, petState.id, currentUserId]
        );
        newOutfitId = String(result.insertId);

        if (wornItemIds.length > 0 || closetedItemIds.length > 0) {
          const itemRowPlaceholders = [
            [...wornItemIds, ...closetedItemIds].map(
              (_) => `(?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`
            ),
          ].join(", ");
          const itemRowValues = [
            ...wornItemIds.map((itemId) => [newOutfitId, itemId, true]),
            ...closetedItemIds.map((itemId) => [newOutfitId, itemId, false]),
          ].flat();
          await db.execute(
            // TODO: When we start saving existing outfits, we'll need a delete
            //       here too, or some other sync mechanism.
            `
              INSERT INTO item_outfit_relationships
                (outfit_id, item_id, is_worn, created_at, updated_at)
                VALUES ${itemRowPlaceholders};
            `,
            itemRowValues
          );
        }

        await db.commit();
      } catch (e) {
        await db.rollback();
        throw e;
      }

      console.info(`Saved outfit ${newOutfitId}`);

      return { id: newOutfitId };
    },
  },
};

module.exports = { typeDefs, resolvers };
