import connectToDb from "./db";

import { getPoseFromPetState, normalizeRow } from "./util";

export default async function getValidPetPoses() {
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

      // We fill in the high bits first. If we add more things later, write
      // them first, so that they fill in the currently-empty high bits and
      // everything else stays in the same position as before!
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
  const [rows, _] = await db.query(`SELECT count(*) FROM species`);
  return rows[0]["count(*)"];
}

async function getNumColors(db) {
  const [rows, _] = await db.query(
    `SELECT count(*) FROM colors WHERE prank = 0`
  );
  return rows[0]["count(*)"];
}

async function getDistinctPetStates(db) {
  const [rows, _] = await db.query(`
    SELECT DISTINCT species_id, color_id, mood_id, female, unconverted
        FROM pet_states
    INNER JOIN pet_types ON pet_types.id = pet_states.pet_type_id
    WHERE glitched IS false AND color_id >= 1`);
  return rows.map(normalizeRow);
}
