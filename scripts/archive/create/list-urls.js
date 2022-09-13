/**
 * archive:create:list-urls generates a urls-cache.txt file, containing all of
 * the images.neopets.com URLs for customization that Dress to Impress is aware
 * of. This will enable us to back them all up in an archive!
 *
 * This script doesn't make any external network requests. Instead, it only
 * queries the DTI database, and extracts URLs from the data we already have.
 *
 * While this helps us be very fast, note that this depends on DTI's cached
 * manifests in the database being relatively up-to-date. It might be wise to
 * run the `cache-asset-manifests` script with the `--resync-existing` flag to
 * update DTI's manifest cache before running this, if you want to ensure it's
 * fully in sync!
 *
 * NOTE: This file will be in the hundreds of megabytes large! It's designed to
 *       be an easy cache to write and read, and the trade-off for that is
 *       being big and uncompressed. Delete it when you're done to save space!
 *
 * Asset types:
 *   - Item thumbnails
 *   - Asset SWFs
 *   - Asset HTML5 manifests
 *   - Asset HTML5 SVG images
 *   - Asset HTML5 movie files (images and scripts)
 */
const fs = require("fs/promises");
const path = require("path");
const connectToDb = require("../../../src/server/db");
const { normalizeRow } = require("../../../src/server/util");

async function main() {
  const urlsCacheFileAlreadyExists = await checkIfUrlsCacheFileAlreadyExists();
  if (urlsCacheFileAlreadyExists) {
    console.error(
      `urls-cache.txt already exists. Please remove it first if you really ` +
        `want to rebuild it from scratch!`
    );
    return 1;
  }

  const db = await connectToDb();
  const file = await createUrlsCacheFile();

  try {
    const numItems = await loadNumItems(db);
    for (let i = 0; i < numItems; i += 1000) {
      console.info(`Loading items ${i + 1}–${i + 1000} of ${numItems}…`);
      const items = await loadItems(i, 1000, db);
      const urls = items.map((i) => i.thumbnailUrl);
      const lines = urls.map((url) => url + "\n");
      await file.write(lines.join(""), null, "utf8");
    }
    console.info(`Done writing item URLs.`);

    const numSwfAssets = await loadNumSwfAssets(db);
    for (let i = 0; i < numSwfAssets; i += 1000) {
      console.info(`Loading assets ${i + 1}–${i + 1000} of ${numSwfAssets}…`);
      const swfAssets = await loadSwfAssets(i, 1000, db);
      const urls = [];
      for (const swfAsset of swfAssets) {
        urls.push(swfAsset.url);
        urls.push(
          ...getHTML5UrlsFromManifestContent(swfAsset.id, swfAsset.manifest)
        );
      }
      const lines = urls.map((url) => url + "\n");
      await file.write(lines.join(""), null, "utf8");
    }
  } finally {
    await file.close();
  }

  console.info(`Done writing asset URLs.`);
}

async function checkIfUrlsCacheFileAlreadyExists() {
  const urlsCacheFilePath = path.join(__dirname, "urls-cache.txt");
  try {
    await fs.access(urlsCacheFilePath, fs.constants.R_OK);
  } catch (error) {
    return false;
  }
  return true;
}

async function createUrlsCacheFile() {
  const urlsCacheFilePath = path.join(__dirname, "urls-cache.txt");
  return await fs.open(urlsCacheFilePath, "w");
}

async function loadNumItems(db) {
  const [rows] = await db.query(`SELECT count(*) FROM items`);
  return rows[0]["count(*)"];
}

async function loadItems(offset, limit, db) {
  const [
    rows,
  ] = await db.query(
    `SELECT thumbnail_url FROM items ORDER BY id LIMIT ? OFFSET ?;`,
    [limit, offset]
  );
  return rows.map(normalizeRow);
}

async function loadNumSwfAssets(db) {
  const [rows] = await db.query(`SELECT count(*) FROM swf_assets`);
  return rows[0]["count(*)"];
}

async function loadSwfAssets(offset, limit, db) {
  const [
    rows,
  ] = await db.query(
    `SELECT id, url, manifest FROM swf_assets ORDER BY id LIMIT ? OFFSET ?;`,
    [limit, offset]
  );
  return rows.map(normalizeRow);
}

