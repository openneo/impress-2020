const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

import fetch from "node-fetch";

import connectToDb from "../../src/server/db";

async function handle(req, res) {
  const allNcItemNamesAndIdsPromise = loadAllNcItemNamesAndIds();

  let itemValuesByIdOrName;
  try {
    itemValuesByIdOrName = await loadOWLSValuesByIdOrName();
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/plain; charset=utf8");
    res.status(500).send("Error loading OWLS Pricer data");
    return;
  }

  // Restructure the value data to use IDs as keys, instead of names.
  const allNcItemNamesAndIds = await allNcItemNamesAndIdsPromise;
  const itemValues = {};
  for (const { name, id } of allNcItemNamesAndIds) {
    if (id in itemValuesByIdOrName) {
      itemValues[id] = itemValuesByIdOrName[id];
    } else if (name in itemValuesByIdOrName) {
      itemValues[id] = itemValuesByIdOrName[name];
    }
  }

  // Cache for 1 minute, and immediately serve stale data for a day after.
  // This should keep it fast and responsive, and stay well within our API key
  // limits. (This will cause the client to send more requests than necessary,
  // but the CDN cache should generally respond quickly with a small 304 Not
  // Modified, unless the data really did change.)
  res.setHeader(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400"
  );
  return res.send(itemValues);
}

async function loadAllNcItemNamesAndIds() {
  const db = await connectToDb();

  const [rows] = await db.query(`
    SELECT items.id, item_translations.name FROM items
      INNER JOIN item_translations ON item_translations.item_id = items.id
      WHERE
        (items.rarity_index IN (0, 500) OR is_manually_nc = 1)
        AND item_translations.locale = "en"
  `);

  return rows.map(({ id, name }) => ({ id, name: normalizeItemName(name) }));
}

/**
 * Load all OWLS Pricer values from the spreadsheet. Returns an object keyed by
 * ID or name - that is, if the item ID is provided, we use that as the key; or
 * if not, we use the name as the key.
 */
async function loadOWLSValuesByIdOrName() {
  const res = await fetch(
    `https://neo-owls.herokuapp.com/itemdata/owls_script/`
  );
  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Could not load OWLS Pricer data: ${res.status} ${res.statusText}`
    );
  }

  const itemValuesByIdOrName = {};
  for (const [itemName, value] of Object.entries(json)) {
    // OWLS returns an empty string for NC Mall items they don't have a trade
    // value for, to allow the script to distinguish between NP items vs
    // no-data NC items. We omit it from our data instead, because our UI is
    // already aware of whether the item is NP or NC.
    if (value.trim() === "") {
      continue;
    }

    // TODO: OWLS doesn't currently provide item IDs ever. Add support for it
    //       if it does! (I'm keeping the rest of the code the same because I
    //       think that might happen for disambiguation, like Waka did.)
    const normalizedItemName = normalizeItemName(itemName);
    itemValuesByIdOrName[normalizedItemName] = value;
  }

  return itemValuesByIdOrName;
}

function normalizeItemName(name) {
  return (
    name
      // Remove all spaces, they're a common source of inconsistency
      .replace(/\s+/g, "")
      // Lower case, because capitalization is another common source
      .toLowerCase()
      // Remove diacritics: https://stackoverflow.com/a/37511463/107415
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/allNCTradeValues", operation_name: "api/allNCTradeValues" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
