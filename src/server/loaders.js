const DataLoader = require("dataloader");

async function loadItems(db, ids) {
  const qs = ids.map((_) => "?").join(",");
  const [rows, _] = await db.execute(
    `SELECT * FROM items WHERE id IN (${qs})`,
    ids
  );
  const entities = rows.map(normalizeProperties);
  return entities;
}

const buildItemTranslationLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM item_translations WHERE item_id IN (${qs}) AND locale = "en"`,
      itemIds
    );
    const entities = rows.map(normalizeProperties);

    const entitiesByItemId = new Map(entities.map((e) => [e.itemId, e]));

    return itemIds.map(
      (itemId) =>
        entitiesByItemId.get(itemId) ||
        new Error(`could not find translation for item ${itemId}`)
    );
  });

function normalizeProperties(row) {
  const normalizedRow = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.replace(/_([a-z])/gi, (m) => m[1].toUpperCase());
    normalizedRow[normalizedKey] = value;
  }
  return normalizedRow;
}

module.exports = { loadItems, buildItemTranslationLoader };
