// We run this on build to cache some stable database tables on the server!
const fs = require("fs").promises;
const path = require("path");

const connectToDb = require("../src/server/db");
const { normalizeRow } = require("../src/server/util");

const cachedDataPath = path.join(__dirname, "..", "build", "cached-data");

async function buildZonesCache(db) {
  const [rows] = await db.query(`SELECT * FROM zones;`);
  const entities = rows.map(normalizeRow);

  const filePath = path.join(cachedDataPath, "zones.json");
  fs.writeFile(filePath, JSON.stringify(entities, null, 4), "utf8");

  console.log(`📚 Wrote zones to ${path.relative(process.cwd(), filePath)}`);
}

async function buildZoneTranslationsCache(db) {
  const [rows] = await db.query(
    `SELECT * FROM zone_translations WHERE locale = "en";`
  );
  const entities = rows.map(normalizeRow);

  const filePath = path.join(cachedDataPath, "zone_translations.json");
  fs.writeFile(filePath, JSON.stringify(entities, null, 4), "utf8");

  console.log(
    `📚 Wrote zone translations to ${path.relative(process.cwd(), filePath)}`
  );
}

async function main() {
  const db = await connectToDb();
  await fs.mkdir(cachedDataPath, { recursive: true });

  try {
    await Promise.all([buildZonesCache(db), buildZoneTranslationsCache(db)]);
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
