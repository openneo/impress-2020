import { gql } from "apollo-server";
import { getOWLSTradeValue } from "../nc-trade-values";
import {
  getRestrictedZoneIds,
  normalizeRow,
  oneWeek,
  oneDay,
  oneHour,
} from "../util";

const typeDefs = gql`
  type Item @cacheControl(maxAge: ${oneDay}, staleWhileRevalidate: ${oneWeek}) {
    id: ID!
    name: String!
    description: String!
    thumbnailUrl: String!
    rarityIndex: Int!

    "Whether this item comes from the NC Mall."
    isNc: Boolean!

    "Whether this item comes from a paintbrush."
    isPb: Boolean!

    """
    When this item was first added to DTI. ISO 8601 string, or null if the
    item was added so long ago that we don't have this field!
    """
    createdAt: String

    """
    Deprecated: This item's capsule trade value as text, according to
    wakaguide.com, as a human-readable string. **This now always returns null.**
    """
    wakaValueText: String @cacheControl(maxAge: ${oneHour})

    """
    This item's NC trade value as a human-readable string. Returns null if the
    value is not known.

    Note that the format of this string is not well-specified—it's fully
    human-curated and may include surprising words or extra notes! We recommend
    presenting the text exactly as-is, rather than trying to parse and math it.

    This data is currently curated by neopets.com/~owls, thank you!! <3
    """
    ncTradeValueText: String @cacheControl(maxAge: ${oneHour})

    currentUserOwnsThis: Boolean! @cacheControl(maxAge: 0, scope: PRIVATE)
    currentUserWantsThis: Boolean! @cacheControl(maxAge: 0, scope: PRIVATE)

    """
    Which lists the current user has this item in.
    Deprecated: We're using ClosetList.hasItem in the client now!
    """
    currentUserHasInLists: [ClosetList!]! @cacheControl(maxAge: 0, scope: PRIVATE)

    """
    How many users are offering/seeking this in their public trade lists.
    Excludes users that seem relatively inactive.
    """
    numUsersOfferingThis: Int! @cacheControl(maxAge: ${oneHour})
    numUsersSeekingThis: Int! @cacheControl(maxAge: ${oneHour})

    "The trades available for this item, grouped by offering vs seeking."
    tradesOffering: [ItemTrade!]! @cacheControl(maxAge: 0)
    tradesSeeking: [ItemTrade!]! @cacheControl(maxAge: 0)

    """
    How this item appears on the given species/color combo. If it does not
    fit the pet, we'll return an empty ItemAppearance with no layers.
    """
    appearanceOn(speciesId: ID!, colorId: ID!): ItemAppearance! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneDay})

    """
    This is set manually by Support users, when the pet is only for e.g.
    Maraquan pets, and our usual auto-detection isn't working. We provide
    this for the Support UI; it's not very helpful for most users, because it
    can be empty even if the item _has_ an auto-detected special color.
    """
    manualSpecialColor: Color @cacheControl(maxAge: 0)

    """
    This is set manually by Support users, when the item _seems_ to fit all
    pets the same because of its zones, but it actually doesn't - e.g.,
    the Dug Up Dirt Foreground actually looks different for each body. We
    provide this for the Support UI; it's not very helpful for most users,
    because it's only used at modeling time. This value does not change how
    layer data from this API should be interpreted!
    """
    explicitlyBodySpecific: Boolean! @cacheControl(maxAge: 0)

    """
    This is set manually by Support users, when the item is from the NC Mall
    but isn't correctly labeled as r500 on Neopets.com. When this is true,
    it sets isNc to be true as well, regardless of rarityIndex.
    """
    isManuallyNc: Boolean!

    """
    Get the species that we need modeled for this item for the given color.
    
    NOTE: Most color IDs won't be accepted here. Either pass the ID of a
          major special color like Baby (#6), or leave it blank for standard
          bodies like Blue, Green, Red, etc.
    """
    speciesThatNeedModels(colorId: ID): [Species!]! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneHour})

    """
    Return a single ItemAppearance for this item. It'll be for the species
    with the smallest ID for which we have item appearance data, and a basic
    color. We use this on the item page, to initialize the preview section.
    (You can find out which species this is for by going through the body
    field on ItemAppearance!)
    
    There's also optional fields preferredSpeciesId and preferredColorId, to
    request a certain species or color if possible. We'll try to match each,
    with precedence to species first; then fall back to the canonical values.
    
    Note that the exact choice of color doesn't usually affect this field,
    because ItemAppearance is per-body rather than per-color. It's most
    relevant for special colors like Baby or Mutant. But the
    canonicalAppearance on the Body type _does_ use the preferred color more
    precisely!
    """
    canonicalAppearance(preferredSpeciesId: ID, preferredColorId: ID): ItemAppearance @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneWeek})
 
    """
    All zones that this item occupies, for at least one body. That is, it's
    a union of zones for all of its appearances! We use this for overview
    info about the item.
    """
    allOccupiedZones: [Zone!]! @cacheControl(maxAge: ${oneHour})

    """
    The zones this item restricts. Turns out, even though we offer this on
    ItemAppearance for consistency, this is static across all appearances.
    """
    restrictedZones: [Zone!]! @cacheControl(maxAge: ${oneHour}, staleWhileRevalidate: ${oneWeek})

    """
    All bodies that this item is compatible with. Note that this might return
    the special representsAllPets body, e.g. if this is just a Background!
    Deprecated: Impress 2020 now uses compatibleBodiesAndTheirZones.
    """
    compatibleBodies: [Body!]! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneWeek})

    """
    All bodies that this item is compatible with, and the zones this item
    occupies for that body. Note that this might return the special
    representsAllPets body, e.g. if this is just a Background!
    """
    compatibleBodiesAndTheirZones: [BodyAndZones!]! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneWeek})

    """
    All appearances for this item. Used in Support tools, to show and manage
    how this item fits every pet body.
    """
    allAppearances: [ItemAppearance!]!
  }

  type ItemAppearance {
    id: ID!
    item: Item!
    bodyId: ID! # Deprecated, use body->id.
    body: Body!
    layers: [AppearanceLayer!]
    restrictedZones: [Zone!]!
  }

  type BodyAndZones {
    body: Body!
    zones: [Zone!]!
  }

  input FitsPetSearchFilter {
    speciesId: ID!
    colorId: ID!
  }

  enum ItemKindSearchFilter {
    NC
    NP
    PB
  }

  # TODO: I guess I didn't add the NC/NP/PB filter to this. Does that cause
  #       bugs in comparing results on the client?
  type ItemSearchResult {
    query: String!
    zones: [Zone!]!
    items: [Item!]!
    numTotalItems: Int!
  }

  # TODO: I guess I didn't add the NC/NP/PB filter to this. Does that cause
  #       bugs in comparing results on the client?
  type ItemSearchResultV2 {
    id: ID!
    query: String!
    zones: [Zone!]!
    items(offset: Int, limit: Int): [Item!]!
    numTotalItems: Int!
  }

  type ItemTrade {
    id: ID!
    user: User!
    closetList: ClosetList!
  }

  extend type Query {
    item(id: ID!): Item
    items(ids: [ID!]!): [Item!]!

    """
    Find items by name. Exact match, except for some tweaks, like
    case-insensitivity and trimming extra whitespace. Null if not found.
    
    NOTE: These aren't used in DTI at time of writing; they're a courtesy API
          for the /r/Neopets Discord bot's outfit preview command!
    """
    itemByName(name: String!): Item
    itemsByName(names: [String!]!): [Item]!

    """
    Search for items with fuzzy matching.
    Deprecated: Prefer itemSearchV2 instead!
    """
    itemSearch(
      query: String!
      fitsPet: FitsPetSearchFilter
      itemKind: ItemKindSearchFilter
      currentUserOwnsOrWants: OwnsOrWants
      zoneIds: [ID!]
      offset: Int
      limit: Int
    ): ItemSearchResult!

    """
    Search for items with fuzzy matching.
    """
    itemSearchV2(
      query: String!
      fitsPet: FitsPetSearchFilter
      itemKind: ItemKindSearchFilter
      currentUserOwnsOrWants: OwnsOrWants
      zoneIds: [ID!]
    ): ItemSearchResultV2!

    """
    Deprecated: an alias for itemSearch, but with speciesId and colorId
    required, serving the same purpose as fitsPet in itemSearch.
    """
    itemSearchToFit(
      query: String!
      itemKind: ItemKindSearchFilter
      currentUserOwnsOrWants: OwnsOrWants
      zoneIds: [ID!]
      speciesId: ID!
      colorId: ID!
      offset: Int
      limit: Int
    ): ItemSearchResult!

    """
    Get the 20 items most recently added to our database.
    """
    newestItems: [Item!]! @cacheControl(maxAge: ${oneHour}, staleWhileRevalidate: ${oneDay})

    """
    Get items that need models for the given color.
    
    NOTE: Most color IDs won't be accepted here. Either pass the ID of a
          major special color like Baby (#6), or leave it blank for standard
          bodies like Blue, Green, Red, etc.
    """
    itemsThatNeedModels(colorId: ID): [Item!]! @cacheControl(maxAge: 1, staleWhileRevalidate: ${oneHour})
  }

  extend type Mutation {
    addToItemsCurrentUserOwns(itemId: ID!): Item
    removeFromItemsCurrentUserOwns(itemId: ID!): Item

    addToItemsCurrentUserWants(itemId: ID!): Item
    removeFromItemsCurrentUserWants(itemId: ID!): Item

    """
    Add the given item to the given list, if this user has permission.

    If "removeFromDefaultList" is true, this will *also* remove the item from
    the corresponding *default* list, if it's present. (This is helpful for UI
    interactions like on the item page, where maybe the user clicks "I own
    this", *then* adds it to a specific list, and probably didn't mean to
    create two copies!)
    """
    addItemToClosetList(listId: ID!, itemId: ID!, removeFromDefaultList: Boolean): ClosetList

    """
    Remove the given item from the given list, if this user has permission.

    If "ensureInSomeList" is true, this will *also* add the item to the
    corresponding *default* list, if it's not in any others. (This is helpful
    for UI interactions like on the item page, where unticking the checkbox for
    all the lists doesn't necessarily mean you want to stop owning/wanting the
    item altogether!)
    """
    removeItemFromClosetList(listId: ID!, itemId: ID!, ensureInSomeList: Boolean): ClosetList
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
    isNc: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return isNC(item);
    },
    isPb: async ({ id }, _, { itemTranslationLoader }) => {
      const translation = await itemTranslationLoader.load(id);
      if (!translation) {
        console.warn(
          `Item.isPb: Translation not found for item ${id}. Returning false.`,
        );
        return false;
      }
      return translation.description.includes(
        "This item is part of a deluxe paint brush set!",
      );
    },
    createdAt: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.createdAt && item.createdAt.toISOString();
    },
    wakaValueText: () => {
      // This feature is deprecated, so now we just always return unknown value.
      return null;
    },
    ncTradeValueText: async (
      { id },
      _,
      { itemLoader, itemTranslationLoader },
    ) => {
      // Skip this lookup for non-NC items, as a perf optimization.
      const item = await itemLoader.load(id);
      if (!isNC(item)) {
        return;
      }

      // Get the item name, which is how we look things up in ~owls.
      const itemTranslation = await itemTranslationLoader.load(id);
      let itemName = itemTranslation.name;

      // HACK: The name "Butterfly Dress" is used for two different items.
      //       Here's what ~owls does to distinguish!
      if (id === "76073") {
        itemName = "Butterfly Dress (from Faerie Festival event)";
      }

      // Load the NC trade value from ~owls, if any.
      let ncTradeValue;
      try {
        ncTradeValue = await getOWLSTradeValue(itemName);
      } catch (e) {
        console.error(
          `Error loading ncTradeValueText for item ${id}, skipping:`,
        );
        console.error(e);
        ncTradeValue = null;
      }

      // If there was a value, get the text. If not, return null.
      return ncTradeValue ? ncTradeValue.valueText : null;
    },

    currentUserOwnsThis: async (
      { id },
      _,
      { currentUserId, userItemClosetHangersLoader },
    ) => {
      if (currentUserId == null) return false;
      const closetHangers = await userItemClosetHangersLoader.load({
        userId: currentUserId,
        itemId: id,
      });
      return closetHangers.some((h) => h.owned);
    },
    currentUserWantsThis: async (
      { id },
      _,
      { currentUserId, userItemClosetHangersLoader },
    ) => {
      if (currentUserId == null) return false;
      const closetHangers = await userItemClosetHangersLoader.load({
        userId: currentUserId,
        itemId: id,
      });
      return closetHangers.some((h) => !h.owned);
    },
    currentUserHasInLists: async (
      { id },
      _,
      { currentUserId, userItemClosetHangersLoader },
    ) => {
      if (currentUserId == null) return false;
      const closetHangers = await userItemClosetHangersLoader.load({
        userId: currentUserId,
        itemId: id,
      });
      const listRefs = closetHangers.map((hanger) => {
        if (hanger.listId) {
          return { id: hanger.listId };
        } else {
          return {
            id: null,
            isDefaultList: true,
            userId: hanger.userId,
            ownsOrWantsItems: hanger.owned ? "OWNS" : "WANTS",
          };
        }
      });
      return listRefs;
    },

    numUsersOfferingThis: async (
      { id },
      _,
      { itemTradesLoader, userLastTradeActivityLoader },
    ) => {
      // First, get the trades themselves. TODO: Optimize into one query?
      const trades = await itemTradesLoader.load({
        itemId: id,
        isOwned: true,
      });

      // Then, get the last active dates for those users.
      const userIds = trades.map((t) => t.user.id);
      const lastActiveDates = await userLastTradeActivityLoader.loadMany(
        userIds,
      );

      // Finally, count how many of those dates were in the last 6 months.
      // Those trades get to be in the count!
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const numTrades = lastActiveDates.filter((d) => d > sixMonthsAgo).length;

      return numTrades;
    },
    numUsersSeekingThis: async (
      { id },
      _,
      { itemTradesLoader, userLastTradeActivityLoader },
    ) => {
      // First, get the trades themselves. TODO: Optimize into one query?
      const trades = await itemTradesLoader.load({
        itemId: id,
        isOwned: false,
      });

      // Then, get the last active dates for those users.
      const userIds = trades.map((t) => t.user.id);
      const lastActiveDates = await userLastTradeActivityLoader.loadMany(
        userIds,
      );

      // Finally, count how many of those dates were in the last 6 months.
      // Those trades get to be in the count!
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const numTrades = lastActiveDates.filter((d) => d > sixMonthsAgo).length;

      return numTrades;
    },

    tradesOffering: async ({ id }, _, { itemTradesLoader }) => {
      const trades = await itemTradesLoader.load({ itemId: id, isOwned: true });
      return trades.map((trade) => ({
        id: trade.id,
        closetList: trade.closetList
          ? { id: trade.closetList.id }
          : {
              isDefaultList: true,
              userId: trade.user.id,
              ownsOrWantsItems: "OWNS",
            },
        user: { id: trade.user.id },
      }));
    },

    tradesSeeking: async ({ id }, _, { itemTradesLoader }) => {
      const trades = await itemTradesLoader.load({
        itemId: id,
        isOwned: false,
      });
      return trades.map((trade) => ({
        id: trade.id,
        closetList: trade.closetList
          ? { id: trade.closetList.id }
          : {
              isDefaultList: true,
              userId: trade.user.id,
              ownsOrWantsItems: "WANTS",
            },
        user: { id: trade.user.id },
      }));
    },

    appearanceOn: async (
      { id },
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader },
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
    isManuallyNc: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return item.isManuallyNc;
    },
    speciesThatNeedModels: async (
      { id },
      { colorId = "8" }, // Blue
      { speciesThatNeedModelsForItemLoader, allSpeciesIdsForColorLoader },
    ) => {
      // NOTE: If we're running this in the context of `itemsThatNeedModels`,
      //       this loader should already be primed, no extra query!
      const row = await speciesThatNeedModelsForItemLoader.load({
        itemId: id,
        colorId,
      });
      if (!row) {
        return [];
      }

      const modeledSpeciesIds = row.modeledSpeciesIds.split(",");
      const allSpeciesIdsForThisColor = await allSpeciesIdsForColorLoader.load(
        colorId,
      );

      let allModelableSpeciesIds = allSpeciesIdsForThisColor;
      if (!row.supportsVandagyre) {
        allModelableSpeciesIds = allModelableSpeciesIds.filter(
          (s) => s !== "55",
        );
      }

      const unmodeledSpeciesIds = allModelableSpeciesIds.filter(
        (id) => !modeledSpeciesIds.includes(id),
      );
      return unmodeledSpeciesIds.map((id) => ({ id }));
    },
    canonicalAppearance: async (
      { id },
      { preferredSpeciesId, preferredColorId },
      { db },
    ) => {
      const [rows] = await db.query(
        `
          SELECT pet_types.body_id, pet_types.species_id FROM pet_types
          INNER JOIN colors ON
            pet_types.color_id = colors.id
          INNER JOIN swf_assets ON
            pet_types.body_id = swf_assets.body_id OR swf_assets.body_id = 0
          INNER JOIN parents_swf_assets ON
            parents_swf_assets.swf_asset_id = swf_assets.id
          INNER JOIN items ON
            items.id = parents_swf_assets.parent_id AND
              parents_swf_assets.parent_type = "Item"  
          WHERE items.id = ?
          ORDER BY
            pet_types.species_id = ? DESC,
            pet_types.color_id = ? DESC,
            pet_types.species_id ASC,
            colors.standard DESC
          LIMIT 1
        `,
        [id, preferredSpeciesId || "<ignore>", preferredColorId || "<ignore>"],
      );
      if (rows.length === 0) {
        return null;
      }

      const bestRow = normalizeRow(rows[0]);

      return {
        item: { id },
        bodyId: bestRow.bodyId,
        // An optimization: we know the species already, so fill it in here
        // without requiring an extra query if we want it.
        // TODO: Maybe this would be cleaner if we make the body -> species
        //       loader, and prime it in the item bodies loader, rather than
        //       setting it here?
        body: { id: bestRow.bodyId, species: { id: bestRow.speciesId } },
      };
    },
    allOccupiedZones: async ({ id }, _, { itemAllOccupiedZonesLoader }) => {
      const zoneIds = await itemAllOccupiedZonesLoader.load(id);
      const zones = zoneIds.map((id) => ({ id }));
      return zones;
    },
    restrictedZones: async ({ id }, _, { itemLoader }) => {
      const item = await itemLoader.load(id);
      return getRestrictedZoneIds(item.zonesRestrict).map((zoneId) => ({
        id: zoneId,
      }));
    },
    compatibleBodies: async ({ id }, _, { db }) => {
      const [rows] = await db.query(
        `
        SELECT DISTINCT swf_assets.body_id
          FROM items
          INNER JOIN parents_swf_assets ON
            items.id = parents_swf_assets.parent_id AND
              parents_swf_assets.parent_type = "Item"
          INNER JOIN swf_assets ON
            parents_swf_assets.swf_asset_id = swf_assets.id
          WHERE items.id = ?
        `,
        [id],
      );
      const bodyIds = rows.map((row) => row.body_id);
      const bodies = bodyIds.map((id) => ({ id }));
      return bodies;
    },
    compatibleBodiesAndTheirZones: async (
      { id },
      _,
      { itemCompatibleBodiesAndTheirZonesLoader },
    ) => {
      const rows = await itemCompatibleBodiesAndTheirZonesLoader.load(id);
      return rows.map((row) => ({
        body: {
          id: row.bodyId,
          species: row.speciesId ? { id: row.speciesId } : null,
        },
        zones: row.zoneIds.split(",").map((zoneId) => ({ id: zoneId })),
      }));
    },
    allAppearances: async ({ id }, _, { db }) => {
      // HACK: Copy-pasted from `compatibleBodies`. Could be a loader?
      const [rows] = await db.query(
        `
        SELECT DISTINCT swf_assets.body_id
          FROM items
          INNER JOIN parents_swf_assets ON
            items.id = parents_swf_assets.parent_id AND
              parents_swf_assets.parent_type = "Item"
          INNER JOIN swf_assets ON
            parents_swf_assets.swf_asset_id = swf_assets.id
          WHERE items.id = ?
        `,
        [id],
      );
      const bodyIds = rows.map((row) => String(row.body_id));
      return bodyIds.map((bodyId) => ({ item: { id }, bodyId }));
    },
  },

  ItemAppearance: {
    id: ({ item, bodyId }) => `item-${item.id}-body-${bodyId}`,
    body: ({ body, bodyId }) => body || { id: bodyId },
    layers: async ({ item, bodyId }, _, { itemSwfAssetLoader }) => {
      const allSwfAssets = await itemSwfAssetLoader.load({
        itemId: item.id,
        bodyId,
      });

      // NOTE: Previously, I used this to filter assets to just SWFs, to avoid
      // dealing with the audio assets altogether cuz I never built support for
      // them. But now, some assets have the url `https://images.neopets.com/temp`
      // instead? So uhh. Disabling this for now.
      // let assets = allSwfAssets.filter((sa) => sa.url.endsWith(".swf"));
      let assets = allSwfAssets;

      // If there are no body-specific assets in this appearance, then remove
      // assets with the glitch flag REQUIRES_OTHER_BODY_SPECIFIC_ASSETS: the
      // requirement isn't met!
      const hasBodySpecificAssets = assets.some((sa) => sa.bodyId !== "0");
      if (!hasBodySpecificAssets) {
        assets = assets.filter((sa) => {
          return !sa.knownGlitches
            .split(",")
            .includes("REQUIRES_OTHER_BODY_SPECIFIC_ASSETS");
        });
      }

      return assets.map(({ id }) => ({ id }));
    },
    restrictedZones: async (
      { item: { id: itemId }, bodyId },
      _,
      { itemSwfAssetLoader, itemLoader },
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
    itemByName: async (_, { name }, { itemByNameLoader }) => {
      const { item } = await itemByNameLoader.load(name);
      return item ? { id: item.id } : null;
    },
    itemsByName: async (_, { names }, { itemByNameLoader }) => {
      const items = await itemByNameLoader.loadMany(names);
      return items.map(({ item }) => (item ? { id: item.id } : null));
    },
    itemSearch: async (
      _,
      {
        query,
        fitsPet,
        itemKind,
        currentUserOwnsOrWants,
        zoneIds = [],
        offset,
        limit,
      },
      {
        itemSearchNumTotalItemsLoader,
        itemSearchItemsLoader,
        petTypeBySpeciesAndColorLoader,
        currentUserId,
      },
      { cacheControl },
    ) => {
      if (currentUserOwnsOrWants != null) {
        cacheControl.setCacheHint({ scope: "PRIVATE" });
      }

      let bodyId = null;
      if (fitsPet) {
        const petType = await petTypeBySpeciesAndColorLoader.load({
          speciesId: fitsPet.speciesId,
          colorId: fitsPet.colorId,
        });
        if (!petType) {
          throw new Error(
            `pet type not found: speciesId=${fitsPet.speciesId}, ` +
              `colorId: ${fitsPet.colorId}`,
          );
        }
        bodyId = petType.bodyId;
      }
      const [items, numTotalItems] = await Promise.all([
        itemSearchItemsLoader.load({
          query: query.trim(),
          bodyId,
          itemKind,
          currentUserOwnsOrWants,
          currentUserId,
          zoneIds,
          offset,
          limit,
        }),
        itemSearchNumTotalItemsLoader.load({
          query: query.trim(),
          bodyId,
          itemKind,
          currentUserOwnsOrWants,
          currentUserId,
          zoneIds,
        }),
      ]);
      const zones = zoneIds.map((id) => ({ id }));
      return { query, zones, items, numTotalItems };
    },
    itemSearchV2: async (
      _,
      { query, fitsPet, itemKind, currentUserOwnsOrWants, zoneIds = [] },
      { petTypeBySpeciesAndColorLoader },
    ) => {
      let bodyId = null;
      if (fitsPet) {
        const petType = await petTypeBySpeciesAndColorLoader.load({
          speciesId: fitsPet.speciesId,
          colorId: fitsPet.colorId,
        });
        if (!petType) {
          throw new Error(
            `pet type not found: speciesId=${fitsPet.speciesId}, ` +
              `colorId: ${fitsPet.colorId}`,
          );
        }
        bodyId = petType.bodyId;
      }

      // These are the fields that define the search! We provide them to the
      // ItemSearchResultV2 resolvers, and also stringify them into an `id` for
      // caching the search result. (We define the ID for caching here, rather
      // than in the resolver or with a custom cache key on the client, to
      // make it hard for the ID and relevant search fields to get out of sync!)
      const fields = {
        query,
        bodyId,
        itemKind,
        currentUserOwnsOrWants,
        zoneIds,
      };
      const id = JSON.stringify(fields);

      return { id, ...fields };
    },
    itemSearchToFit: async (
      _,
      {
        query,
        speciesId,
        colorId,
        itemKind,
        currentUserOwnsOrWants,
        zoneIds = [],
        offset,
        limit,
      },
      { petTypeBySpeciesAndColorLoader, itemSearchLoader, currentUserId },
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      if (!petType) {
        throw new Error(
          `pet type not found: speciesId=${speciesId}, colorId: ${colorId}`,
        );
      }
      const { bodyId } = petType;
      const [items, numTotalItems] = await itemSearchLoader.load({
        query: query.trim(),
        itemKind,
        currentUserOwnsOrWants,
        currentUserId,
        zoneIds,
        bodyId,
        offset,
        limit,
      });
      const zones = zoneIds.map((id) => ({ id }));
      return { query, zones, items, numTotalItems };
    },
    newestItems: async (_, __, { newestItemsLoader }) => {
      const items = await newestItemsLoader.load("all-newest");
      return items.map((item) => ({ id: item.id }));
    },
    itemsThatNeedModels: async (
      _,
      { colorId = "8" }, // Defaults to Blue
      { itemsThatNeedModelsLoader },
    ) => {
      const speciesIdsByColorIdAndItemId = await itemsThatNeedModelsLoader.load(
        "all",
      );
      const speciesIdsByItemIds = speciesIdsByColorIdAndItemId.get(colorId);
      const itemIds = (speciesIdsByItemIds && speciesIdsByItemIds.keys()) || [];
      return Array.from(itemIds, (id) => ({ id }));
    },
  },

  ItemSearchResultV2: {
    numTotalItems: async (
      { query, bodyId, itemKind, currentUserOwnsOrWants, zoneIds },
      { offset, limit },
      { currentUserId, itemSearchNumTotalItemsLoader },
      { cacheControl },
    ) => {
      if (currentUserOwnsOrWants != null) {
        cacheControl.setCacheHint({ scope: "PRIVATE" });
      }
      const numTotalItems = await itemSearchNumTotalItemsLoader.load({
        query: query.trim(),
        bodyId,
        itemKind,
        currentUserOwnsOrWants,
        currentUserId,
        zoneIds,
        offset,
        limit,
      });
      return numTotalItems;
    },
    items: async (
      { query, bodyId, itemKind, currentUserOwnsOrWants, zoneIds },
      { offset, limit },
      { currentUserId, itemSearchItemsLoader },
      { cacheControl },
    ) => {
      if (currentUserOwnsOrWants != null) {
        cacheControl.setCacheHint({ scope: "PRIVATE" });
      }
      const items = await itemSearchItemsLoader.load({
        query: query.trim(),
        bodyId,
        itemKind,
        currentUserOwnsOrWants,
        currentUserId,
        zoneIds,
        offset,
        limit,
      });
      return items.map(({ id }) => ({ id }));
    },
    zones: ({ zoneIds }) => zoneIds.map((id) => ({ id })),
  },

  Mutation: {
    addToItemsCurrentUserOwns: async (
      _,
      { itemId },
      { currentUserId, db, itemLoader },
    ) => {
      if (currentUserId == null) {
        throw new Error(`must be logged in`);
      }

      const item = await itemLoader.load(itemId);
      if (item == null) {
        return null;
      }

      // Send an INSERT query that will add a hanger, if the user doesn't
      // already have one for this item.
      // Adapted from https://stackoverflow.com/a/3025332/107415
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await db.query(
        `
          INSERT INTO closet_hangers
            (item_id, user_id, quantity, created_at, updated_at, owned)
            SELECT ?, ?, ?, ?, ?, ? FROM DUAL
              WHERE NOT EXISTS (
                SELECT 1 FROM closet_hangers
                  WHERE item_id = ? AND user_id = ? AND owned = ?
              )
        `,
        [itemId, currentUserId, 1, now, now, true, itemId, currentUserId, true],
      );

      return { id: itemId };
    },
    removeFromItemsCurrentUserOwns: async (
      _,
      { itemId },
      { currentUserId, db, itemLoader },
    ) => {
      if (currentUserId == null) {
        throw new Error(`must be logged in`);
      }

      const item = await itemLoader.load(itemId);
      if (item == null) {
        return null;
      }

      await db.query(
        `DELETE FROM closet_hangers
         WHERE item_id = ? AND user_id = ? AND owned = ?;`,
        [itemId, currentUserId, true],
      );

      return { id: itemId };
    },
    addToItemsCurrentUserWants: async (
      _,
      { itemId },
      { currentUserId, db, itemLoader },
    ) => {
      if (currentUserId == null) {
        throw new Error(`must be logged in`);
      }

      const item = await itemLoader.load(itemId);
      if (item == null) {
        return null;
      }

      // Send an INSERT query that will add a hanger, if the user doesn't
      // already have one for this item.
      // Adapted from https://stackoverflow.com/a/3025332/107415
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await db.query(
        `
          INSERT INTO closet_hangers
            (item_id, user_id, quantity, created_at, updated_at, owned)
            SELECT ?, ?, ?, ?, ?, ? FROM DUAL
              WHERE NOT EXISTS (
                SELECT 1 FROM closet_hangers
                  WHERE item_id = ? AND user_id = ? AND owned = ?
              )
        `,
        [
          itemId,
          currentUserId,
          1,
          now,
          now,
          false,
          itemId,
          currentUserId,
          false,
        ],
      );

      return { id: itemId };
    },
    removeFromItemsCurrentUserWants: async (
      _,
      { itemId },
      { currentUserId, db, itemLoader },
    ) => {
      if (currentUserId == null) {
        throw new Error(`must be logged in`);
      }

      const item = await itemLoader.load(itemId);
      if (item == null) {
        return null;
      }

      await db.query(
        `DELETE FROM closet_hangers
         WHERE item_id = ? AND user_id = ? AND owned = ?;`,
        [itemId, currentUserId, false],
      );

      return { id: itemId };
    },
    addItemToClosetList: async (
      _,
      { listId, itemId, removeFromDefaultList },
      { currentUserId, db, closetListLoader },
    ) => {
      const closetListRef = await loadClosetListOrDefaultList(
        listId,
        closetListLoader,
      );
      if (closetListRef == null) {
        throw new Error(`list ${listId} not found`);
      }

      const { userId, ownsOrWantsItems } = closetListRef;

      if (userId !== currentUserId) {
        throw new Error(`current user does not own this list`);
      }

      const now = new Date();

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        if (removeFromDefaultList) {
          // First, remove from the default list, if requested.
          await connection.query(
            `
            DELETE FROM closet_hangers
              WHERE item_id = ? AND user_id = ? AND list_id IS NULL
                AND owned = ?
              LIMIT 1;
          `,
            [itemId, userId, ownsOrWantsItems === "OWNS"],
          );
        }

        // Then, add to the new list.
        await connection.query(
          `
            INSERT INTO closet_hangers
              (item_id, user_id, owned, list_id, quantity, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?);
          `,
          [itemId, userId, ownsOrWantsItems === "OWNS", listId, 1, now, now],
        );

        await connection.commit();
      } catch (error) {
        try {
          await connection.rollback();
        } catch (error2) {
          console.warn(`Error rolling back transaction`, error2);
        }

        throw error;
      } finally {
        await connection.release();
      }

      return closetListRef;
    },
    removeItemFromClosetList: async (
      _,
      { listId, itemId, ensureInSomeList },
      { currentUserId, db, closetListLoader },
    ) => {
      const closetListRef = await loadClosetListOrDefaultList(
        listId,
        closetListLoader,
      );
      if (closetListRef == null) {
        throw new Error(`list ${listId} not found`);
      }

      const { userId, ownsOrWantsItems } = closetListRef;

      if (closetListRef.userId !== currentUserId) {
        throw new Error(`current user does not own this list`);
      }

      const listMatcherCondition = closetListRef.isDefaultList
        ? `(user_id = ? AND owned = ? AND list_id IS NULL)`
        : `(list_id = ?)`;
      const listMatcherValues = closetListRef.isDefaultList
        ? [userId, ownsOrWantsItems === "OWNS"]
        : [listId];

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          `
            DELETE FROM closet_hangers
              WHERE ${listMatcherCondition} AND item_id = ? LIMIT 1;
          `,
          [...listMatcherValues, itemId],
        );

        if (ensureInSomeList) {
          // If requested, we check whether the item is still in *some* list of
          // the same own/want type. If not, we add it to the default list.
          const [rows] = await connection.query(
            `
              SELECT COUNT(*) AS count FROM closet_hangers
                WHERE user_id = ? AND item_id = ? AND owned = ?
            `,
            [userId, itemId, ownsOrWantsItems === "OWNS"],
          );

          if (rows[0].count === 0) {
            const now = new Date();
            await connection.query(
              `
                INSERT INTO closet_hangers
                  (item_id, user_id, owned, list_id, quantity, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?);
              `,
              [itemId, userId, ownsOrWantsItems === "OWNS", null, 1, now, now],
            );
          }
        }

        await connection.commit();
      } catch (error) {
        try {
          await connection.rollback();
        } catch (error) {
          console.warn(`Error rolling back transaction`, error);
        }
      } finally {
        await connection.release();
      }

      return closetListRef;
    },
  },
};

