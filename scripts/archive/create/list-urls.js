/**
 * archive:create:list-urls generates a urls-cache.txt file, containing all of
 * the images.neopets.com URLs for customization that Dress to Impress is aware
 * of. This will enable us to back them all up in an archive!
 *
 * Asset types:
 *   - Item thumbnails
 *   - Asset SWFs
 *   - Asset movie manifests
 *   - Asset movie images
 *   - Asset movie scripts
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

  const numItems = await loadNumItems(db);
  for (let i = 0; i < numItems; i += 1000) {
    console.info(`Loading items ${i + 1}–${i + 1000} of ${numItems}…`);
    const items = await loadItems(i, 1000, db);
    const thumbnailUrls = items.map((i) => i.thumbnailUrl);
    const lines = thumbnailUrls.map((url) => url + "\n");
    await file.write(lines.join(""), null, "utf8");
  }
  console.info(`Done writing item URLs.`);
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((code = 0) => process.exit(code));
