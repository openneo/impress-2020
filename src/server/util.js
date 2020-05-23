function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function getEmotion(pose) {
  if (["HAPPY_MASC", "HAPPY_FEM"].includes(pose)) {
    return "HAPPY";
  } else if (["SAD_MASC", "SAD_FEM"].includes(pose)) {
    return "SAD";
  } else if (["SICK_MASC", "SICK_FEM"].includes(pose)) {
    return "SICK";
  } else if (["UNCONVERTED", "UNKNOWN"].includes(pose)) {
    return null;
  } else {
    throw new Error(`unrecognized pose ${JSON.stringify(pose)}`);
  }
}

function getGenderPresentation(pose) {
  if (["HAPPY_MASC", "SAD_MASC", "SICK_MASC"].includes(pose)) {
    return "MASCULINE";
  } else if (["HAPPY_FEM", "SAD_FEM", "SICK_FEM"].includes(pose)) {
    return "MASCULINE";
  } else if (["UNCONVERTED", "UNKNOWN"].includes(pose)) {
    return null;
  } else {
    throw new Error(`unrecognized pose ${JSON.stringify(pose)}`);
  }
}

function getPoseFromPetState(petState) {
  const { moodId, female, unconverted } = petState;

  if (unconverted) {
    return "UNCONVERTED";
  } else if (moodId == null || female == null) {
    return "UNKNOWN";
  } else if (String(moodId) === "1" && String(female) === "0") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(female) === "1") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(female) === "0") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(female) === "1") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(female) === "0") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(female) === "1") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `female=${female}, ` +
        `unconverted=${unconverted}`
    );
  }
}

function normalizeRow(row) {
  const normalizedRow = {};
  for (let [key, value] of Object.entries(row)) {
    key = key.replace(/_([a-z])/gi, (m) => m[1].toUpperCase());
    if ((key === "id" || key.endsWith("Id")) && typeof value === "number") {
      value = String(value);
    }
    normalizedRow[key] = value;
  }
  return normalizedRow;
}

module.exports = {
  capitalize,
  getEmotion,
  getGenderPresentation,
  getPoseFromPetState,
  normalizeRow,
};
