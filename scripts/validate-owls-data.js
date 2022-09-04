/**
 * This script compares the data we get from the OWLS bulk endpoint to the data
 * we get by loading the data with the new individual endpoint! This will help
 * us check for bugs as we switch over!
 */
const fetch = require("node-fetch");
const connectToDb = require("../src/server/db");
const buildLoaders = require("../src/server/loaders");
const { getOWLSTradeValue } = require("../src/server/nc-trade-values");

async function main() {
  const db = await connectToDb();
  const { itemTranslationLoader } = buildLoaders(db);

  // Load the bulk data. We're gonna loop through it all!
  const bulkEndpointRes = await fetch(
    `http://localhost:3000/api/allNCTradeValues`
  );
  const bulkEndpointData = await bulkEndpointRes.json();

  // Load the item names, bc our bulk data is keyed by item ID.
  const itemIds = Object.keys(bulkEndpointData);
  const itemTranslations = await itemTranslationLoader.loadMany(itemIds);

  // Load the OWLs data! I don't do any of it in parallel, because I'm worried
  // about upsetting the server, y'know?
  let numChecked = 0;
  let numSuccesses = 0;
  let numFailures = 0;
  for (const { name, itemId } of itemTranslations) {
    if (numChecked % 100 === 0) {
      console.info(`Checked ${numChecked} items`);
    }
    numChecked++;
    const expectedValueText = bulkEndpointData[itemId].valueText;
    let actualValue;
    try {
      actualValue = await getOWLSTradeValue(name);
    } catch (error) {
      console.error(`[${itemId} / ${name}]: Error loading data:\n`, error);
      numFailures++;
      continue;
    }
    if (actualValue == null) {
      console.error(`[${itemId} / ${name}]: No value found.`);
      numFailures++;
      continue;
    }
    const actualValueText = actualValue.valueText;
    if (expectedValueText !== actualValueText) {
      console.error(
        `[${itemId}]: Value did not match. ` +
          `Expected: ${JSON.stringify(expectedValueText)}. ` +
          `Actual: ${JSON.stringify(actualValueText)}`
      );
      numFailures++;
      continue;
    }
    numSuccesses++;
  }
  console.info(
    `Checked all ${numChecked} items. ` +
      `${numSuccesses} successes, ${numFailures} failures.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit());
