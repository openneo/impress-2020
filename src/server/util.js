function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function getEmotion(moodId) {
  const moodIdStr = String(moodId);
  if (moodIdStr === "1") {
    return "HAPPY";
  } else if (moodIdStr === "2") {
    return "SAD";
  } else if (moodIdStr === "4") {
    return "SICK";
  } else if (moodIdStr === null) {
    return null;
  } else {
    throw new Error(`unrecognized moodId ${JSON.stringify(moodId)}`);
  }
}

function getGenderPresentation(modelPetWasFemale) {
  const modelPetWasFemaleStr = String(modelPetWasFemale);
  if (modelPetWasFemaleStr === "1") {
    return "FEMININE";
  } else if (modelPetWasFemaleStr === "0") {
    return "MASCULINE";
  } else {
    return null;
  }
}

module.exports = { capitalize, getEmotion, getGenderPresentation };
