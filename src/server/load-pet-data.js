import fetch from "node-fetch";

async function neopetsAmfphpCall(methodName, args) {
  const url =
    "https://www.neopets.com/amfphp/json.php/" +
    encodeURIComponent(methodName) +
    "/" +
    args.map(encodeURIComponent).join("/");

  const res = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "impress-2020 (https://impress-2020.openneo.net/)",
    },
  });
  if (!res.ok) {
    throw new Error(
      `[AMFPHP] HTTP request failed, got status ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export async function loadPetMetaData(petName) {
  return neopetsAmfphpCall("PetService.getPet", [petName]);
}

export async function loadCustomPetData(petName) {
  // HACK: The json.php amfphp endpoint is known not to support string
  // arguments with leading digits. (It aggressively parses them as ints lmao.)
  // So, we work around it by converting the pet name to its image hash, then
  // prepending "@", which is a special code that can *also* be used in the
  // CustomPetService in place of name, to get a pet's appearance from its image
  // hash.
  if (petName.match(/^[0-9]/)) {
    const imageHash = await loadImageHashFromPetName(petName);
    console.debug(
      `[loadCustomPetData] Converted pet name ${petName} to @${imageHash}`,
    );
    petName = "@" + imageHash;
  }

  try {
    return neopetsAmfphpCall("CustomPetService.getViewerData", [petName]);
  } catch (error) {
    // If Neopets.com fails to find valid customization data, we return null.
    if (
      error.code === "AMFPHP_RUNTIME_ERROR" &&
      error.faultString === "Unable to find body artwork for this combination."
    ) {
      return null;
    } else {
      throw error;
    }
  }
}

const PETS_CP_URL_PATTERN =
  /https?:\/\/pets\.neopets\.com\/cp\/([a-z0-9]+)\/[0-9]+\/[0-9]+\.png/;
async function loadImageHashFromPetName(petName) {
  const res = await fetch(`https://pets.neopets.com/cpn/${petName}/1/1.png`, {
    redirect: "manual",
  });
  if (res.status !== 302) {
    throw new Error(
      `[loadImageHashFromPetName] expected /cpn/ URL to redirect with status ` +
        `302, but instead got status ${res.status} ${res.statusText}`,
    );
  }

  const newUrl = res.headers.get("location");
  const newUrlMatch = newUrl.match(PETS_CP_URL_PATTERN);
  if (newUrlMatch == null) {
    throw new Error(
      `[loadImageHashFromPetName] expected /cpn/ URL to redirect to a /cp/ ` +
        `URL matching ${PETS_CP_URL_PATTERN}, but got ${newUrl}`,
    );
  }

  return newUrlMatch[1];
}

export async function loadNCMallPreviewImageHash(basicImageHash, itemIds) {
  const query = new URLSearchParams();
  query.append("selPetsci", basicImageHash);
  for (const itemId of itemIds) {
    query.append("itemsList[]", itemId);
  }

  // When we get rate limited, subsequent requests to the *exact* same URL
  // fail. For our use case, it makes sense to cache-bust that, I think!
  query.append("dti-rand", Math.random());

  const url = `http://ncmall.neopets.com/mall/ajax/petview/getPetData.php?${query}`;
  const res = await fetch(url);
  if (!res.ok) {
    try {
      console.error(
        `[loadNCMallPreviewImageHash] ${res.status} ${res.statusText}:\n` +
          (await res.text()),
      );
    } catch (error) {
      console.error(
        `[loadNCMallPreviewImageHash] could not load response text for ` +
          `NC Mall preview failed request: ${error.message}`,
      );
    }
    throw new Error(
      `could not load NC Mall preview image hash: ${res.status} ${res.statusText}`,
    );
  }

  const dataText = await res.text();
  if (dataText.includes("trying to reload the page too quickly")) {
    throw new Error(`hit the NC Mall rate limit`);
  }
  const data = JSON.parse(dataText);
  if (data.success !== true) {
    throw new Error(
      `NC Mall preview returned non-success data: ${JSON.stringify(data)}`,
    );
  }
  if (!data.newsci) {
    throw new Error(
      `NC Mall preview returned no newsci field: ${JSON.stringify(data)}`,
    );
  }
  return data.newsci;
}
