import fetch from "node-fetch";

async function neopetsAmfphpCall(methodName, args) {
  const url =
    "https://www.neopets.com/amfphp/json.php/" +
    encodeURIComponent(methodName) +
    "/" +
    args.map(encodeURIComponent).join("/");
  return await fetch(url).then((res) => res.json());
}

export async function loadPetMetaData(petName) {
  const response = await neopetsAmfphpCall("PetService.getPet", [petName]);
  return response;
}

export async function loadCustomPetData(petName) {
  try {
    const response = await neopetsAmfphpCall("CustomPetService.getViewerData", [
      petName,
    ]);
    return response;
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
          (await res.text())
      );
    } catch (error) {
      console.error(
        `[loadNCMallPreviewImageHash] could not load response text for ` +
          `NC Mall preview failed request: ${error.message}`
      );
    }
    throw new Error(
      `could not load NC Mall preview image hash: ${res.status} ${res.statusText}`
    );
  }

  const dataText = await res.text();
  if (dataText.includes("trying to reload the page too quickly")) {
    throw new Error(`hit the NC Mall rate limit`);
  }
  const data = JSON.parse(dataText);
  if (data.success !== true) {
    throw new Error(
      `NC Mall preview returned non-success data: ${JSON.stringify(data)}`
    );
  }
  if (!data.newsci) {
    throw new Error(
      `NC Mall preview returned no newsci field: ${JSON.stringify(data)}`
    );
  }
  return data.newsci;
}
