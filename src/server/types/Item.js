const { gql } = require("apollo-server");
const { getRestrictedZoneIds } = require("../util");

const typeDefs = gql`
  type Item {
    id: ID!
    name: String!
    description: String!
    thumbnailUrl: String!
    rarityIndex: Int!
    isNc: Boolean!

    # How this item appears on the given species/color combo. If it does not
    # fit the pet, we'll return an empty ItemAppearance with no layers.
    appearanceOn(speciesId: ID!, colorId: ID!): ItemAppearance!

    # This is set manually by Support users, when the pet is only for e.g.
    # Maraquan pets, and our usual auto-detection isn't working. We provide
    # this for the Support UI; it's not very helpful for most users, because it
    # can be empty even if the item _has_ an auto-detected special color.
    manualSpecialColor: Color

    # This is set manually by Support users, when the item _seems_ to fit all
    # pets the same because of its zones, but it actually doesn't - e.g.,
    # the Dug Up Dirt Foreground actually looks different for each body. We
    # provide this for the Support UI; it's not very helpful for most users,
    # because it's only used at modeling time. This value does not change how
    # layer data from this API should be interpreted!
    explicitlyBodySpecific: Boolean!

    # NOTE: I think we'll probably deprecate this and add more complexity to
    #       this API, because right now we're only looking at standard colors
    #       but it would be good to report gaps in Mutant etc items too.
    speciesThatNeedModels: [Species!]!
  }

  type ItemAppearance {
    id: ID!
    item: Item!
    bodyId: ID!
    layers: [AppearanceLayer!]
    restrictedZones: [Zone!]!
  }

  type ItemSearchResult {
    query: String!
    zones: [Zone!]!
    items: [Item!]!
  }

  extend type Query {
    item(id: ID!): Item
    items(ids: [ID!]!): [Item!]!
    itemSearch(query: String!): ItemSearchResult!
    itemSearchToFit(
      query: String!
      speciesId: ID!
      colorId: ID!
      zoneIds: [ID!]
      offset: Int
      limit: Int
    ): ItemSearchResult!
    itemsThatNeedModels: [Item!]!
  }
`;

const resolvers = {
  Item: {
    name: async ({ id, name }, _, { itemTranslationLoader }) => {
      if (name) return name;
      const translation = await itemTranslationLoader.load(id);
      return translation.name;
    },
    description: async ({ id, description }, _, { itemTranslationLoader }) => {
      if (description) return description;
      const translation = await itemTranslationLoader.load(id);
      return translation.description;
    },
    thumbnailUrl: async ({ id, thumbnailUrl }, _, { itemLoader }) => {
      if (thumbnailUrl) return thumbnailUrl;
      const item = await itemLoader.load(id);
      return item.thumbnailUrl;
    },
    rarityIndex: async ({ id, rarityIndex }, _, { itemLoader }) => {
      if (rarityIndex) return rarityIndex;
      const item = await itemLoader.load(id);
      return item.rarityIndex;
    },
    isNc: async ({ id, rarityIndex }, _, { itemLoader }) => {
      if (rarityIndex != null) return rarityIndex === 500 || rarityIndex === 0;
      const item = await itemLoader.load(id);
      return item.rarityIndex === 500 || item.rarityIndex === 0;
    },
    appearanceOn: async (
      { id },
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      return { item: { id }, bodyId: petType.bodyId };
    },
    manualSpecialColor: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.manualSpecialColorId != null
        ? { id: item.manualSpecialColorId }
        : null;
    },
    explicitlyBodySpecific: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.explicitlyBodySpecific;
    },
    speciesThatNeedModels: async ({ id }, _, { itemsThatNeedModelsLoader }) => {
      const allItems = await itemsThatNeedModelsLoader.load("all");
      const item = allItems.find((i) => i.id === id);
      const modeledSpeciesIds = item.modeledSpeciesIds.split(",");
      // HACK: Needs to be updated if more species are added!
      const allSpeciesIds = Array.from(
        { length: item.supportsVandagyre ? 55 : 54 },
        (_, i) => String(i + 1)
      );
      const unmodeledSpeciesIds = allSpeciesIds.filter(
        (id) => !modeledSpeciesIds.includes(id)
      );
      return unmodeledSpeciesIds.map((id) => ({ id }));
    },
  },

  ItemAppearance: {
    id: ({ item, bodyId }) => `item-${item.id}-body-${bodyId}`,
    layers: async ({ item, bodyId }, _, { itemSwfAssetLoader }) => {
      const allSwfAssets = await itemSwfAssetLoader.load({
        itemId: item.id,
        bodyId,
      });

      return allSwfAssets.filter((sa) => sa.url.endsWith(".swf"));
    },
    restrictedZones: async (
      { item: { id: itemId }, bodyId },
      _,
      { itemSwfAssetLoader, itemLoader }
    ) => {
      // Check whether this appearance is empty. If so, restrict no zones.
      const allSwfAssets = await itemSwfAssetLoader.load({ itemId, bodyId });
      if (allSwfAssets.length === 0) {
        return [];
      }

      const item = await itemLoader.load(itemId);
      return getRestrictedZoneIds(item.zonesRestrict).map((id) => ({ id }));
    },
  },

  Query: {
    item: (_, { id }) => ({ id }),
    items: (_, { ids }) => {
      return ids.map((id) => ({ id }));
    },
    itemSearch: async (_, { query }, { itemSearchLoader }) => {
      const items = await itemSearchLoader.load(query.trim());
      return { query, items };
    },
    itemSearchToFit: async (
      _,
      { query, speciesId, colorId, zoneIds = [], offset, limit },
      { petTypeBySpeciesAndColorLoader, itemSearchToFitLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      const { bodyId } = petType;
      const items = await itemSearchToFitLoader.load({
        query: query.trim(),
        bodyId,
        zoneIds,
        offset,
        limit,
      });
      const zones = zoneIds.map((id) => ({ id }));
      return { query, zones, items };
    },
    itemsThatNeedModels: async (_, __, { itemsThatNeedModelsLoader }) => {
      const items = await itemsThatNeedModelsLoader.load("all");
      return items.map(({ id }) => ({ id }));
    },
  },
};

module.exports = { typeDefs, resolvers };
