/**
 * saveModelingData takes data about a pet (generated by `loadCustomPetData`
 * and `loadPetMetaData`), and a GQL-y context object with a `db` and some
 * loaders; and updates the database to match.
 *
 * These days, most calls to this function are a no-op: we detect that the
 * database already contains this data, and end up doing no writes. But when a
 * pet contains data we haven't seen before, we write!
 *
 * NOTE: This function currently only acts if process.env["USE_NEW_MODELING"]
 *       is set to "1". Otherwise, it does nothing. This is because, while this
 *       new modeling code seems to work well for modern stuff, it doesn't
 *       upload SWFs to the Classic DTI Linode box, and doesn't upload PNGs to
 *       AWS. Both are necessary for compatibility with Classic DTI, and PNGs
 *       are necessary (even on Impress 2020) until all assets are converted to
 *       HTML5.
 */
async function saveModelingData(customPetData, petMetaData, context) {
  const modelingLogs = [];
  const addToModelingLogs = (entry) => {
    console.info("[Modeling] " + JSON.stringify(entry, null, 4));
    modelingLogs.push(entry);
  };
  context = { ...context, addToModelingLogs };

  await Promise.all([
    savePetTypeAndStateModelingData(customPetData, petMetaData, context),
    saveItemModelingData(customPetData, context),
    saveSwfAssetModelingData(customPetData, context),
  ]);

  if (modelingLogs.length > 0) {
    const { db } = context;
    await db.execute(
      `INSERT INTO modeling_logs (log_json, pet_name) VALUES (?, ?)`,
      [JSON.stringify(modelingLogs, null, 4), petMetaData.name]
    );
  }
}

async function savePetTypeAndStateModelingData(
  customPetData,
  petMetaData,
  context
) {
  // NOTE: When we automatically model items with "@imageHash" pet names, we
  // can't load corresponding metadata. That's fine, the script is just looking
  // for new item data anyway, we can skip this step altogether in that case!
  if (petMetaData.mood == null || petMetaData.gender == null) {
    return;
  }

  const {
    db,
    petTypeBySpeciesAndColorLoader,
    petStateByPetTypeAndAssetsLoader,
    swfAssetByRemoteIdLoader,
    addToModelingLogs,
  } = context;

  const incomingPetType = {
    colorId: String(customPetData.custom_pet.color_id),
    speciesId: String(customPetData.custom_pet.species_id),
    bodyId: String(customPetData.custom_pet.body_id),
    // NOTE: I skip the image_hash stuff here... on Rails, we set a hash on
    //       creation, and may or may not bother to update it, I forget? But
    //       here I don't want to bother with an update. We could maybe do
    //       a merge function to make it on create only, but eh, I don't
    //       care enough ^_^`
  };

  await syncToDb(db, [incomingPetType], {
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
    addToModelingLogs,
  });

  // NOTE: This pet type should have been looked up when syncing pet type, so
  //       this should be cached.
  const petType = await petTypeBySpeciesAndColorLoader.load({
    colorId: String(customPetData.custom_pet.color_id),
    speciesId: String(customPetData.custom_pet.species_id),
  });
  const biologyAssets = Object.values(customPetData.custom_pet.biology_by_zone);
  const incomingPetState = {
    petTypeId: petType.id,
    swfAssetIds: biologyAssets
      .map((row) => row.part_id)
      .sort((a, b) => Number(a) - Number(b))
      .join(","),
    female: petMetaData.gender === 2 ? 1 : 0, // sorry for this column name :/
    moodId: String(petMetaData.mood),
    unconverted: biologyAssets.length === 1 ? 1 : 0,
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
          biologyAssets.map((asset) => ({
            type: "biology",
            remoteId: String(asset.part_id),
          }))
        ),
      ]);
      swfAssets = swfAssets.filter((sa) => sa != null);
      if (swfAssets.length === 0) {
        throw new Error(`pet state ${petState.id} has no saved assets?`);
      }

      const relationshipInserts = swfAssets.map((sa) => ({
        parentType: "PetState",
        parentId: petState.id,
        swfAssetId: sa.id,
      }));

      const qs = swfAssets.map((_) => `(?, ?, ?)`).join(", ");
      const values = relationshipInserts
        .map(({ parentType, parentId, swfAssetId }) => [
          parentType,
          parentId,
          swfAssetId,
        ])
        .flat();
      await db.execute(
        `INSERT INTO parents_swf_assets (parent_type, parent_id, swf_asset_id)
         VALUES ${qs};`,
        values
      );

      addToModelingLogs({
        tableName: "parents_swf_assets",
        inserts: relationshipInserts,
        updates: [],
      });
    },
    addToModelingLogs,
  });
}

