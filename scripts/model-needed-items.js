const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
import connectToDb from "../src/server/db";
import buildLoaders from "../src/server/loaders";
import {
  loadCustomPetData,
  loadNCMallPreviewImageHash,
} from "../src/server/load-pet-data";
import { gql, loadGraphqlQuery } from "../src/server/ssr-graphql";
import { saveModelingData } from "../src/server/modeling";

async function main() {
  const db = await connectToDb();
  const loaders = buildLoaders(db);
  const context = { db, ...loaders };

  const { data, errors } = await loadGraphqlQuery({
    query: gql`
      query ScriptModelNeededItems_GetNeededItems {
        standardItems: itemsThatNeedModels {
          id
          name
          speciesThatNeedModels {
            id
            name
            withColor(colorId: "8") {
              neopetsImageHash
            }
          }
        }

        babyItems: itemsThatNeedModels(colorId: "6") {
          id
          name
          speciesThatNeedModels(colorId: "6") {
            id
            name
            withColor(colorId: "6") {
              neopetsImageHash
            }
          }
        }

        maraquanItems: itemsThatNeedModels(colorId: "44") {
          id
          name
          speciesThatNeedModels(colorId: "44") {
            id
            name
            withColor(colorId: "44") {
              neopetsImageHash
            }
          }
        }

        mutantItems: itemsThatNeedModels(colorId: "46") {
          id
          name
          speciesThatNeedModels(colorId: "46") {
            id
            name
            withColor(colorId: "46") {
              neopetsImageHash
            }
          }
        }
      }
    `,
  });

  if (errors) {
    console.error(`Couldn't load items that need modeling:`);
    for (const error of errors) {
      console.error(error);
    }
    return 1;
  }

  await modelItems(data.standardItems, context);
  await modelItems(data.babyItems, context);
  await modelItems(data.maraquanItems, context);
  await modelItems(data.mutantItems, context);
}

async function modelItems(items, context) {
  for (const item of items) {
    for (const species of item.speciesThatNeedModels) {
      let imageHash;
      try {
        imageHash = await modelItem(item, species, context);
      } catch (error) {
        console.error(
          `❌ [${item.name} (${item.id}) on ${species.name} (${species.id}))] ` +
            `Modeling failed, skipping:\n`,
          error
        );
        continue;
      }
      console.info(
        `✅ [${item.name} (${item.id}) on ${species.name} (${species.id}))] ` +
          `Modeling data saved! Hash: ${imageHash}`
      );
    }
  }
}

async function modelItem(item, species, context) {
  // First, use the NC Mall try-on feature to get the image hash for this
  // species wearing this item.
  const imageHash = await loadImageHash(item, species);

  // Next, load the detailed customization data, using the special feature
  // where "@imageHash" can be looked up as if it were a pet name.
  const petName = "@" + imageHash;
  const customPetData = await loadCustomPetData(petName);

  // We don't have real pet metadata, but that's okay, that's only relevant for
  // tagging pet appearances, and that's not what we're here to do, so the
  // modeling function will skip that step. (But we do provide the pet "name"
  // to save in our modeling logs!)
  const petMetaData = { name: petName, mood: null, gender: null };

  // Check whether we actually *got* modeling data back. It's possible this
  // item just isn't compatible with this species! (In this case, it would be
  // wise for someone to manually set the `modeling_status_hint` field on this
  // item, so we skip it in the future!)
  //
  // NOTE: It seems like sometimes customPetData.object_asset_registry is
  // an object keyed by asset ID, and sometimes it's an array? Uhhh hm. Well,
  // Object.values does what we want in both cases!
  const itemAssets = Object.values(customPetData.object_asset_registry);
  const hasAssetsForThisItem = itemAssets.some(
    (a) => String(a.obj_info_id) === item.id
  );
  if (!hasAssetsForThisItem) {
    throw new Error(`custom pet data did not have assets for item ${item.id}`);
  }

  // Finally, model this data into the database!
  await saveModelingData(customPetData, petMetaData, context);

  return imageHash;
}

async function loadImageHash(item, species) {
  const basicImageHash = species.withColor.neopetsImageHash;
  try {
    return await loadWithRetries(
      () => loadNCMallPreviewImageHash(basicImageHash, [item.id]),
      {
        numAttempts: 3,
        delay: 5000,
        contextString: `${item.name} (${item.id}) on ${species.name} (${species.id}))`,
      }
    );
  } catch (error) {
    console.error(
      `[${item.name} (${item.id}) on ${species.name} (${species.id}))] ` +
        `Loading failed too many times, giving up`
    );
    throw error;
  }
}

async function loadWithRetries(fn, { numAttempts, delay, contextString }) {
  if (numAttempts <= 0) {
    return;
  }

  try {
    return await fn();
  } catch (error) {
    console.error(
      `[${contextString}] Error loading, will retry in ${delay}ms:\n`,
      error
    );
    await new Promise((resolve) => setTimeout(() => resolve(), delay));
    return await loadWithRetries(fn, {
      numAttempts: numAttempts - 1,
      delay: delay * 2,
      contextString,
    });
  }
}

async function mainWithBeeline() {
  const trace = beeline.startTrace({
    name: "scripts/model-needed-items",
    operation_name: "scripts/model-needed-items",
  });

  try {
    await main();
  } finally {
    beeline.finishTrace(trace);
  }
}

mainWithBeeline()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((code = 0) => process.exit(code));
