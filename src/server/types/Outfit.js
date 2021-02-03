import { gql } from "apollo-server";

const typeDefs = gql`
  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!
    creator: User

    # This is a convenience field: you could query this from the combination of
    # petAppearance and wornItems, but this gets you it in one shot!
    itemAppearances: [ItemAppearance!]!
  }

  extend type Query {
    outfit(id: ID!): Outfit
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
      return { id: outfit.userId };
    },
  },
  Query: {
    outfit: (_, { id }) => ({ id }),
  },
};

module.exports = { typeDefs, resolvers };
