const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
  disableInstrumentationOnLoad: true,
});
import connectToDb from "../../src/server/db";
import { getPoseFromPetState, normalizeRow } from "../../src/server/util";

export async function getValidPetPoses() {
  const db = await connectToDb();

  const numSpeciesPromise = getNumSpecies(db);
  const numColorsPromise = getNumColors(db);
  const distinctPetStatesPromise = getDistinctPetStates(db);

  const [numSpecies, numColors, distinctPetStates] = await Promise.all([
    numSpeciesPromise,
    numColorsPromise,
    distinctPetStatesPromise,
  ]);

  const poseStrs = new Set();
  for (const petState of distinctPetStates) {
    const { speciesId, colorId } = petState;
    const pose = getPoseFromPetState(petState);
    const poseStr = `${speciesId}-${colorId}-${pose}`;
    poseStrs.add(poseStr);
  }

  function hasPose(speciesId, colorId, pose) {
    const poseStr = `${speciesId}-${colorId}-${pose}`;
    return poseStrs.has(poseStr);
  }

  const numPairs = numSpecies * numColors;
  const buffer = Buffer.alloc(numPairs + 2);
  buffer.writeUInt8(numSpecies, 0);
  buffer.writeUInt8(numColors, 1);

  for (let speciesId = 1; speciesId <= numSpecies; speciesId++) {
    const speciesIndex = speciesId - 1;
    for (let colorId = 1; colorId <= numColors; colorId++) {
      const colorIndex = colorId - 1;

      // We fill in the high bits first, and shift left as we go!
      let byte = 0;
      byte += hasPose(speciesId, colorId, "UNKNOWN") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "UNCONVERTED") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SICK_FEM") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SAD_FEM") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "HAPPY_FEM") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SICK_MASC") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SAD_MASC") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "HAPPY_MASC") ? 1 : 0;

      buffer.writeUInt8(byte, speciesIndex * numColors + colorIndex + 2);
    }
  }

  return buffer;
}

async function getNumSpecies(db) {
  const [rows] = await db.query(`SELECT count(*) FROM species`);
  return rows[0]["count(*)"];
}

async function getNumColors(db) {
  const [rows] = await db.query(`SELECT count(*) FROM colors WHERE prank = 0`);
  return rows[0]["count(*)"];
}

async function getDistinctPetStates(db) {
  const [rows] = await db.query(`
    SELECT DISTINCT species_id, color_id, mood_id, female, unconverted
        FROM pet_states
    INNER JOIN pet_types ON pet_types.id = pet_states.pet_type_id
    WHERE color_id >= 1`);
  return rows.map(normalizeRow);
}

async function handle(req, res) {
  const buffer = await getValidPetPoses();

  // Cache for 1 hour, and allow the CDN cache to serve copies up to an
  // additional week older while re-fetching in the background.
  res.setHeader("Cache-Control", "max-age=3600, stale-while-revalidate=604800");

  res.status(200).send(buffer);
}

async function handleWithBeeline(req, res) {
  beeline.withTrace(
    { name: "api/validPetPoses", operation_name: "api/validPetPoses" },
    () => handle(req, res)
  );
}

export default handleWithBeeline;
