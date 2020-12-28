// This is a big bulk script to load the asset manifest from images.neopets.com
// for every asset, and save it to the database for fast loading!
//
// The site works fine without this: when it runs into an asset where we don't
// have the manifest cached, it loads it and caches it in real time. But this
// is a nice way to warm things up to get started!
//
// We shouldn't have to run this regularly in general, but we might want to
// re-run it once Neopets adds more manifests. Right now, we save an empty
// placeholder when no manifest exists, but someday we want to fill it in
// instead!
const { argv } = require("yargs");
const PromisePool = require("es6-promise-pool");

const connectToDb = require("../src/server/db");
const neopetsAssets = require("../src/server/neopets-assets");

async function cacheAssetManifests(db) {
  const [rows] = await db.execute(
    `SELECT id, url FROM swf_assets ` +
      `WHERE manifest IS NULL OR manifest = "" AND id >= ? ` +
      `ORDER BY id`,
    [argv.start || 0]
  );

  const numRowsTotal = rows.length;
  let numRowsStarted = 0;
  let numRowsDone = 0;

  async function cacheAssetManifest(row) {
    try {
      let manifest = await neopetsAssets.loadAssetManifest(row.url);

      // After loading, write the new manifest. We make sure to write an empty
      // string if there was no manifest, to signify that it doesn't exist, so
      // we don't need to bother looking it up again.
      //
      // TODO: Someday the manifests will all exist, right? So we'll want to
      //       reload all the missing ones at that time.
      manifest = manifest || "";
      if (argv.mode === "dump") {
        // Make it a JSON string, then escape the string for the query.
        // Hacky for sure!
        const escapedManifest = JSON.stringify(JSON.stringify(manifest));
        console.log(
          `UPDATE swf_assets SET manifest = ${escapedManifest} ` +
            `WHERE id = ${row.id} LIMIT 1;`
        );
      } else {
        const [
          result,
        ] = await db.execute(
          `UPDATE swf_assets SET manifest = ? WHERE id = ? LIMIT 1;`,
          [manifest, row.id]
        );
        if (result.affectedRows !== 1) {
          throw new Error(
            `Expected to affect 1 asset, but affected ${result.affectedRows}`
          );
        }
      }

      numRowsDone++;

      const percent = Math.floor((numRowsDone / numRowsTotal) * 100);
      // write to stderr, to not disrupt the dump
      console.error(
        `${percent}% ${numRowsDone}/${numRowsTotal} ` +
          `(Exists? ${Boolean(manifest)}. Layer: ${row.id}, ${row.url}.)`
      );
    } catch (e) {
      console.error(`Error loading layer ${row.id}, ${row.url}.`, e);
    }
  }

  function promiseProducer() {
    if (numRowsStarted < numRowsTotal) {
      const promise = cacheAssetManifest(rows[numRowsStarted]);
      numRowsStarted++;
      return promise;
    } else {
      return null;
    }
  }

  const pool = new PromisePool(promiseProducer, 10);
  await pool.start();

  // write to stderr, to not disrupt the dump
  console.error("Done!");
}

async function main() {
  const db = await connectToDb();
  try {
    await cacheAssetManifests(db);
  } catch (e) {
    db.close();
    throw e;
  }
  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