const ASSET_DIRNAME_PATTERN = /^cp\/(bio|items)\/data\/[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+(?:_[0-9a-f]{10})?/;
const PUBLIC_HTML_PATTERN = /^\/home\/images\/public_html\//;

/**
 * getHTML5UrlsFromManifestContent takes the manifest content cached in DTI's
 * database, and extracts the URLs it references, including the URL for the
 * manifest itself.
 *
 * NOTE: Another approach we could take here would be to, like DTI itself
 *       does, fetch both manifest locations and see which one answers. The
 *       clear downside is that this would be a lot of network effort and slow
 *       down this script by a ton! There's a case to be made that it's a more
 *       robust idea, though, in case DTI's manifest cache is out of date. That
 *       might be worth checking! That said, the mitigation described at the
 *       top of the script (using `cache-asset-manifests`) is probably enough.
 */
function getHTML5UrlsFromManifestContent(assetId, manifestContent) {
  if (!manifestContent) {
    return [];
  }

  let manifestData;
  try {
    manifestData = JSON.parse(manifestContent);
  } catch (error) {
    console.warn(
      `[Asset ${assetId}] Could not parse manifest as JSON; ` +
        `skipping movie URLs: ${error.message}`
    );
    return [];
  }

  let paths;
  try {
    // NOTE: The format we store in the database is a bit different than the
    //       manifest.json's original format. We remove the cpmanifest wrapper
    //       object, we camelCase the keys, and we rename `url` to `path` for
    //       increased clarity about what it is.
    const assets = manifestData.assets;
    const assetDatas = assets.map((a) => a.assetData).flat();
    paths = assetDatas.map((ad) => ad.path);
  } catch (error) {
    console.warn(
      `[Asset ${assetId}] Manifest data was not of the expected structure; ` +
        `skipping movie URLs: ${error.message}.`
    );
    return [];
  }

  if (paths.length === 0) {
    console.warn(`[Asset ${assetId}] Manifest contained no URLs; skipping.`);
    return [];
  }

  // Starting with asset #539903, when manifests reference themselves, they
  // prepend `/home/images/public_html/` to the path, oops! Strip those out.
  paths = paths.map((p) => p.replace(PUBLIC_HTML_PATTERN, ""));

  // Some manifest files reference themselves, but others don't. If this one
  // doesn't, we can infer it from the other paths: it should be at
  // `manifest.json` in the same directory.
  //
  // We can't just infer it from e.g. the SWF URL, because there are two
  // locations where a manifest file can be. As an example, for the following
  // SWF URL:
  // - https://images.neopets.com/cp/items/swf/000/000/005/5735_a8feda8d08.swf
  // ...the manifest might be either of the following:
  // - https://images.neopets.com/cp/items/data/000/000/005/5735_a8feda8d08/manifest.json
  // - https://images.neopets.com/cp/items/data/000/000/005/5735/manifest.json
  // (incidentally, it's the first one in this case!)
  if (!paths.some((p) => p.split("?")[0].endsWith("manifest.json"))) {
    try {
      paths.push(inferManifestPath(paths));
    } catch (error) {
      console.warn(
        `[Asset ${assetId}] Skipping manifest URL: ${error.message}`
      );
    }
  }

  const urls = paths.map((path) =>
    new URL(path, "https://images.neopets.com/").toString()
  );

  // Sometimes the manifest contains some duplicate URLs, so remove those.
  const uniqueUrls = [...new Set(urls)];

  return uniqueUrls;
}

function inferManifestPath(paths) {
  // Sometimes there are subdirectories, so we can't *just* look at the
  // dirname of the files. Instead, we observe that assets generally go in a
  // folder like: `cp/<bio|object>/data/123/456/789/123456789[_abcdef1234]`,
  // so we look for that prefix in the first path, check all the other paths
  // against it for good measure, then assume that `manifest.json` will be in
  // there too.
  const baseDirectoryMatch = paths[0].match(ASSET_DIRNAME_PATTERN);
  if (baseDirectoryMatch == null) {
    throw new Error(
      `Could not infer manifest path: the paths in the ` +
        `manifest don't match the expected format. (The first path was: ` +
        `${JSON.stringify(paths[0])})`
    );
  }

  const baseDirectory = baseDirectoryMatch[0];
  if (!paths.every((p) => p.startsWith(baseDirectory))) {
    throw new Error(
      `Could not infer manifest path: the paths in the manifest don't all ` +
        `belong to the same base directory.`
    );
  }

  return `${baseDirectory}/manifest.json`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((code = 0) => process.exit(code));
