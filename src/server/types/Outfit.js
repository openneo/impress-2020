const fetch = require("node-fetch");
const { gql } = require("apollo-server");

const typeDefs = gql`
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

  extend type Query {
    outfit(id: ID!): Outfit
    petOnNeopetsDotCom(petName: String!): Outfit
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
  // TODO: Use custom data to decide if Unconverted.
  const moodId = petMetaData.mood;
  const genderId = petMetaData.gender;
  if (String(moodId) === "1" && String(genderId) === "1") {
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
    zoneId: objectAsset.zone_id,
    zonesRestrict: "",
    // TODO: This doesn't actually work... sometimes it needs to be 0, yeah?
    //       So we actually have to do asset writing after we load the current
    //       row and compare... maybe a cutesy fn syntax here?
    bodyId: customPet.body_id,
  }));

  const biologyAssets = Object.values(customPet.biology_by_zone);
  const incomingPetSwfAssets = biologyAssets.map((biologyAsset) => ({
    type: "biology",
    remoteId: String(biologyAsset.part_id),
    url: biologyAsset.asset_url,
    zoneId: biologyAsset.zone_id,
    zonesRestrict: biologyAsset.zones_restrict,
    bodyId: 0,
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
      .map((a) => a.remoteId)
      .sort()
      .join(","),
    female: petMetaData.gender === 2, // sorry for this column name :/
    moodId: petMetaData.mood,
    unconverted: incomingPetSwfAssets.length === 1,
    labeled: true,
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
      const insert = { ...incomingRow };
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
    const updatedKeys = Object.keys(incomingRow).filter(
      (k) => incomingRow[k] !== currentRow[k]
    );
    if (updatedKeys.length > 0) {
      const update = {};
      for (const key of updatedKeys) {
        update[key] = incomingRow[key];
      }
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
    const rowFields = inserts.map((row) => rowKeys.map((key) => row[key]));
    await db.execute(
      `INSERT INTO ${tableName} (${columnsStr}) VALUES ${rowQs};`,
      rowFields.flat()
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
      db.execute(`UPDATE ${tableName} SET ${qs} WHERE ${conditionQs};`, [
        ...rowValues,
        ...conditionValues,
      ])
    );
  }
  await Promise.all(updatePromises);
}

module.exports = { typeDefs, resolvers };
