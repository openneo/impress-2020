const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

import fetch from "node-fetch";

import connectToDb from "../src/server/db";

async function handle(req, res) {
  const allNcItemNamesAndIdsPromise = loadAllNcItemNamesAndIds();

  let itemValuesByIdOrName;
  try {
    itemValuesByIdOrName = await loadWakaValuesByIdOrName();
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/plain");
    res.status(500).send("Error loading Waka data from Google Sheets API");
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
 * Load all Waka values from the spreadsheet. Returns an object keyed by ID or
 * name - that is, if the item ID is provided in the sheet, we use that as the
 * key; or if not, we use the name as the key.
 */
async function loadWakaValuesByIdOrName() {
  if (!process.env["GOOGLE_API_KEY"]) {
    throw new Error(`GOOGLE_API_KEY environment variable must be provided`);
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/` +
      `1DRMrniTSZP0sgZK6OAFFYqpmbT6xY_Ve_i480zghOX0/values/NC%20Values` +
      `?fields=values&key=${encodeURIComponent(process.env["GOOGLE_API_KEY"])}`
  );
  const json = await res.json();

  if (!res.ok) {
    if (json.error) {
      const { code, status, message } = json.error;
      throw new Error(
        `Google Sheets API returned error ${code} ${status}: ${message}`
      );
    } else {
      throw new Error(
        `Google Sheets API returned unexpected error: ${res.status} ${res.statusText}`
      );
    }
  }

  // Get the rows from the JSON response - skipping the first-row headers.
  const rows = json.values.slice(1);

  // Reformat the rows as a map from item name to value. We offer the item data
  // as an object with a single field `value` for extensibility, but we omit
  // the spreadsheet columns that we don't use on DTI, like Notes.
  //
  // NOTE: The Sheets API only returns the first non-empty cells of the row.
  //       That's why we set `""` as the defaults, in case the value/notes/etc
  //       aren't provided.
  const itemValuesByIdOrName = {};
  for (const [
    itemName,
    value = "",
    notes = "",
    marks = "",
    itemId = "",
  ] of rows) {
    const normalizedItemName = normalizeItemName(itemName);
    itemValuesByIdOrName[itemId || normalizedItemName] = { value };
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
      // Waka has some stray ones in item names, not sure why!
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

export default async (req, res) => {
  beeline.withTrace({ name: "allWakaValues" }, () => handle(req, res));
};
