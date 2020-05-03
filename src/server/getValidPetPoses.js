import connectToDb from "./db";

import { getEmotion, getGenderPresentation } from "./util";

export default async function getValidPetPoses() {
  const db = await connectToDb();

  const numSpeciesPromise = getNumSpecies(db);
  const numColorsPromise = getNumColors(db);
  const poseTuplesPromise = getPoseTuples(db);

  const [numSpecies, numColors, poseTuples] = await Promise.all([
    numSpeciesPromise,
    numColorsPromise,
    poseTuplesPromise,
  ]);

  const poseStrs = new Set();
  for (const poseTuple of poseTuples) {
    const { species_id, color_id, mood_id, female } = poseTuple;
    const emotion = getEmotion(mood_id);
    const genderPresentation = getGenderPresentation(female);
    const poseStr = `${species_id}-${color_id}-${emotion}-${genderPresentation}`;
    poseStrs.add(poseStr);
  }

  function hasPose(speciesId, colorId, emotion, genderPresentation) {
    const poseStr = `${speciesId}-${colorId}-${emotion}-${genderPresentation}`;
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
      byte += hasPose(speciesId, colorId, "SICK", "FEMININE") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SAD", "FEMININE") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "HAPPY", "FEMININE") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SICK", "MASCULINE") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "SAD", "MASCULINE") ? 1 : 0;
      byte <<= 1;
      byte += hasPose(speciesId, colorId, "HAPPY", "MASCULINE") ? 1 : 0;

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

async function getPoseTuples(db) {
  const [rows, _] = await db.query(`
    SELECT DISTINCT species_id, color_id, mood_id, female FROM pet_states
    INNER JOIN pet_types ON pet_types.id = pet_states.pet_type_id
    WHERE mood_id IS NOT NULL AND female IS NOT NULL AND color_id >= 1`);
  return rows;
}
