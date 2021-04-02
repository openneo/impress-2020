const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});

import fetch from "node-fetch";

async function handle(req, res) {
  let itemValues;
  try {
    itemValues = await loadWakaValues();
  } catch (e) {
    console.error(e);
    res.setHeader("Content-Type", "text/plain");
    res.status(500).send("Error loading Waka data from Google Sheets API");
    return;
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

async function loadWakaValues() {
  const wakaJson = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/` +
      `1DRMrniTSZP0sgZK6OAFFYqpmbT6xY_Ve_i480zghOX0/values/NC%20Values` +
      `?fields=values&key=${encodeURIComponent(process.env["GOOGLE_API_KEY"])}`
  ).then((res) => res.json());

  // Get the rows from the JSON response - skipping the first-row headers.
  const rows = wakaJson.values.slice(1);

  // Reformat the rows as a map from item name to value. We offer the item data
  // as an object with a single field `value` for extensibility, but we omit
  // the spreadsheet columns that we don't use on DTI, like Notes.
  const itemValues = {};
  for (const [itemName, value] of rows) {
    itemValues[itemName] = { value };
  }

  return itemValues;
}

export default async (req, res) => {
  beeline.withTrace({ name: "allWakaValues" }, () => handle(req, res));
};
