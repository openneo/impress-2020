async function loadItems(db, ids) {
  const qs = ids.map((_) => "?").join(",");
  const [rows, _] = await db.execute(
    `SELECT * FROM items WHERE id IN (${qs})`,
    ids
  );

  return rows;
}

async function loadItemTranslation(db, itemId, locale) {
  const [
    rows,
    _,
  ] = await db.execute(
    `SELECT * FROM item_translations WHERE item_id = ? AND locale = ? LIMIT 1`,
    [itemId, locale]
  );
  if (rows.length === 0) {
    throw new Error(`could not load translation for ${itemId}, ${locale}`);
  }

  return rows[0];
}

module.exports = { loadItems, loadItemTranslation };
