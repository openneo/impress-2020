function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function getEmotion(moodId) {
  if (moodId === "1") {
    return "HAPPY";
  } else if (moodId === "2") {
    return "SAD";
  } else if (moodId === "4") {
    return "SICK";
  } else if (moodId === null) {
    return null;
  } else {
    throw new Error(`unrecognized moodId ${JSON.stringify(moodId)}`);
  }
}

function getGenderPresentation(modelPetWasFemale) {
  if (modelPetWasFemale === 1) {
    return "FEMININE";
  } else if (modelPetWasFemale === 0) {
    return "MASCULINE";
  } else {
    return null;
  }
}

module.exports = { capitalize, getEmotion, getGenderPresentation };
