const DataLoader = require("dataloader");

const loadAllColors = (db) => async () => {
  const [rows, _] = await db.execute(`SELECT * FROM colors WHERE prank = 0`);
  const entities = rows.map(normalizeRow);
  return entities;
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
        entitiesByColorId.get(colorId) ||
        new Error(`could not find translation for species ${colorId}`)
    );
  });

const loadAllSpecies = (db) => async () => {
  const [rows, _] = await db.execute(`SELECT * FROM species`);
  const entities = rows.map(normalizeRow);
  return entities;
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
        entitiesBySpeciesId.get(speciesId) ||
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

const buildItemsLoader = (db) =>
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
        entitiesById.get(id) || new Error(`could not find item with ID: ${id}`)
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
        entitiesByItemId.get(itemId) ||
        new Error(`could not find translation for item ${itemId}`)
    );
  });

const buildItemSearchLoader = (db) =>
  new DataLoader(async (queries) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queries.map(async (query) => {
      const queryForMysql = "%" + query.replace(/_%/g, "\\$0") + "%";
      const [rows, _] = await db.execute(
        `SELECT items.*, t.name FROM items
         INNER JOIN item_translations t ON t.item_id = items.id
         WHERE t.name LIKE ? AND t.locale="en"
         ORDER BY t.name
         LIMIT 30`,
        [queryForMysql]
      );

      const entities = rows.map(normalizeRow);

      return entities;
    });

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildItemSearchToFitLoader = (db) =>
  new DataLoader(async (queryAndBodyIdPairs) => {
    // This isn't actually optimized as a batch query, we're just using a
    // DataLoader API consistency with our other loaders!
    const queryPromises = queryAndBodyIdPairs.map(
      async ({ query, bodyId, offset, limit }) => {
        const actualOffset = offset || 0;
        const actualLimit = Math.min(limit || 30, 30);

        const queryForMysql = "%" + query.replace(/_%/g, "\\$0") + "%";
        const [rows, _] = await db.execute(
          `SELECT items.*, t.name FROM items
           INNER JOIN item_translations t ON t.item_id = items.id
           INNER JOIN parents_swf_assets rel
               ON rel.parent_type = "Item" AND rel.parent_id = items.id
           INNER JOIN swf_assets ON rel.swf_asset_id = swf_assets.id
           WHERE t.name LIKE ? AND t.locale="en" AND
               (swf_assets.body_id = ? OR swf_assets.body_id = 0)
           ORDER BY t.name
           LIMIT ? OFFSET ?`,
          [queryForMysql, bodyId, actualLimit, actualOffset]
        );

        const entities = rows.map(normalizeRow);

        return entities;
      }
    );

    const responses = await Promise.all(queryPromises);

    return responses;
  });

const buildPetTypeLoader = (db) =>
  new DataLoader(async (speciesAndColorPairs) => {
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

    return speciesAndColorPairs.map(({ speciesId, colorId }) =>
      entitiesBySpeciesAndColorPair.get(`${speciesId},${colorId}`)
    );
  });

const buildItemSwfAssetLoader = (db) =>
  new DataLoader(async (itemAndBodyPairs) => {
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

    return itemAndBodyPairs.map(({ itemId, bodyId }) =>
      entities.filter(
        (e) =>
          e.parentId === itemId && (e.bodyId === bodyId || e.bodyId === "0")
      )
    );
  });

const buildPetSwfAssetLoader = (db) =>
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

    return petStateIds.map((petStateId) =>
      entities.filter((e) => e.parentId === petStateId)
    );
  });

const buildPetStateLoader = (db) =>
  new DataLoader(async (petTypeIds) => {
    const qs = petTypeIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM pet_states WHERE pet_type_id IN (${qs})`,
      petTypeIds
    );

    const entities = rows.map(normalizeRow);

    return petTypeIds.map((petTypeId) =>
      entities.filter((e) => e.petTypeId === petTypeId)
    );
  });

const buildZoneLoader = (db) =>
  new DataLoader(async (ids) => {
    const qs = ids.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM zones WHERE id IN (${qs})`,
      ids
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return ids.map(
      (id) =>
        entitiesById.get(id) || new Error(`could not find zone with ID: ${id}`)
    );
  });

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
        entitiesByZoneId.get(zoneId) ||
        new Error(`could not find translation for zone ${zoneId}`)
    );
  });

function normalizeRow(row) {
  const normalizedRow = {};
  for (let [key, value] of Object.entries(row)) {
    key = key.replace(/_([a-z])/gi, (m) => m[1].toUpperCase());
    if (key === "id" || key.endsWith("Id")) {
      value = String(value);
    }
    normalizedRow[key] = value;
  }
  return normalizedRow;
}

function buildLoaders(db) {
  return {
    loadAllColors: loadAllColors(db),
    loadAllSpecies: loadAllSpecies(db),
    loadAllPetTypes: loadAllPetTypes(db),

    colorTranslationLoader: buildColorTranslationLoader(db),
    itemLoader: buildItemsLoader(db),
    itemTranslationLoader: buildItemTranslationLoader(db),
    itemSearchLoader: buildItemSearchLoader(db),
    itemSearchToFitLoader: buildItemSearchToFitLoader(db),
    petTypeLoader: buildPetTypeLoader(db),
    itemSwfAssetLoader: buildItemSwfAssetLoader(db),
    petSwfAssetLoader: buildPetSwfAssetLoader(db),
    petStateLoader: buildPetStateLoader(db),
    speciesTranslationLoader: buildSpeciesTranslationLoader(db),
    zoneLoader: buildZoneLoader(db),
    zoneTranslationLoader: buildZoneTranslationLoader(db),
  };
}

module.exports = buildLoaders;
