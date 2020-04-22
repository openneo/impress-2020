const DataLoader = require("dataloader");

async function loadItems(db, ids) {
  const qs = ids.map((_) => "?").join(",");
  const [rows, _] = await db.execute(
    `SELECT * FROM items WHERE id IN (${qs})`,
    ids
  );

  return rows;
}

const buildItemTranslationLoader = (db) =>
  new DataLoader(async (itemIds) => {
    const qs = itemIds.map((_) => "?").join(",");
    const [rows, _] = await db.execute(
      `SELECT * FROM item_translations WHERE item_id IN (${qs}) AND locale = "en"`,
      itemIds
    );

    const rowsByItemId = new Map(rows.map((row) => [row.item_id, row]));

    return itemIds.map(
      (itemId) =>
        rowsByItemId.get(itemId) ||
        new Error(`could not find translation for item ${itemId}`)
    );
  });

module.exports = { loadItems, buildItemTranslationLoader };