// This matches the ID that we return from ClosetList for the default list.
const DEFAULT_LIST_ID_PATTERN = /user-(.+?)-default-list-(OWNS|WANTS)/;

/**
 * Given a list ID returned from ClosetList (which the client might've passed
 * back to us in a mutation), parse it as either a *real* list ID, or the
 * placeholder ID we provide to "default" lists; and return the fields that
 * our ClosetList resolver expects in order to return the correct list. (That
 * is: `isDefaultList`, `id` (perhaps null), `userId`, and `ownsOrWantsItems`.
 * The resolver doesn't need all of the fields in both cases, but we return
 * both in case you want to use them for other things, e.g. checking the
 * `userId`!)
 *
 * (Or return null, if the list ID does not correspond to a default list *or* a
 * real list in the database.)
 */
async function loadClosetListOrDefaultList(listId, closetListLoader) {
  if (listId == null) {
    return null;
  }

  const defaultListMatch = listId.match(DEFAULT_LIST_ID_PATTERN);
  if (defaultListMatch) {
    const userId = defaultListMatch[1];
    const ownsOrWantsItems = defaultListMatch[2];
    return {
      isDefaultList: true,
      id: null,
      userId,
      ownsOrWantsItems,
    };
  }

  const closetList = await closetListLoader.load(listId);
  if (closetList) {
    return {
      isDefaultList: false,
      id: closetList.id,
      userId: closetList.userId,
      ownsOrWantsItems: closetList.hangersOwned ? "OWNS" : "WANTS",
    };
  }

  return null;
}

function isNC(item) {
  return (
    item.rarityIndex === 500 || item.rarityIndex === 0 || item.isManuallyNc
  );
}

module.exports = { typeDefs, resolvers };
