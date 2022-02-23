const beeline = require("honeycomb-beeline")({
  writeKey: process.env["HONEYCOMB_WRITE_KEY"],
  dataset:
    process.env["NODE_ENV"] === "production"
      ? "Dress to Impress (2020)"
      : "Dress to Impress (2020, dev)",
  serviceName: "impress-2020-gql-server",
});
import connectToDb from "../../src/server/db";
import { getPoseFromPetState, normalizeRow } from "../../src/server/util";

export async function getValidPetPoses() {
  const db = await connectToDb();

  const largestSpeciesIdPromise = getLargestSpeciesId(db);
  const largestColorIdPromise = getLargestColorId(db);
  const distinctPetStatesPromise = getDistinctPetStates(db);

  const [
    largestSpeciesId,
    largestColorId,
    distinctPetStates,
  ] = await Promise.all([
    largestSpeciesIdPromise,
    largestColorIdPromise,
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

  // NOTE: We base the size of the array on the _largest_ color and species IDs
  //       in the database, not the _number_ of colors and species. This is
  //       because TNT sometimes skips IDs when working on multiple colors at
  //       once, so it's possible to have e.g. 113 released colors, but have
  //       the largest color ID be #114, because #113 was skipped. In that case,
  //       we leave an empty byte at skipped IDs, and that's okay because they
  //       don't skip a whole bunch of color IDs at once. (This would be a bad
  //       idea for network perf if e.g. TNT skipped to color #9999, because we
  //       would then leave a LOT of empty bytes in the array!)
  const numPairs = largestSpeciesId * largestColorId;
  const buffer = Buffer.alloc(numPairs + 2);
  buffer.writeUInt8(largestSpeciesId, 0);
  buffer.writeUInt8(largestColorId, 1);

  for (let speciesId = 1; speciesId <= largestSpeciesId; speciesId++) {
    const speciesIndex = speciesId - 1;
    for (let colorId = 1; colorId <= largestColorId; colorId++) {
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

      buffer.writeUInt8(byte, speciesIndex * largestColorId + colorIndex + 2);
    }
  }

  return buffer;
}

async function getLargestSpeciesId(db) {
  const [rows] = await db.query(`SELECT max(id) FROM species`);
  return rows[0]["max(id)"];
}

async function getLargestColorId(db) {
  const [rows] = await db.query(`SELECT max(id) FROM colors WHERE prank = 0`);
  return rows[0]["max(id)"];
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
