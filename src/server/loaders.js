const DataLoader = require("dataloader");

async function loadItems(db, ids) {
  const qs = ids.map((_) => "?").join(",");
  const [rows, _] = await db.execute(
    `SELECT * FROM items WHERE id IN (${qs})`,
    ids
  );
  const entities = rows.map(normalizeRow);
  return entities;
}

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

const buildSwfAssetLoader = (db) =>
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

const buildZoneLoader = (db) =>
  new DataLoader(async (zoneIds) => {
    const qs = zoneIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM zones WHERE id IN (${qs})`,
      zoneIds
    );

    const entities = rows.map(normalizeRow);
    const entitiesById = new Map(entities.map((e) => [e.id, e]));

    return zoneIds.map(
      (zoneId) =>
        entitiesById.get(zoneId) ||
        new Error(`could not find zone with ID: ${zoneId}`)
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

module.exports = {
  loadItems,
  buildItemTranslationLoader,
  buildPetTypeLoader,
  buildSwfAssetLoader,
  buildZoneLoader,
  buildZoneTranslationLoader,
};
