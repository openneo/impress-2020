const fetch = require("node-fetch");
const { gql } = require("apollo-server");
const { getPoseFromPetState } = require("../util");

const typeDefs = gql`
  type Outfit {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!
    closetedItems: [Item!]!
  }

  # TODO: This maybe should move to a separate file?
  type Pet {
    id: ID!
    name: String!
    petAppearance: PetAppearance!
    wornItems: [Item!]!

    species: Species! # to be deprecated? can use petAppearance? 🤔
    color: Color! # to be deprecated? can use petAppearance? 🤔
    pose: Pose! # to be deprecated? can use petAppearance? 🤔
    items: [Item!]! # deprecated alias for wornItems
  }

  extend type Query {
    outfit(id: ID!): Outfit
    petOnNeopetsDotCom(petName: String!): Pet
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
  Pet: {
    species: ({ customPetData }) => ({
      id: customPetData.custom_pet.species_id,
    }),
    color: ({ customPetData }) => ({ id: customPetData.custom_pet.color_id }),
    pose: ({ customPetData, petMetaData }) =>
      getPoseFromPetData(petMetaData, customPetData),
    petAppearance: async (
      { customPetData, petMetaData },
      _,
      { petTypeBySpeciesAndColorLoader, petStatesForPetTypeLoader }
    ) => {
      const petType = await petTypeBySpeciesAndColorLoader.load({
        speciesId: customPetData.custom_pet.species_id,
        colorId: customPetData.custom_pet.color_id,
      });
      const petStates = await petStatesForPetTypeLoader.load(petType.id);
      const pose = getPoseFromPetData(petMetaData, customPetData);
      const petState = petStates.find((ps) => getPoseFromPetState(ps) === pose);
      return { id: petState.id };
    },
    wornItems: ({ customPetData }) =>
      Object.values(customPetData.object_info_registry).map((o) => ({
        id: o.obj_info_id,
        name: o.name,
        description: o.description,
        thumbnailUrl: o.thumbnail_url,
        rarityIndex: o.rarity_index,
      })),
    items: (...args) => resolvers.Pet.wornItems(...args),
  },
  Query: {
    outfit: (_, { id }) => ({ id }),
    petOnNeopetsDotCom: async (
      _,
      { petName },
      {
        db,
        petTypeBySpeciesAndColorLoader,
        petStateByPetTypeAndAssetsLoader,
        itemLoader,
        itemTranslationLoader,
        swfAssetByRemoteIdLoader,
      }
    ) => {
      const [customPetData, petMetaData, __] = await Promise.all([
        loadCustomPetData(petName),
        loadPetMetaData(petName),
      ]);

      await saveModelingData(customPetData, petMetaData, {
        db,
        petTypeBySpeciesAndColorLoader,
        petStateByPetTypeAndAssetsLoader,
        itemLoader,
        itemTranslationLoader,
        swfAssetByRemoteIdLoader,
      });

      return { name: petName, customPetData, petMetaData };
    },
  },
};

async function loadPetMetaData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/PetService.getPet` + `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for pet meta data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  return json;
}

async function loadCustomPetData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
    `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for custom pet data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  if (!json.custom_pet) {
    throw new Error(`missing custom_pet data`);
  }

  return json;
}

function getPoseFromPetData(petMetaData, petCustomData) {
  const moodId = petMetaData.mood;
  const genderId = petMetaData.gender;
  if (Object.keys(petCustomData.custom_pet.biology_by_zone).length === 1) {
    return "UNCONVERTED";
  } else if (String(moodId) === "1" && String(genderId) === "1") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(genderId) === "2") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(genderId) === "1") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(genderId) === "2") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(genderId) === "1") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(genderId) === "2") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `genderId=${genderId}`
    );
  }
}

