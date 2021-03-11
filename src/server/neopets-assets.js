import fetch from "node-fetch";

async function loadAssetManifest(swfUrl) {
  const possibleManifestUrls = convertSwfUrlToPossibleManifestUrls(swfUrl);

  const responses = await Promise.all(
    possibleManifestUrls.map((url) => fetch(url))
  );

  // Print errors for any responses with unexpected statuses. We'll do this
  // even if other requests succeeded, or failed with an expected 404.
  for (const res of responses) {
    if (!res.ok && res.status !== 404) {
      console.error(
        `for asset manifest, images.neopets.com returned: ` +
          `${res.status} ${res.statusText}. (${res.url})`
      );
    }
  }

  const successfulResponse = responses.find((res) => res.ok);
  if (!successfulResponse) {
    return null;
  }

  const json = await successfulResponse.json();
  return {
    assets: json["cpmanifest"]["assets"].map((asset) => ({
      format: asset["format"],
      assetData: asset["asset_data"].map((assetDatum) => ({
        path: assetDatum["url"],
      })),
    })),
  };
}

const SWF_URL_PATTERN = /^http:\/\/images\.neopets\.com\/cp\/(bio|items)\/swf\/(.+?)_([a-z0-9]+)\.swf$/;

function convertSwfUrlToPossibleManifestUrls(swfUrl) {
  const match = swfUrl.match(SWF_URL_PATTERN);
  if (!match) {
    throw new Error(`unexpected SWF URL format: ${JSON.stringify(swfUrl)}`);
  }

  const type = match[1];
  const folders = match[2];
  const hash = match[3];

  // TODO: There are a few potential manifest URLs in play! Long-term, we
  //       should get this from modeling data. But these are some good guesses!
  return [
    `http://images.neopets.com/cp/${type}/data/${folders}/manifest.json`,
    `http://images.neopets.com/cp/${type}/data/${folders}_${hash}/manifest.json`,
  ];
}

module.exports = { loadAssetManifest };
