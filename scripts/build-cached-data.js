// We run this on build to cache some stable database tables into the JS
// bundle!
const fs = require("fs").promises;
const path = require("path");

const connectToDb = require("../src/server/db");
const { normalizeRow } = require("../src/server/util");

const cachedDataPath = path.join(__dirname, "..", "src", "app", "cached-data");

async function buildZonesCache(db) {
  const [rows] = await db.query(
    `SELECT z.id, z.depth, zt.label FROM zones z ` +
      `INNER JOIN zone_translations zt ON z.id = zt.zone_id ` +
      `WHERE locale = "en" ORDER BY z.id;`
  );
  const entities = rows.map(normalizeRow);

  const filePath = path.join(cachedDataPath, "zones.json");
  fs.writeFile(filePath, JSON.stringify(entities, null, 4), "utf8");

  console.log(`📚 Wrote zones to ${path.relative(process.cwd(), filePath)}`);
}

async function main() {
  const db = await connectToDb();
  await fs.mkdir(cachedDataPath, { recursive: true });

  try {
    await buildZonesCache(db);
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
