const DataLoader = require("dataloader");
const { normalizeRow } = require("./util");

const buildColorLoader = (db) => {
  const colorLoader = new DataLoader(async (colorIds) => {
    const qs = colorIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM colors WHERE id IN (${qs}) AND prank = 0`,
      colorIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByColorId = new Map(entities.map((e) => [e.id, e]));

    return colorIds.map(
      (colorId) =>
        entitiesByColorId.get(String(colorId)) ||
        new Error(`could not find color ${colorId}`)
    );
  });

  colorLoader.loadAll = async () => {
    const [rows, _] = await db.execute(`SELECT * FROM colors WHERE prank = 0`);
    const entities = rows.map(normalizeRow);

    for (const color of entities) {
      colorLoader.prime(color.id, color);
    }

    return entities;
  };

  return colorLoader;
};

const buildColorTranslationLoader = (db) =>
  new DataLoader(async (colorIds) => {
    const qs = colorIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM color_translations
       WHERE color_id IN (${qs}) AND locale = "en"`,
      colorIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByColorId = new Map(entities.map((e) => [e.colorId, e]));

    return colorIds.map(
      (colorId) =>
        entitiesByColorId.get(String(colorId)) ||
        new Error(`could not find translation for color ${colorId}`)
    );
  });

const buildSpeciesLoader = (db) => {
  const speciesLoader = new DataLoader(async (speciesIds) => {
    const qs = speciesIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM species WHERE id IN (${qs})`,
      speciesIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesBySpeciesId = new Map(entities.map((e) => [e.id, e]));

    return speciesIds.map(
      (speciesId) =>
        entitiesBySpeciesId.get(String(speciesId)) ||
        new Error(`could not find color ${speciesId}`)
    );
  });

  speciesLoader.loadAll = async () => {
    const [rows, _] = await db.execute(`SELECT * FROM species`);
    const entities = rows.map(normalizeRow);

    for (const species of entities) {
      speciesLoader.prime(species.id, species);
    }

    return entities;
  };

  return speciesLoader;
};

const buildSpeciesTranslationLoader = (db) =>
  new DataLoader(async (speciesIds) => {
    const qs = speciesIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM species_translations
       WHERE species_id IN (${qs}) AND locale = "en"`,
      speciesIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesBySpeciesId = new Map(entities.map((e) => [e.speciesId, e]));

    return speciesIds.map(
      (speciesId) =>
        entitiesBySpeciesId.get(String(speciesId)) ||
        new Error(`could not find translation for species ${speciesId}`)
    );
  });

const loadAllPetTypes = (db) => async () => {
  const [rows, _] = await db.execute(
    `SELECT species_id, color_id FROM pet_types`
  );
  const entities = rows.map(normalizeRow);
  return entities;
};

const buildItemLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM items WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(String(id)) ||
        new Error(`could not find item with ID: ${id}`)
    );
  });

const buildItemTranslationLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM item_translations WHERE item_id IN (${qs}) AND locale = "en"`,
      itemIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByItemId = new Map(entities.map((e) => [e.itemId, e]));

    return itemIds.map(
      (itemId) =>
        entitiesByItemId.get(String(itemId)) ||
        new Error(`could not find translation for item ${itemId}`)
    );
  });

const buildItemSearchLoader = (db, loaders) =>
  new DataLoader(async (queries) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queries.map(async (query) => {
      // Split the query into words, and search for each word as a substring
      // of the name.
      const words = query.split(/\s+/);
      const wordMatchersForMysql = words.map(
        (word) => "%" + word.replace(/_%/g, "\\$0") + "%"
      );
      const matcherPlaceholders = words
        .map((_) => "t.name LIKE ?")
        .join(" AND ");
      const [rows, _] = await db.execute(
        `SELECT items.*, t.name FROM items
         INNER JOIN item_translations t ON t.item_id = items.id
         WHERE ${matcherPlaceholders} AND t.locale="en"
         ORDER BY t.name
         LIMIT 30`,
        [...wordMatchersForMysql]
      );

      const entities = rows.map(normalizeRow);

      for (const item of entities) {
        loaders.itemLoader.prime(item.id, item);
      }

      return entities;
    });

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildItemSearchToFitLoader = (db, loaders) =>
  new DataLoader(async (queryAndBodyIdPairs) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queryAndBodyIdPairs.map(
      async ({ query, bodyId, offset, limit }) => {
        const actualOffset = offset || 0;
        const actualLimit = Math.min(limit || 30, 30);

        const words = query.split(/\s+/);
        const wordMatchersForMysql = words.map(
          (word) => "%" + word.replace(/_%/g, "\\$0") + "%"
        );
        const matcherPlaceholders = words
          .map((_) => "t.name LIKE ?")
          .join(" AND ");
        const [rows, _] = await db.execute(
          `SELECT DISTINCT items.*, t.name FROM items
           INNER JOIN item_translations t ON t.item_id = items.id
           INNER JOIN parents_swf_assets rel
               ON rel.parent_type = "Item" AND rel.parent_id = items.id
           INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
           WHERE ${matcherPlaceholders} AND t.locale="en" AND
               (swf_assets.body_id = ? OR swf_assets.body_id = 0)
           ORDER BY t.name
           LIMIT ? OFFSET ?`,
          [...wordMatchersForMysql, bodyId, actualLimit, actualOffset]
        );

        const entities = rows.map(normalizeRow);

        for (const item of entities) {
          loaders.itemLoader.prime(item.id, item);
        }

        return entities;
      }
    );

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildPetTypeLoader = (db) =>
  new DataLoader(async (petTypeIds) => {
    const qs = petTypeIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM pet_types WHERE id IN (${qs})`,
      petTypeIds
    );

    const entities = rows.map(normalizeRow);

    return petTypeIds.map((petTypeId) =>
      entities.find((e) => e.id === petTypeId)
    );
  });

