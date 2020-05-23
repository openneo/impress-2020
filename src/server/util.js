function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function getEmotion(moodId) {
  if (String(moodId) === "1") {
    return "HAPPY";
  } else if (String(moodId) === "2") {
    return "SAD";
  } else if (String(moodId) === "4") {
    return "SICK";
  } else if (moodId === null) {
    return null;
  } else {
    throw new Error(`unrecognized moodId ${JSON.stringify(moodId)}`);
  }
}

function getGenderPresentation(modelPetWasFemale) {
  if (String(modelPetWasFemale) === "1") {
    return "FEMININE";
  } else if (String(modelPetWasFemale) === "0") {
    return "MASCULINE";
  } else {
    return null;
  }
}

function getPose(moodId, modelPetWasFemale, isUnconverted) {
  if (isUnconverted) {
    return "UNCONVERTED";
  } else if (moodId == null || modelPetWasFemale == null) {
    return "UNKNOWN";
  } else if (String(moodId) === "1" && String(modelPetWasFemale) === "0") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(modelPetWasFemale) === "1") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(modelPetWasFemale) === "0") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(modelPetWasFemale) === "1") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(modelPetWasFemale) === "0") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(modelPetWasFemale) === "1") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `modelPetWasFemale=${modelPetWasFemale}, ` +
        `isUnconverted=${isUnconverted}`
    );
  }
}

module.exports = { capitalize, getEmotion, getGenderPresentation, getPose };
