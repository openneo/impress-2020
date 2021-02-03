import fetch from "node-fetch";

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

module.exports = { loadAssetManifest };