const buildPetTypeBySpeciesAndColorLoader = (db, loaders) =>
  new DataLoader(
    async (speciesAndColorPairs) => {
      const conditions = [];
      const values = [];
      for (const { speciesId, colorId } of speciesAndColorPairs) {
        conditions.push("(species_id = ? AND color_id = ?)");
        values.push(speciesId, colorId);
      }

      const [rows, _] = await db.execute(
        `SELECT * FROM pet_types WHERE ${conditions.join(" OR ")}`,
        values
      );

      const entities = rows.map(normalizeRow);
      const entitiesBySpeciesAndColorPair = new Map(
        entities.map((e) => [`${e.speciesId},${e.colorId}`, e])
      );

      for (const petType of entities) {
        loaders.petTypeLoader.prime(petType.id, petType);
      }

      return speciesAndColorPairs.map(({ speciesId, colorId }) =>
        entitiesBySpeciesAndColorPair.get(`${speciesId},${colorId}`)
      );
    },
    { cacheKeyFn: ({ speciesId, colorId }) => `${speciesId},${colorId}` }
  );

const buildSwfAssetLoader = (db) =>
  new DataLoader(async (swfAssetIds) => {
    const qs = swfAssetIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM swf_assets WHERE id IN (${qs})`,
      swfAssetIds
    );

    const entities = rows.map(normalizeRow);

    return swfAssetIds.map((swfAssetId) =>
      entities.find((e) => e.id === swfAssetId)
    );
  });

const buildItemSwfAssetLoader = (db, loaders) =>
  new DataLoader(
    async (itemAndBodyPairs) => {
      const conditions = [];
      const values = [];
      for (const { itemId, bodyId } of itemAndBodyPairs) {
        conditions.push(
          "(rel.parent_id = ? AND (sa.body_id = ? OR sa.body_id = 0))"
        );
        values.push(itemId, bodyId);
      }

      const [rows, _] = await db.execute(
        `SELECT sa.*, rel.parent_id FROM swf_assets sa
       INNER JOIN parents_swf_assets rel ON
         rel.parent_type = "Item" AND
         rel.swf_asset_id = sa.id
       WHERE ${conditions.join(" OR ")}`,
        values
      );

      const entities = rows.map(normalizeRow);

      for (const swfAsset of entities) {
        loaders.swfAssetLoader.prime(swfAsset.id, swfAsset);
      }

      return itemAndBodyPairs.map(({ itemId, bodyId }) =>
        entities.filter(
          (e) =>
            e.parentId === itemId && (e.bodyId === bodyId || e.bodyId === "0")
        )
      );
    },
    { cacheKeyFn: ({ itemId, bodyId }) => `${itemId},${bodyId}` }
  );

const buildPetSwfAssetLoader = (db, loaders) =>
  new DataLoader(async (petStateIds) => {
    const qs = petStateIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT sa.*, rel.parent_id FROM swf_assets sa
       INNER JOIN parents_swf_assets rel ON
         rel.parent_type = "PetState" AND
         rel.swf_asset_id = sa.id
       WHERE rel.parent_id IN (${qs})`,
      petStateIds
    );

    const entities = rows.map(normalizeRow);

    for (const swfAsset of entities) {
      loaders.swfAssetLoader.prime(swfAsset.id, swfAsset);
    }

    return petStateIds.map((petStateId) =>
      entities.filter((e) => e.parentId === petStateId)
    );
  });

