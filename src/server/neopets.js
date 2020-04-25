const fetch = require("node-fetch");

async function loadPetData(petName) {
  const res = await fetch(
    `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
      `/${petName}`
  );
  if (!res.ok) {
    throw new Error(`neopets.com returned: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.custom_pet) {
    throw new Error(`missing custom_pet data`);
  }

  return json;
}

module.exports = { loadPetData };