async function saveItemModelingData(customPetData, context) {
  const { db, itemLoader, itemTranslationLoader, addToModelingLogs } = context;

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

  await Promise.all([
    syncToDb(db, incomingItems, {
      loader: itemLoader,
      tableName: "items",
      buildLoaderKey: (row) => row.id,
      buildUpdateCondition: (row) => [`id = ?`, row.id],
      addToModelingLogs,
    }),
    syncToDb(db, incomingItemTranslations, {
      loader: itemTranslationLoader,
      tableName: "item_translations",
      buildLoaderKey: (row) => row.itemId,
      buildUpdateCondition: (row) => [
        `item_id = ? AND locale = "en"`,
        row.itemId,
      ],
      addToModelingLogs,
    }),
  ]);
}

async function saveSwfAssetModelingData(customPetData, context) {
  const { db, swfAssetByRemoteIdLoader, addToModelingLogs } = context;

  // NOTE: It seems like sometimes customPetData.object_asset_registry is
  // an object keyed by asset ID, and sometimes it's an array? Uhhh hm. Well,
  // Object.values does what we want in both cases!
  const objectAssets = Object.values(customPetData.object_asset_registry);
  const incomingItemSwfAssets = objectAssets.map((objectAsset) => ({
    type: "object",
    remoteId: String(objectAsset.asset_id),
    url: objectAsset.asset_url,
    zoneId: String(objectAsset.zone_id),
    zonesRestrict: "",
    bodyId: (currentBodyId) => {
      const incomingBodyId = String(customPetData.custom_pet.body_id);

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

  const biologyAssets = Object.values(customPetData.custom_pet.biology_by_zone);
  const incomingPetSwfAssets = biologyAssets.map((biologyAsset) => ({
    type: "biology",
    remoteId: String(biologyAsset.part_id),
    url: biologyAsset.asset_url,
    zoneId: String(biologyAsset.zone_id),
    zonesRestrict: biologyAsset.zones_restrict,
    bodyId: "0",
  }));

  const incomingSwfAssets = [...incomingItemSwfAssets, ...incomingPetSwfAssets];

  // Build a map from asset ID to item ID. We'll use this later to build the
  // new parents_swf_assets rows.
  const assetIdToItemIdMap = new Map();
  const objectInfos = Object.values(customPetData.object_info_registry);
  for (const objectInfo of objectInfos) {
    const itemId = String(objectInfo.obj_info_id);
    const assetIds = Object.values(objectInfo.assets_by_zone).map(String);
    for (const assetId of assetIds) {
      assetIdToItemIdMap.set(assetId, itemId);
    }
  }

  await syncToDb(db, incomingSwfAssets, {
    loader: swfAssetByRemoteIdLoader,
    tableName: "swf_assets",
    buildLoaderKey: (row) => ({ type: row.type, remoteId: row.remoteId }),
    buildUpdateCondition: (row) => [
      `type = ? AND remote_id = ?`,
      row.type,
      row.remoteId,
    ],
    includeUpdatedAt: false,
    afterInsert: async (inserts) => {
      // After inserting the assets, insert corresponding rows in
      // parents_swf_assets for item assets, to mark the asset as belonging to
      // the item. (We do this separately for pet states, so that we can get
      // the pet state ID first.)
      const itemAssetInserts = inserts.filter((i) => i.type === "object");
      if (itemAssetInserts.length === 0) {
        return;
      }

      const relationshipInserts = itemAssetInserts.map(({ remoteId }) => ({
        parentType: "Item",
        parentId: assetIdToItemIdMap.get(remoteId),
        remoteId,
      }));

      const qs = itemAssetInserts
        .map(
          (_) =>
            // A bit cheesy: we use a subquery here to insert _our_ ID for the
            // asset, despite only having remote_id available here. This saves
            // us from another round-trip to SELECT the inserted IDs.
            `(?, ?, ` +
            `(SELECT id FROM swf_assets WHERE type = "object" AND remote_id = ?))`
        )
        .join(", ");
      const values = relationshipInserts
        .map(({ parentType, parentId, remoteId }) => [
          parentType,
          parentId,
          remoteId,
        ])
        .flat();

      await db.execute(
        `INSERT INTO parents_swf_assets (parent_type, parent_id, swf_asset_id)
         VALUES ${qs}`,
        values
      );

      addToModelingLogs({
        tableName: "parents_swf_assets",
        inserts: relationshipInserts,
        updates: [],
      });
    },
    addToModelingLogs,
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
    addToModelingLogs,
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
      await afterInsert(inserts);
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

  if (inserts.length > 0 || updates.length > 0) {
    addToModelingLogs({
      tableName,
      inserts,
      updates,
    });
  }
}

module.exports = { saveModelingData };