async function saveModelingData(
  customPetData,
  petMetaData,
  {
    db,
    petTypeBySpeciesAndColorLoader,
    petStateByPetTypeAndAssetsLoader,
    itemLoader,
    itemTranslationLoader,
    swfAssetByRemoteIdLoader,
  }
) {
  const customPet = customPetData.custom_pet;

  const objectInfos = Object.values(customPetData.object_info_registry);
  const incomingItems = objectInfos.map((objectInfo) => ({
    id: String(objectInfo.obj_info_id),
    zonesRestrict: objectInfo.zones_restrict,
    thumbnailUrl: objectInfo.thumbnail_url,
    category: objectInfo.category,
    type: objectInfo.type,
    rarityIndex: objectInfo.rarity_index,
    price: objectInfo.price,
    weightLbs: objectInfo.weight_lbs,
  }));
  const incomingItemTranslations = objectInfos.map((objectInfo) => ({
    itemId: String(objectInfo.obj_info_id),
    locale: "en",
    name: objectInfo.name,
    description: objectInfo.description,
    rarity: objectInfo.rarity,
  }));

  const objectAssets = Object.values(customPetData.object_asset_registry);
  const incomingItemSwfAssets = objectAssets.map((objectAsset) => ({
    type: "object",
    remoteId: String(objectAsset.asset_id),
    url: objectAsset.asset_url,
    zoneId: String(objectAsset.zone_id),
    zonesRestrict: "",
    bodyId: (currentBodyId) => {
      const incomingBodyId = String(customPet.body_id);

      if (currentBodyId == null) {
        // If this is a new asset, use the incoming body ID. This might not be
        // totally true, the real ID might be 0, but we're conservative to
        // start and will update it to 0 if we see a contradiction later!
        //
        // NOTE: There's an explicitly_body_specific column on Item. We don't
        //       need to consider it here, because it's specifically to
        //       override the heuristics in the old app that sometimes set
        //       bodyId=0 for incoming items depending on their zone. We don't
        //       do that here!
        return incomingBodyId;
      } else if (currentBodyId === "0") {
        // If this is already an all-bodies asset, keep it that way.
        return "0";
      } else if (currentBodyId !== incomingBodyId) {
        // If this isn't an all-bodies asset yet, but we've now seen it on two
        // different items, then make it an all-bodies asset!
        return "0";
      } else {
        // Okay, the row already exists, and its body ID matches this one.
        // No change!
        return currentBodyId;
      }
    },
  }));

  const biologyAssets = Object.values(customPet.biology_by_zone);
  const incomingPetSwfAssets = biologyAssets.map((biologyAsset) => ({
    type: "biology",
    remoteId: String(biologyAsset.part_id),
    url: biologyAsset.asset_url,
    zoneId: String(biologyAsset.zone_id),
    zonesRestrict: biologyAsset.zones_restrict,
    bodyId: "0",
  }));

  const incomingSwfAssets = [...incomingItemSwfAssets, ...incomingPetSwfAssets];

  const incomingPetType = {
    colorId: String(customPet.color_id),
    speciesId: String(customPet.species_id),
    bodyId: String(customPet.body_id),
    // NOTE: I skip the image_hash stuff here... on Rails, we set a hash on
    //       creation, and may or may not bother to update it, I forget? But
    //       here I don't want to bother with an update. We could maybe do
    //       a merge function to make it on create only, but eh, I don't
    //       care enough ^_^`
  };

  await Promise.all([
    syncToDb(db, [incomingPetType], {
      loader: petTypeBySpeciesAndColorLoader,
      tableName: "pet_types",
      buildLoaderKey: (row) => ({
        speciesId: row.speciesId,
        colorId: row.colorId,
      }),
      buildUpdateCondition: (row) => [
        `species_id = ? AND color_id = ?`,
        row.speciesId,
        row.colorId,
      ],
      includeUpdatedAt: false,
    }),
    syncToDb(db, incomingItems, {
      loader: itemLoader,
      tableName: "items",
      buildLoaderKey: (row) => row.id,
      buildUpdateCondition: (row) => [`id = ?`, row.id],
    }),
    syncToDb(db, incomingItemTranslations, {
      loader: itemTranslationLoader,
      tableName: "item_translations",
      buildLoaderKey: (row) => row.itemId,
      buildUpdateCondition: (row) => [
        `item_id = ? AND locale = "en"`,
        row.itemId,
      ],
    }),
    syncToDb(db, incomingSwfAssets, {
      loader: swfAssetByRemoteIdLoader,
      tableName: "swf_assets",
      buildLoaderKey: (row) => ({ type: row.type, remoteId: row.remoteId }),
      buildUpdateCondition: (row) => [
        `type = ? AND remote_id = ?`,
        row.type,
        row.remoteId,
      ],
      includeUpdatedAt: false,
    }),
  ]);

  // TODO: If we look up the potentially existing pet state earlier, then I
  //       think we can prime the cache and avoid creating a waterfall of
  //       queries here in the happy case, even though it'll look waterfall-y!
  // NOTE: This pet type should have been looked up when syncing pet type, so
  //       this should be cached.
  const petType = await petTypeBySpeciesAndColorLoader.load({
    colorId: String(customPet.color_id),
    speciesId: String(customPet.species_id),
  });
  const incomingPetState = {
    petTypeId: petType.id,
    swfAssetIds: incomingPetSwfAssets
      .map((row) => row.remoteId)
      .sort((a, b) => Number(a) - Number(b))
      .join(","),
    female: petMetaData.gender === 2 ? 1 : 0, // sorry for this column name :/
    moodId: String(petMetaData.mood),
    unconverted: incomingPetSwfAssets.length === 1 ? 1 : 0,
    labeled: 1,
  };

  await syncToDb(db, [incomingPetState], {
    loader: petStateByPetTypeAndAssetsLoader,
    tableName: "pet_states",
    buildLoaderKey: (row) => ({
      petTypeId: row.petTypeId,
      swfAssetIds: row.swfAssetIds,
    }),
    buildUpdateCondition: (row) => [
      `pet_type_id = ? AND swf_asset_ids = ?`,
      row.petTypeId,
      row.swfAssetIds,
    ],
    includeCreatedAt: false,
    includeUpdatedAt: false,
    // For pet states, syncing assets is easy: a new set of assets counts as a
    // new state, so, whatever! Just insert the relationships when inserting
    // the pet state, and ignore them any other time.
    afterInsert: async () => {
      // We need to load from the db to get the actual inserted IDs. Not lovely
      // for perf, but this is a real new-data model, so that's fine!
      let [petState, swfAssets] = await Promise.all([
        petStateByPetTypeAndAssetsLoader.load({
          petTypeId: incomingPetState.petTypeId,
          swfAssetIds: incomingPetState.swfAssetIds,
        }),
        swfAssetByRemoteIdLoader.loadMany(
          incomingPetSwfAssets.map((row) => ({
            type: row.type,
            remoteId: row.remoteId,
          }))
        ),
      ]);
      swfAssets = swfAssets.filter((sa) => sa != null);
      const qs = swfAssets.map((_) => `(?, ?, ?)`).join(", ");
      const values = swfAssets
        .map((sa) => ["PetState", petState.id, sa.id])
        .flat();
      await db.execute(
        `INSERT INTO parents_swf_assets (parent_type, parent_id, swf_asset_id)
         VALUES ${qs};`,
        values
      );
    },
  });
}

