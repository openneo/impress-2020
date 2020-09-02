const { gql, makeExecutableSchema } = require("apollo-server");
const { addBeelineToSchema, beelinePlugin } = require("./lib/beeline-graphql");

const connectToDb = require("./db");
const buildLoaders = require("./loaders");
const neopets = require("./neopets");
const {
  capitalize,
  getPoseFromPetState,
  getPetStateFieldsFromPose,
  getPoseFromPetData,
  getEmotion,
  getGenderPresentation,
  getPoseName,
  getRestrictedZoneIds,
  loadBodyName,
  logToDiscord,
  normalizeRow,
} = require("./util");

const typeDefs = gql`
  directive @cacheControl(maxAge: Int!) on FIELD_DEFINITION | OBJECT

  enum LayerImageSize {
    SIZE_600
    SIZE_300
    SIZE_150
  }

  """
  The poses a PetAppearance can take!
  """
  enum Pose {
    HAPPY_MASC
    SAD_MASC
    SICK_MASC
    HAPPY_FEM
    SAD_FEM
    SICK_FEM
    UNCONVERTED
    UNKNOWN # for when we have the data, but we don't know what it is
  }

  """
  A pet's gender presentation: masculine or feminine.

  Neopets calls these "male" and "female", and I think that's silly and not wise
  to propagate further, especially in the context of a strictly visual app like
  Dress to Impress! This description isn't altogether correct either, but idk
  what's better :/
  """
  enum GenderPresentation {
    MASCULINE
    FEMININE
  }

  """
  A pet's emotion: happy, sad, or sick.

  Note that we don't ever show the angry emotion on Dress to Impress, because
  we don't have the data: it's impossible for a pet's passive emotion on the
  pet lookup to be angry!
  """
  enum Emotion {
    HAPPY
    SAD
    SICK
  }

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
  }

  # Cache for 1 week (unlikely to change)
  type PetAppearance @cacheControl(maxAge: 604800) {
    id: ID!
    species: Species!
    color: Color!
    pose: Pose!
    bodyId: ID!

    layers: [AppearanceLayer!]!
    restrictedZones: [Zone!]!

    petStateId: ID! # Deprecated, an alias for id
    # Whether this PetAppearance is known to look incorrect. This is a manual
    # flag that we set, in the case where this glitchy PetAppearance really did
    # appear on Neopets.com, and has since been fixed.
    isGlitched: Boolean!
  }

  type ItemAppearance {
    id: ID!
    item: Item!
    bodyId: ID!
    layers: [AppearanceLayer!]
    restrictedZones: [Zone!]!
  }

  # Cache for 1 week (unlikely to change)
  type AppearanceLayer @cacheControl(maxAge: 604800) {
    # The DTI ID. Guaranteed unique across all layers of all types.
    id: ID!

    # The Neopets ID. Guaranteed unique across layers of the _same_ type, but
    # not of different types. That is, it's allowed and common for an item
    # layer and a pet layer to have the same remoteId.
    remoteId: ID!

    zone: Zone!
    imageUrl(size: LayerImageSize): String

    """
    This layer as a single SVG, if available.

    This might not be available if the asset isn't converted yet by Neopets,
    or if it's not as simple as a single SVG (e.g. animated).
    """
    svgUrl: String

    """
    This layer as a single SWF, if available.

    At time of writing, all layers have SWFs. But I've marked this nullable
    because I'm not sure this will continue to be true after the HTML5
    migration, and I'd like clients to guard against it.
    """
    swfUrl: String

    """
    This layer can fit on PetAppearances with the same bodyId. "0" is a
    special body ID that indicates it fits all PetAppearances.
    """
    bodyId: ID!

    """
    The item this layer is for, if any. (For pet layers, this is null.)
    """
    item: Item

    """
    The zones that this layer restricts, if any. Note that, for item layers,
    this is generally empty and the restriction is on the ItemAppearance, not
    the individual layers. For pet layers, this is generally used for
    Unconverted pets.

    Deprecated, aggregated into PetAppearance for a simpler API.
    """
    restrictedZones: [Zone!]!
  }

  # Cache for 1 week (unlikely to change)
  type Zone @cacheControl(maxAge: 604800) {
    id: ID!
    depth: Int!
    label: String!
    isCommonlyUsedByItems: Boolean!
  }

  type ItemSearchResult {
    query: String!
    zones: [Zone!]!
    items: [Item!]!
  }

  # Cache for 1 week (unlikely to change)
  type Color @cacheControl(maxAge: 604800) {
    id: ID!
    name: String!
    isStandard: Boolean!
  }

  # Cache for 1 week (unlikely to change)
  type Species @cacheControl(maxAge: 604800) {
    id: ID!
    name: String!

    # The bodyId for PetAppearances that use this species and a standard color.
    # We use this to preload the standard body IDs, so that items stay when
    # switching between standard colors.
    standardBodyId: ID!
  }

  type SpeciesColorPair {
    species: Species!
    color: Color!
  }

  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!

    species: Species! # to be deprecated? can use petAppearance? 🤔
    color: Color! # to be deprecated? can use petAppearance? 🤔
    pose: Pose! # to be deprecated? can use petAppearance? 🤔
    items: [Item!]! # deprecated alias for wornItems
  }

  type User {
    id: ID!
    username: String!
  }

  type Query {
    allColors: [Color!]! @cacheControl(maxAge: 10800) # Cache for 3 hours (we might add more!)
    allSpecies: [Species!]! @cacheControl(maxAge: 10800) # Cache for 3 hours (we might add more!)
    allValidSpeciesColorPairs: [SpeciesColorPair!]! # deprecated
    allZones: [Zone!]!
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

    petAppearanceById(id: ID!): PetAppearance @cacheControl(maxAge: 10800) # Cache for 3 hours (Support might edit!)
    # The canonical pet appearance for the given species, color, and pose.
    # Null if we don't have any data for this combination.
    petAppearance(speciesId: ID!, colorId: ID!, pose: Pose!): PetAppearance
      @cacheControl(maxAge: 10800) # Cache for 3 hours (we might model more!)
    # All pet appearances we've ever seen for the given species and color. Note
    # that this might include multiple copies for the same pose, and they might
    # even be glitched data. We use this for Support tools, and we don't cache
    # it to make sure that Support users are always seeing the most up-to-date
    # version here (even if the standard pose picker is still showing outdated
    # cached canonical poses).
    petAppearances(speciesId: ID!, colorId: ID!): [PetAppearance!]!
    outfit(id: ID!): Outfit

    color(id: ID!): Color
    species(id: ID!): Species

    user(id: ID!): User

    petOnNeopetsDotCom(petName: String!): Outfit
  }

  type RemoveLayerFromItemMutationResult {
    layer: AppearanceLayer!
    item: Item!
  }

  type Mutation {
    setManualSpecialColor(
      itemId: ID!
      colorId: ID
      supportSecret: String!
    ): Item!

    setItemExplicitlyBodySpecific(
      itemId: ID!
      explicitlyBodySpecific: Boolean!
      supportSecret: String!
    ): Item!

    setLayerBodyId(
      layerId: ID!
      bodyId: ID!
      supportSecret: String!
    ): AppearanceLayer!

    removeLayerFromItem(
      layerId: ID!
      itemId: ID!
      supportSecret: String!
    ): RemoveLayerFromItemMutationResult!

    setPetAppearancePose(
      appearanceId: ID!
      pose: Pose!
      supportSecret: String!
    ): PetAppearance!

    setPetAppearanceIsGlitched(
      appearanceId: ID!
      isGlitched: Boolean!
      supportSecret: String!
    ): PetAppearance!
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
  PetAppearance: {
    color: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.colorId };
    },
    species: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return { id: petType.speciesId };
    },
    bodyId: async ({ id }, _, { petStateLoader, petTypeLoader }) => {
      const petState = await petStateLoader.load(id);
      const petType = await petTypeLoader.load(petState.petTypeId);
      return petType.bodyId;
    },
    pose: async ({ id }, _, { petStateLoader }) => {
      const petState = await petStateLoader.load(id);
      return getPoseFromPetState(petState);
    },
    layers: async ({ id }, _, { petSwfAssetLoader }) => {
      const swfAssets = await petSwfAssetLoader.load(id);
      return swfAssets;
    },
    restrictedZones: async ({ id }, _, { petSwfAssetLoader }) => {
      // The restricted zones are defined on the layers. Load them and aggegate
      // the zones, then uniquify and sort them for ease of use.
      const swfAssets = await petSwfAssetLoader.load(id);
      let restrictedZoneIds = swfAssets
        .map((sa) => getRestrictedZoneIds(sa.zonesRestrict))
        .flat();
      restrictedZoneIds = [...new Set(restrictedZoneIds)];
      restrictedZoneIds.sort((a, b) => parseInt(a) - parseInt(b));
      return restrictedZoneIds.map((id) => ({ id }));
    },
    petStateId: ({ id }) => id,
    isGlitched: async ({ id }, _, { petStateLoader }) => {
      const petState = await petStateLoader.load(id);
      return petState.glitched;
    },
  },
  AppearanceLayer: {
    bodyId: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.remoteId;
    },
    bodyId: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.bodyId;
    },
    zone: async ({ id }, _, { swfAssetLoader, zoneLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return { id: layer.zoneId };
    },
    restrictedZones: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return getRestrictedZoneIds(layer.zonesRestrict).map((id) => ({ id }));
    },
    swfUrl: async ({ id }, _, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);
      return layer.url;
    },
    imageUrl: async ({ id }, { size }, { swfAssetLoader }) => {
      const layer = await swfAssetLoader.load(id);

      if (!layer.hasImage) {
        return null;
      }

      const sizeNum = size.split("_")[1];

      const rid = layer.remoteId;
      const paddedId = rid.padStart(12, "0");
      const rid1 = paddedId.slice(0, 3);
      const rid2 = paddedId.slice(3, 6);
      const rid3 = paddedId.slice(6, 9);
      const time = Number(new Date(layer.convertedAt));

      return (
        `https://impress-asset-images.s3.amazonaws.com/${layer.type}` +
        `/${rid1}/${rid2}/${rid3}/${rid}/${sizeNum}x${sizeNum}.png?v2-${time}`
      );
    },
    svgUrl: async ({ id }, _, { db, swfAssetLoader, svgLogger }) => {
      const layer = await swfAssetLoader.load(id);
      let manifest = layer.manifest && JSON.parse(layer.manifest);

      // When the manifest is specifically null, that means we don't know if
      // it exists yet. Load it to find out!
      if (manifest === null) {
        manifest = await neopets.loadAssetManifest(layer.url);

        // Then, write the new manifest. We make sure to write an empty string
        // if there was no manifest, to signify that it doesn't exist, so we
        // don't need to bother looking it up again.
        //
        // TODO: Someday the manifests will all exist, right? So we'll want to
        //       reload all the missing ones at that time.
        manifest = manifest || "";
        const [
          result,
        ] = await db.execute(
          `UPDATE swf_assets SET manifest = ? WHERE id = ? LIMIT 1;`,
          [manifest, layer.id]
        );
        if (result.affectedRows !== 1) {
          throw new Error(
            `Expected to affect 1 asset, but affected ${result.affectedRows}`
          );
        }
        console.log(
          `Loaded and saved manifest for ${layer.type} ${layer.remoteId}. ` +
            `DTI ID: ${layer.id}. Exists?: ${Boolean(manifest)}`
        );
      }

      if (!manifest) {
        svgLogger.log("no-manifest");
        return null;
      }

      if (manifest.assets.length !== 1) {
        svgLogger.log(`wrong-asset-count:${manifest.assets.length}!=1`);
        return null;
      }

      const asset = manifest.assets[0];
      if (asset.format !== "vector") {
        svgLogger.log(`wrong-asset-format:${asset.format}`);
        return null;
      }

      if (asset.assetData.length !== 1) {
        svgLogger.log(`wrong-assetData-length:${asset.assetData.length}!=1`);
        return null;
      }

      svgLogger.log("success");
      const assetDatum = asset.assetData[0];
      const url = new URL(assetDatum.path, "http://images.neopets.com");
      return url.toString();
    },
    item: async ({ id }, _, { db }) => {
      // TODO: If this becomes a popular request, we'll definitely need to
      // loaderize this! I'm cheating for now because it's just Support, one at
      // a time.
      const [rows] = await db.query(
        `
        SELECT parent_id FROM parents_swf_assets
        WHERE swf_asset_id = ? AND parent_type = "Item" LIMIT 1;
      `,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return { id: String(rows[0].parent_id) };
    },
  },
  Zone: {
    depth: async ({ id }, _, { zoneLoader }) => {
      // TODO: Should we extend this loader-in-field pattern elsewhere? I like
      //       that we avoid the fetch in cases where we only want the zone ID,
      //       but it adds complexity 🤔
      const zone = await zoneLoader.load(id);
      return zone.depth;
    },
    label: async ({ id }, _, { zoneTranslationLoader }) => {
      const zoneTranslation = await zoneTranslationLoader.load(id);
      return zoneTranslation.label;
    },
    isCommonlyUsedByItems: async ({ id }, _, { zoneLoader }) => {
      // Zone metadata marks item zones with types 2, 3, and 4. But also, in
      // practice, the Biology Effects zone (type 1) has been used for a few
      // items too. So, that's what we return true for!
      const zone = await zoneLoader.load(id);
      const isMarkedForItems = ["2", "3", "4"].includes(zone.typeId);
      const isBiologyEffects = zone.id === "4";
      return isMarkedForItems || isBiologyEffects;
    },
  },
  Color: {
    name: async ({ id }, _, { colorTranslationLoader }) => {
      const colorTranslation = await colorTranslationLoader.load(id);
      return capitalize(colorTranslation.name);
    },
    isStandard: async ({ id }, _, { colorLoader }) => {
      const color = await colorLoader.load(id);
      return color.standard ? true : false;
    },
  },
  Species: {
    name: async ({ id }, _, { speciesTranslationLoader }) => {
      const speciesTranslation = await speciesTranslationLoader.load(id);
      return capitalize(speciesTranslation.name);
    },
    standardBodyId: async ({ id }, _, { petTypeBySpeciesAndColorLoader }) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: id,
        colorId: "8", // Blue
      });
      return petType.bodyId;
    },
  },
  Outfit: {
    name: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return outfit.name;
    },
    petAppearance: async ({ id }, _, { outfitLoader }) => {
      const outfit = await outfitLoader.load(id);
      return { id: outfit.petStateId };
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
  },
  User: {
    username: async ({ id }, _, { userLoader }) => {
      const user = await userLoader.load(id);
      return user.name;
    },
  },
  Query: {
    allColors: async (_, { ids }, { colorLoader }) => {
      const allColors = await colorLoader.loadAll();
      return allColors;
    },
    allSpecies: async (_, { ids }, { speciesLoader }) => {
      const allSpecies = await speciesLoader.loadAll();
      return allSpecies;
    },
    allValidSpeciesColorPairs: async (_, __, { loadAllPetTypes }) => {
      const allPetTypes = await loadAllPetTypes();
      const allPairs = allPetTypes.map((pt) => ({
        color: { id: pt.colorId },
        species: { id: pt.speciesId },
      }));
      return allPairs;
    },
    allZones: async (_, __, { zoneLoader }) => {
      const zones = await zoneLoader.loadAll();
      return zones.map(({ id }) => ({ id }));
    },
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
    petAppearanceById: (_, { id }) => ({ id }),
    petAppearance: async (
      _,
      { speciesId, colorId, pose },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });

      // TODO: We could query for this more directly, instead of loading all
      //       appearances 🤔
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      if (!petState) {
        return null;
      }

      return { id: petState.id };
    },
    petAppearances: async (
      _,
      { speciesId, colorId },
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId,
        colorId,
      });
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      return petStates.map((petState) => ({ id: petState.id }));
    },
    outfit: (_, { id }) => ({ id }),
    user: async (_, { id }, { userLoader }) => {
      try {
        const user = await userLoader.load(id);
      } catch (e) {
        if (e.message.includes("could not find user")) {
          return null;
        } else {
          throw e;
        }
      }

      return { id };
    },
    petOnNeopetsDotCom: async (_, { petName }) => {
      const [petMetaData, customPetData] = await Promise.all([
        neopets.loadPetMetaData(petName),
        neopets.loadCustomPetData(petName),
      ]);
      const outfit = {
        // TODO: This isn't a fully-working Outfit object. It works for the
        //       client as currently implemented, but we'll probably want to
        //       move the client and this onto our more generic fields!
        species: { id: customPetData.custom_pet.species_id },
        color: { id: customPetData.custom_pet.color_id },
        pose: getPoseFromPetData(petMetaData, customPetData),
        items: Object.values(customPetData.object_info_registry).map((o) => ({
          id: o.obj_info_id,
          name: o.name,
          description: o.description,
          thumbnailUrl: o.thumbnail_url,
          rarityIndex: o.rarity_index,
        })),
      };
      return outfit;
    },
    color: async (_, { id }, { colorLoader }) => {
      const color = await colorLoader.load(id);
      if (!color) {
        return null;
      }
      return { id };
    },
    species: async (_, { id }, { speciesLoader }) => {
      const species = await speciesLoader.load(id);
      if (!species) {
        return null;
      }
      return { id };
    },
  },
  Mutation: {
    setManualSpecialColor: async (
      _,
      { itemId, colorId, supportSecret },
      { itemLoader, itemTranslationLoader, colorTranslationLoader, db }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldItem = await itemLoader.load(itemId);

      const [
        result,
      ] = await db.execute(
        `UPDATE items SET manual_special_color_id = ? WHERE id = ? LIMIT 1`,
        [colorId, itemId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 item, but affected ${result.affectedRows}`
        );
      }

      itemLoader.clear(itemId); // we changed the item, so clear it from cache

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const [
            itemTranslation,
            oldColorTranslation,
            newColorTranslation,
          ] = await Promise.all([
            itemTranslationLoader.load(itemId),
            oldItem.manualSpecialColorId
              ? colorTranslationLoader.load(oldItem.manualSpecialColorId)
              : Promise.resolve(null),
            colorId
              ? colorTranslationLoader.load(colorId)
              : Promise.resolve(null),
          ]);

          const oldColorName = oldColorTranslation
            ? capitalize(oldColorTranslation.name)
            : "Auto-detect";
          const newColorName = newColorTranslation
            ? capitalize(newColorTranslation.name)
            : "Auto-detect";
          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${itemTranslation.name}`,
                thumbnail: {
                  url: oldItem.thumbnailUrl,
                  height: 80,
                  width: 80,
                },
                fields: [
                  {
                    name: "Special color",
                    value: `${oldColorName} → **${newColorName}**`,
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress.openneo.net/items/${oldItem.id}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { id: itemId };
    },

    setItemExplicitlyBodySpecific: async (
      _,
      { itemId, explicitlyBodySpecific, supportSecret },
      { itemLoader, itemTranslationLoader, db }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldItem = await itemLoader.load(itemId);

      const [
        result,
      ] = await db.execute(
        `UPDATE items SET explicitly_body_specific = ? WHERE id = ? LIMIT 1`,
        [explicitlyBodySpecific ? 1 : 0, itemId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 item, but affected ${result.affectedRows}`
        );
      }

      itemLoader.clear(itemId); // we changed the item, so clear it from cache

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const itemTranslation = await itemTranslationLoader.load(itemId);
          const oldRuleName = oldItem.explicitlyBodySpecific
            ? "Body specific"
            : "Auto-detect";
          const newRuleName = explicitlyBodySpecific
            ? "Body specific"
            : "Auto-detect";
          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${itemTranslation.name}`,
                thumbnail: {
                  url: oldItem.thumbnailUrl,
                  height: 80,
                  width: 80,
                },
                fields: [
                  {
                    name: "Pet compatibility rule",
                    value: `${oldRuleName} → **${newRuleName}**`,
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress.openneo.net/items/${oldItem.id}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { id: itemId };
    },

    setLayerBodyId: async (
      _,
      { layerId, bodyId, supportSecret },
      {
        itemLoader,
        itemTranslationLoader,
        swfAssetLoader,
        zoneTranslationLoader,
        db,
      }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldSwfAsset = await swfAssetLoader.load(layerId);

      const [
        result,
      ] = await db.execute(
        `UPDATE swf_assets SET body_id = ? WHERE id = ? LIMIT 1`,
        [bodyId, layerId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 layer, but affected ${result.affectedRows}`
        );
      }

      swfAssetLoader.clear(layerId); // we changed it, so clear it from cache

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const itemId = await db
            .execute(
              `SELECT parent_id FROM parents_swf_assets
             WHERE swf_asset_id = ? AND parent_type = "Item" LIMIT 1;`,
              [layerId]
            )
            .then(([rows]) => normalizeRow(rows[0]).parentId);

          const [
            item,
            itemTranslation,
            zoneTranslation,
            oldBodyName,
            newBodyName,
          ] = await Promise.all([
            itemLoader.load(itemId),
            itemTranslationLoader.load(itemId),
            zoneTranslationLoader.load(oldSwfAsset.zoneId),
            loadBodyName(oldSwfAsset.bodyId, db),
            loadBodyName(bodyId, db),
          ]);

          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${itemTranslation.name}`,
                thumbnail: {
                  url: item.thumbnailUrl,
                  height: 80,
                  width: 80,
                },
                fields: [
                  {
                    name:
                      `Layer ${layerId} (${zoneTranslation.label}): ` +
                      `Pet compatibility`,
                    value: `${oldBodyName} → **${newBodyName}**`,
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress.openneo.net/items/${itemId}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { id: layerId };
    },

    removeLayerFromItem: async (
      _,
      { layerId, itemId, supportSecret },
      {
        itemLoader,
        itemTranslationLoader,
        swfAssetLoader,
        zoneTranslationLoader,
        db,
      }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldSwfAsset = await swfAssetLoader.load(layerId);

      const [result] = await db.execute(
        `DELETE FROM parents_swf_assets ` +
          `WHERE swf_asset_id = ? AND parent_type = "Item" AND parent_id = ? ` +
          `LIMIT 1`,
        [layerId, itemId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 layer, but affected ${result.affectedRows}`
        );
      }

      swfAssetLoader.clear(layerId); // we changed it, so clear it from cache

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const [
            item,
            itemTranslation,
            zoneTranslation,
            bodyName,
          ] = await Promise.all([
            itemLoader.load(itemId),
            itemTranslationLoader.load(itemId),
            zoneTranslationLoader.load(oldSwfAsset.zoneId),
            loadBodyName(oldSwfAsset.bodyId, db),
          ]);

          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${itemTranslation.name}`,
                thumbnail: {
                  url: item.thumbnailUrl,
                  height: 80,
                  width: 80,
                },
                fields: [
                  {
                    name: `Layer ${layerId} (${zoneTranslation.label})`,
                    value: `❌ Removed from ${bodyName}`,
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress.openneo.net/items/${itemId}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { layer: { id: layerId }, item: { id: itemId } };
    },

    setPetAppearancePose: async (
      _,
      { appearanceId, pose, supportSecret },
      {
        colorTranslationLoader,
        speciesTranslationLoader,
        petStateLoader,
        petTypeLoader,
        db,
      }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldPetState = await petStateLoader.load(appearanceId);

      const { moodId, female, unconverted } = getPetStateFieldsFromPose(pose);

      const [result] = await db.execute(
        `UPDATE pet_states SET mood_id = ?, female = ?, unconverted = ?
         WHERE id = ? LIMIT 1`,
        [moodId, female, unconverted, appearanceId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 layer, but affected ${result.affectedRows}`
        );
      }

      // we changed it, so clear it from cache
      petStateLoader.clear(appearanceId);

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const petType = await petTypeLoader.load(oldPetState.petTypeId);
          const [colorTranslation, speciesTranslation] = await Promise.all([
            colorTranslationLoader.load(petType.colorId),
            speciesTranslationLoader.load(petType.speciesId),
          ]);

          const oldPose = getPoseFromPetState(oldPetState);
          const colorName = capitalize(colorTranslation.name);
          const speciesName = capitalize(speciesTranslation.name);

          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${colorName} ${speciesName}`,
                thumbnail: {
                  url: `http://pets.neopets.com/cp/${
                    petType.basicImageHash || petType.imageHash
                  }/1/6.png`,
                  height: 150,
                  width: 150,
                },
                fields: [
                  {
                    name: `Appearance ${appearanceId}: Pose`,
                    value: `${getPoseName(oldPose)} → **${getPoseName(pose)}**`,
                  },
                  {
                    name: "As a reminder…",
                    value: "…the thumbnail might not match!",
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress-2020.openneo.net/outfits/new?species=${petType.speciesId}&color=${petType.colorId}&pose=${pose}&state=${appearanceId}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { id: appearanceId };
    },

    setPetAppearanceIsGlitched: async (
      _,
      { appearanceId, isGlitched, supportSecret },
      {
        colorTranslationLoader,
        speciesTranslationLoader,
        petStateLoader,
        petTypeLoader,
        db,
      }
    ) => {
      if (supportSecret !== process.env["SUPPORT_SECRET"]) {
        throw new Error(`Support secret is incorrect. Try setting up again?`);
      }

      const oldPetState = await petStateLoader.load(appearanceId);

      const [
        result,
      ] = await db.execute(
        `UPDATE pet_states SET glitched = ? WHERE id = ? LIMIT 1`,
        [isGlitched, appearanceId]
      );

      if (result.affectedRows !== 1) {
        throw new Error(
          `Expected to affect 1 layer, but affected ${result.affectedRows}`
        );
      }

      // we changed it, so clear it from cache
      petStateLoader.clear(appearanceId);

      if (process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"]) {
        try {
          const petType = await petTypeLoader.load(oldPetState.petTypeId);
          const [colorTranslation, speciesTranslation] = await Promise.all([
            colorTranslationLoader.load(petType.colorId),
            speciesTranslationLoader.load(petType.speciesId),
          ]);

          const colorName = capitalize(colorTranslation.name);
          const speciesName = capitalize(speciesTranslation.name);

          const pose = getPoseFromPetState(oldPetState);
          const oldGlitchinessState =
            String(oldPetState.glitched) === "1" ? "Glitched" : "Valid";
          const newGlitchinessState = isGlitched ? "Glitched" : "Valid";

          await logToDiscord({
            embeds: [
              {
                title: `🛠 ${colorName} ${speciesName}`,
                thumbnail: {
                  url: `http://pets.neopets.com/cp/${
                    petType.basicImageHash || petType.imageHash
                  }/1/6.png`,
                  height: 150,
                  width: 150,
                },
                fields: [
                  {
                    name: `Appearance ${appearanceId}`,
                    value: `${oldGlitchinessState} → **${newGlitchinessState}**`,
                  },
                ],
                timestamp: new Date().toISOString(),
                url: `https://impress-2020.openneo.net/outfits/new?species=${petType.speciesId}&color=${petType.colorId}&pose=${pose}&state=${appearanceId}`,
              },
            ],
          });
        } catch (e) {
          console.error("Error sending Discord support log", e);
        }
      } else {
        console.warn("No Discord support webhook provided, skipping");
      }

      return { id: appearanceId };
    },
  },
};

let lastSvgLogger = null;
const svgLogging = {
  requestDidStart() {
    return {
      willSendResponse({ operationName }) {
        const logEntries = lastSvgLogger.entries;
        if (logEntries.length === 0) {
          return;
        }

        console.log(`[svgLogger] Operation: ${operationName}`);

        const logEntryCounts = {};
        for (const logEntry of logEntries) {
          logEntryCounts[logEntry] = (logEntryCounts[logEntry] || 0) + 1;
        }

        const logEntriesSortedByCount = Object.entries(logEntryCounts).sort(
          (a, b) => b[1] - a[1]
        );
        for (const [logEntry, count] of logEntriesSortedByCount) {
          console.log(`[svgLogger] - ${logEntry}: ${count}`);
        }
      },
    };
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });
const plugins = [svgLogging];

if (process.env["NODE_ENV"] !== "test") {
  addBeelineToSchema(schema);
  plugins.push(beelinePlugin);
}

const config = {
  schema,
  context: async () => {
    const db = await connectToDb();

    const svgLogger = {
      entries: [],
      log(entry) {
        this.entries.push(entry);
      },
    };
    lastSvgLogger = svgLogger;

    return {
      svgLogger,
      db,
      ...buildLoaders(db),
    };
  },

  plugins,

  // Enable Playground in production :)
  introspection: true,
  playground: {
    endpoint: "/api/graphql",
  },
};

if (require.main === module) {
  const { ApolloServer } = require("apollo-server");
  const server = new ApolloServer(config);
  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

module.exports = { config };
