import beeline from "honeycomb-beeline";
import fetch from "node-fetch";

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
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

function getPetStateFieldsFromPose(pose) {
  if (pose === "UNCONVERTED") {
    return { moodId: null, female: null, unconverted: true, labeled: true };
  } else if (pose === "UNKNOWN") {
    return { moodId: null, female: null, unconverted: false, labeled: false };
  } else if (pose === "HAPPY_MASC") {
    return { moodId: "1", female: false, unconverted: false, labeled: true };
  } else if (pose === "HAPPY_FEM") {
    return { moodId: "1", female: true, unconverted: false, labeled: true };
  } else if (pose === "SAD_MASC") {
    return { moodId: "2", female: false, unconverted: false, labeled: true };
  } else if (pose === "SAD_FEM") {
    return { moodId: "2", female: true, unconverted: false, labeled: true };
  } else if (pose === "SICK_MASC") {
    return { moodId: "4", female: false, unconverted: false, labeled: true };
  } else if (pose === "SICK_FEM") {
    return { moodId: "4", female: true, unconverted: false, labeled: true };
  } else {
    throw new Error(`unexpected pose ${pose}`);
  }
}

const POSE_NAMES = {
  HAPPY_MASC: "Happy Masc",
  SAD_MASC: "Sad Masc",
  SICK_MASC: "Sick Masc",
  HAPPY_FEM: "Happy Fem",
  SAD_FEM: "Sad Fem",
  SICK_FEM: "Sick Fem",
  UNCONVERTED: "Unconverted",
  UNKNOWN: "Unknown",
};

function getPoseName(pose) {
  return POSE_NAMES[pose];
}

function getRestrictedZoneIds(zonesRestrict) {
  const restrictedZoneIds = [];
  for (const [i, bit] of Array.from(zonesRestrict).entries()) {
    if (bit === "1") {
      restrictedZoneIds.push(i + 1);
    }
  }
  return restrictedZoneIds;
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
      ORDER BY c.standard DESC, ct.name, st.name LIMIT 1;`,
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
        `Discord returned ${res.status} ${res.statusText}: ${resText}`
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
  getPoseFromPetState,
  getPetStateFieldsFromPose,
  getPoseName,
  getRestrictedZoneIds,
  loadBodyName,
  logToDiscord,
  normalizeRow,

  // For Apollo's @cacheControl maxAge: time in seconds.
  oneWeek: 604800,
  oneDay: 86400,
  oneHour: 3600,
  oneMinute: 60,
};