/**
 * Syncs the given data to the database: for each incoming row, if there's no
 * matching row in the loader, we insert a new row; or, if there's a matching
 * row in the loader but its data is different, we update it; or, if there's
 * no change, we do nothing.
 *
 * Automatically sets the `createdAt` and `updatedAt` timestamps for inserted
 * or updated rows.
 *
 * Will perform one call to the loader, and at most one INSERT, and at most one
 * UPDATE, regardless of how many rows we're syncing.
 */
async function syncToDb(
  db,
  incomingRows,
  {
    loader,
    tableName,
    buildLoaderKey,
    buildUpdateCondition,
    includeCreatedAt = true,
    includeUpdatedAt = true,
    afterInsert = null,
  }
) {
  const loaderKeys = incomingRows.map(buildLoaderKey);
  const currentRows = await loader.loadMany(loaderKeys);

  const inserts = [];
  const updates = [];
  for (const index in incomingRows) {
    const incomingRow = incomingRows[index];
    const currentRow = currentRows[index];

    // If there is no corresponding row in the database, prepare an insert.
    // TODO: Should probably converge on whether not-found is null or an error
    if (currentRow == null || currentRow instanceof Error) {
      const insert = {};
      for (const key in incomingRow) {
        let incomingValue = incomingRow[key];

        // If you pass a function as a value, we treat it as a merge function:
        // we'll pass it the current value, and you'll use it to determine and
        // return the incoming value. In this case, the row doesn't exist yet,
        // so the current value is `null`.
        if (typeof incomingValue === "function") {
          incomingValue = incomingValue(null);
        }

        insert[key] = incomingValue;
      }

      if (includeCreatedAt) {
        insert.createdAt = new Date();
      }
      if (includeUpdatedAt) {
        insert.updatedAt = new Date();
      }
      inserts.push(insert);

      // Remove this from the loader cache, so that loading again will fetch
      // the inserted row.
      loader.clear(buildLoaderKey(incomingRow));

      continue;
    }

    // If there's a row in the database, and some of the values don't match,
    // prepare an update with the updated fields only.
    const update = {};
    for (const key in incomingRow) {
      const currentValue = currentRow[key];
      let incomingValue = incomingRow[key];

      // If you pass a function as a value, we treat it as a merge function:
      // we'll pass it the current value, and you'll use it to determine and
      // return the incoming value.
      if (typeof incomingValue === "function") {
        incomingValue = incomingValue(currentValue);
      }

      if (currentValue !== incomingValue) {
        update[key] = incomingValue;
      }
    }

    if (Object.keys(update).length > 0) {
      if (includeUpdatedAt) {
        update.updatedAt = new Date();
      }
      updates.push({ incomingRow, update });

      // Remove this from the loader cache, so that loading again will fetch
      // the updated row.
      loader.clear(buildLoaderKey(incomingRow));
    }
  }

  // Do a bulk insert of anything that needs added.
  if (inserts.length > 0) {
    // Get the column names from the first row, and convert them to
    // underscore-case instead of camel-case.
    const rowKeys = Object.keys(inserts[0]).sort();
    const columnNames = rowKeys.map((key) =>
      key.replace(/[A-Z]/g, (m) => "_" + m[0].toLowerCase())
    );
    const columnsStr = columnNames.join(", ");
    const qs = columnNames.map((_) => "?").join(", ");
    const rowQs = inserts.map((_) => "(" + qs + ")").join(", ");
    const rowValues = inserts.map((row) => rowKeys.map((key) => row[key]));
    await db.execute(
      `INSERT INTO ${tableName} (${columnsStr}) VALUES ${rowQs};`,
      rowValues.flat()
    );
    if (afterInsert) {
      await afterInsert();
    }
  }

  // Do parallel updates of anything that needs updated.
  // NOTE: I feel like it's not possible to do bulk updates, even in a
  //       multi-statement mysql2 request? I might be wrong, but whatever; it's
  //       very uncommon, and any perf hit would be nbd.
  const updatePromises = [];
  for (const { incomingRow, update } of updates) {
    const rowKeys = Object.keys(update).sort();
    const rowValues = rowKeys.map((k) => update[k]);
    const columnNames = rowKeys.map((key) =>
      key.replace(/[A-Z]/g, (m) => "_" + m[0].toLowerCase())
    );
    const qs = columnNames.map((c) => `${c} = ?`).join(", ");
    const [conditionQs, ...conditionValues] = buildUpdateCondition(incomingRow);
    updatePromises.push(
      db.execute(
        `UPDATE ${tableName} SET ${qs} WHERE ${conditionQs} LIMIT 1;`,
        [...rowValues, ...conditionValues]
      )
    );
  }
  await Promise.all(updatePromises);
}

module.exports = { typeDefs, resolvers };