const buildOutfitLoader = (db) =>
  new DataLoader(async (outfitIds) => {
    const qs = outfitIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM outfits WHERE id IN (${qs})`,
      outfitIds
    );

    const entities = rows.map(normalizeRow);

    return outfitIds.map((outfitId) => entities.find((e) => e.id === outfitId));
  });

const buildItemOutfitRelationshipsLoader = (db) =>
  new DataLoader(async (outfitIds) => {
    const qs = outfitIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM item_outfit_relationships WHERE outfit_id IN (${qs})`,
      outfitIds
    );

    const entities = rows.map(normalizeRow);

    return outfitIds.map((outfitId) =>
      entities.filter((e) => e.outfitId === outfitId)
    );
  });

const buildPetStateLoader = (db) =>
  new DataLoader(async (petStateIds) => {
    const qs = petStateIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM pet_states WHERE id IN (${qs})`,
      petStateIds
    );

    const entities = rows.map(normalizeRow);

    return petStateIds.map((petStateId) =>
      entities.find((e) => e.id === petStateId)
    );
  });

const buildPetStatesForPetTypeLoader = (db, loaders) =>
  new DataLoader(async (petTypeIds) => {
    const qs = petTypeIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM pet_states
       WHERE pet_type_id IN (${qs})
       ORDER BY (mood_id IS NULL) ASC, mood_id ASC, female DESC,
                unconverted DESC, glitched ASC, id DESC`,
      petTypeIds
    );

    const entities = rows.map(normalizeRow);

    for (const petState of entities) {
      loaders.petStateLoader.prime(petState.id, petState);
    }

    return petTypeIds.map((petTypeId) =>
      entities.filter((e) => e.petTypeId === petTypeId)
    );
  });

const buildZoneLoader = (db) => {
  const zoneLoader = new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM zones WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(String(id)) ||
        new Error(`could not find zone with ID: ${id}`)
    );
  });

  zoneLoader.loadAll = async () => {
    const [rows, _] = await db.execute(`SELECT * FROM zones`);
    const entities = rows.map(normalizeRow);

    for (const zone of entities) {
      zoneLoader.prime(zone.id, zone);
    }

    return entities;
  };

  return zoneLoader;
};

const buildZoneTranslationLoader = (db) =>
  new DataLoader(async (zoneIds) => {
    const qs = zoneIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM zone_translations WHERE zone_id IN (${qs}) AND locale = "en"`,
      zoneIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesByZoneId = new Map(entities.map((e) => [e.zoneId, e]));

    return zoneIds.map(
      (zoneId) =>
        entitiesByZoneId.get(String(zoneId)) ||
        new Error(`could not find translation for zone ${zoneId}`)
    );
  });

function buildLoaders(db) {
  const loaders = {};
  loaders.loadAllPetTypes = loadAllPetTypes(db);

  loaders.colorLoader = buildColorLoader(db);
  loaders.colorTranslationLoader = buildColorTranslationLoader(db);
  loaders.itemLoader = buildItemLoader(db);
  loaders.itemTranslationLoader = buildItemTranslationLoader(db);
  loaders.itemSearchLoader = buildItemSearchLoader(db, loaders);
  loaders.itemSearchToFitLoader = buildItemSearchToFitLoader(db, loaders);
  loaders.petTypeLoader = buildPetTypeLoader(db);
  loaders.petTypeBySpeciesAndColorLoader = buildPetTypeBySpeciesAndColorLoader(
    db,
    loaders
  );
  loaders.swfAssetLoader = buildSwfAssetLoader(db);
  loaders.itemSwfAssetLoader = buildItemSwfAssetLoader(db, loaders);
  loaders.petSwfAssetLoader = buildPetSwfAssetLoader(db, loaders);
  loaders.outfitLoader = buildOutfitLoader(db);
  loaders.itemOutfitRelationshipsLoader = buildItemOutfitRelationshipsLoader(
    db
  );
  loaders.petStateLoader = buildPetStateLoader(db);
  loaders.petStatesForPetTypeLoader = buildPetStatesForPetTypeLoader(
    db,
    loaders
  );
  loaders.speciesLoader = buildSpeciesLoader(db);
  loaders.speciesTranslationLoader = buildSpeciesTranslationLoader(db);
  loaders.zoneLoader = buildZoneLoader(db);
  loaders.zoneTranslationLoader = buildZoneTranslationLoader(db);

  return loaders;
}

module.exports = buildLoaders;
