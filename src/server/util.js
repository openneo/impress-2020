const beeline = require("honeycomb-beeline");
const fetch = require("node-fetch");

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

function getPoseFromPetData(petMetaData, petCustomData) {
  // TODO: Use custom data to decide if Unconverted.
  const moodId = petMetaData.mood;
  const genderId = petMetaData.gender;
  if (String(moodId) === "1" && String(genderId) === "1") {
    return "HAPPY_MASC";
  } else if (String(moodId) === "1" && String(genderId) === "2") {
    return "HAPPY_FEM";
  } else if (String(moodId) === "2" && String(genderId) === "1") {
    return "SAD_MASC";
  } else if (String(moodId) === "2" && String(genderId) === "2") {
    return "SAD_FEM";
  } else if (String(moodId) === "4" && String(genderId) === "1") {
    return "SICK_MASC";
  } else if (String(moodId) === "4" && String(genderId) === "2") {
    return "SICK_FEM";
  } else {
    throw new Error(
      `could not identify pose: ` +
        `moodId=${moodId}, ` +
        `genderId=${genderId}`
    );
  }
}

async function loadBodyName(bodyId, db) {
  if (String(bodyId) === "0") {
    return "All bodies";
  }

  const [rows] = await db.execute(
    `SELECT pt.body_id, st.name AS species_name,
        ct.name AS color_name, c.standard FROM pet_types pt
      INNER JOIN species_translations st
        ON pt.species_id = st.species_id AND st.locale = "en"
      INNER JOIN color_translations ct
        ON pt.color_id = ct.color_id AND ct.locale = "en"
      INNER JOIN colors c ON c.id = pt.color_id
        WHERE pt.body_id = ?
      ORDER BY ct.name, st.name LIMIT 1;`,
    [bodyId]
  );
  const row = normalizeRow(rows[0]);
  const speciesName = capitalize(row.speciesName);
  const colorName = row.standard ? "Standard" : capitalize(row.colorName);
  return `${colorName} ${speciesName}`;
}

async function logToDiscord(body) {
  const span = beeline.startSpan({ name: "logToDiscord" });

  try {
    const res = await fetch(process.env["SUPPORT_TOOLS_DISCORD_WEBHOOK_URL"], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const resText = await res.text();
      throw new Error(
        `Discord returned ${res.status} ${res.statusText}: ` + `${resText}`
      );
    }
  } finally {
    beeline.finishSpan(span);
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
  getPoseFromPetData,
  loadBodyName,
  logToDiscord,
  normalizeRow,
};
