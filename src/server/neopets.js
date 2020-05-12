const fetch = require("node-fetch");

async function loadPetData(petName) {
  const url =
    `http://www.neopets.com/amfphp/json.php/CustomPetService.getViewerData` +
    `/${petName}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `for pet data, neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${url})`
    );
  }

  const json = await res.json();
  if (!json.custom_pet) {
    throw new Error(`missing custom_pet data`);
  }

  return json;
}

async function loadAssetManifest(swfUrl) {
  const manifestUrl = convertSwfUrlToManifestUrl(swfUrl);
  const res = await fetch(manifestUrl);
  if (res.status === 404) {
    return null;
  } else if (!res.ok) {
    throw new Error(
      `for asset manifest, images.neopets.com returned: ` +
        `${res.status} ${res.statusText}. (${manifestUrl})`
    );
  }

  const json = await res.json();
  return {
    assets: json["cpmanifest"]["assets"].map((asset) => ({
      format: asset["format"],
      assetData: asset["asset_data"].map((assetDatum) => ({
        path: assetDatum["url"],
      })),
    })),
  };
}

const SWF_URL_PATTERN = /^http:\/\/images\.neopets\.com\/cp\/(.+?)\/swf\/(.+?)\.swf$/;

function convertSwfUrlToManifestUrl(swfUrl) {
  const match = swfUrl.match(SWF_URL_PATTERN);
  if (!match) {
    throw new Error(`unexpected SWF URL format: ${JSON.stringify(swfUrl)}`);
  }

  const [_, type, folders] = match;

  return `http://images.neopets.com/cp/${type}/data/${folders}/manifest.json`;
}

module.exports = { loadPetData, loadAssetManifest };
