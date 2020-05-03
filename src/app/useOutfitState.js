import React from "react";
import gql from "graphql-tag";
import produce, { enableMapSet } from "immer";
import { useQuery, useApolloClient } from "@apollo/react-hooks";

import { itemAppearanceFragment } from "./useOutfitAppearance";

enableMapSet();

function useOutfitState() {
  const apolloClient = useApolloClient();
  const [state, dispatchToOutfit] = React.useReducer(
    outfitStateReducer(apolloClient),
    {
      name: "Dress to Impress demo 💖",
      wornItemIds: new Set(["51054", "35779", "35780", "37830"]),
      closetedItemIds: new Set([
        "76732",
        "54393",
        "80087",
        "75997",
        "57632",
        "80052",
        "67617",
        "50861",
        "77778",
        "51164",
        "62215",
        "70660",
        "74546",
        "57997",
      ]),
      speciesId: "24",
      colorId: "62",
      emotion: "HAPPY",
      genderPresentation: "FEMININE",
    }
  );

  const { name, speciesId, colorId, emotion, genderPresentation } = state;

  // It's more convenient to manage these as a Set in state, but most callers
  // will find it more convenient to access them as arrays! e.g. for `.map()`
  const wornItemIds = Array.from(state.wornItemIds);
  const closetedItemIds = Array.from(state.closetedItemIds);

  const allItemIds = [...state.wornItemIds, ...state.closetedItemIds];
  const { loading, error, data } = useQuery(
    gql`
      query($allItemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $allItemIds) {
          # TODO: De-dupe this from SearchPanel?
          id
          name
          thumbnailUrl

          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            # This enables us to quickly show the item when the user clicks it!
            ...ItemAppearanceForOutfitPreview

            # This is used to group items by zone, and to detect conflicts when
            # wearing a new item.
            layers {
              zone {
                id
                label
              }
            }
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    { variables: { allItemIds, speciesId, colorId } }
  );

  const items = (data && data.items) || [];
  const itemsById = {};
  for (const item of items) {
    itemsById[item.id] = item;
  }

  const zonesAndItems = getZonesAndItems(
    itemsById,
    wornItemIds,
    closetedItemIds
  );

  const url = buildOutfitUrl(state);

  const outfitState = {
    zonesAndItems,
    name,
    wornItemIds,
    closetedItemIds,
    allItemIds,
    speciesId,
    colorId,
    emotion,
    genderPresentation,
    url,
  };

  // Get the state from the URL the first time we load.
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("species")) {
      dispatchToOutfit({
        type: "reset",
        name: urlParams.get("name"),
        speciesId: urlParams.get("species"),
        colorId: urlParams.get("color"),
        emotion: urlParams.get("emotion") || "HAPPY",
        genderPresentation: urlParams.get("genderPresentation") || "FEMININE",
        wornItemIds: urlParams.getAll("objects[]"),
        closetedItemIds: urlParams.getAll("closet[]"),
      });
    }
  }, []);

  // Afterwards, keep the URL up-to-date, but don't listen to it anymore.
  React.useEffect(() => {
    window.history.replaceState(null, "", url);
  }, [url]);

  return { loading, error, outfitState, dispatchToOutfit };
}

const outfitStateReducer = (apolloClient) => (baseState, action) => {
  switch (action.type) {
    case "rename":
      return { ...baseState, name: action.outfitName };
    case "changeColor":
      return { ...baseState, colorId: action.colorId };
    case "changeSpecies":
      return { ...baseState, speciesId: action.speciesId };
    case "wearItem":
      return produce(baseState, (state) => {
        // A hack to work around https://github.com/immerjs/immer/issues/586
        state.wornItemIds.add("fake-id-immer#586").delete("fake-id-immer#586");

        const { wornItemIds, closetedItemIds } = state;
        const { itemId } = action;

        // Move conflicting items to the closet.
        //
        // We do this by looking them up in the Apollo Cache, which is going to
        // include the relevant item data because the `useOutfitState` hook
        // queries for it!
        //
        // (It could be possible to mess up the timing by taking an action
        // while worn items are still partially loading, but I think it would
        // require a pretty weird action sequence to make that happen... like,
        // doing a search and it loads before the worn item data does? Anyway,
        // Apollo will throw in that case, which should just essentially reject
        // the action.)
        const conflictingIds = findItemConflicts(itemId, state, apolloClient);
        for (const conflictingId of conflictingIds) {
          wornItemIds.delete(conflictingId);
          closetedItemIds.add(conflictingId);
        }

        // Move this item from the closet to the worn set.
        closetedItemIds.delete(itemId);
        wornItemIds.add(itemId);
      });
    case "unwearItem":
      return produce(baseState, (state) => {
        const { wornItemIds, closetedItemIds } = state;
        const { itemId } = action;

        // Move this item from the worn set to the closet.
        wornItemIds.delete(itemId);
        closetedItemIds.add(itemId);
      });
    case "removeItem":
      return produce(baseState, (state) => {
        const { wornItemIds, closetedItemIds } = state;
        const { itemId } = action;

        // Remove this item from both the worn set and the closet.
        wornItemIds.delete(itemId);
        closetedItemIds.delete(itemId);
      });
    case "setPose":
      return produce(baseState, (state) => {
        const { emotion, genderPresentation } = action;
        state.emotion = emotion;
        state.genderPresentation = genderPresentation;
      });
    case "reset":
      return produce(baseState, (state) => {
        const {
          name,
          speciesId,
          colorId,
          emotion,
          genderPresentation,
          wornItemIds,
          closetedItemIds,
        } = action;
        state.name = name;
        state.speciesId = speciesId ? String(speciesId) : baseState.speciesId;
        state.colorId = colorId ? String(colorId) : baseState.colorId;
        state.emotion = emotion || baseState.emotion;
        state.genderPresentation =
          genderPresentation || baseState.genderPresentation;
        state.wornItemIds = wornItemIds
          ? new Set(wornItemIds.map(String))
          : baseState.wornItemIds;
        state.closetedItemIds = closetedItemIds
          ? new Set(closetedItemIds.map(String))
          : baseState.closetedItemIds;
      });
    default:
      throw new Error(`unexpected action ${JSON.stringify(action)}`);
  }
};

function findItemConflicts(itemIdToAdd, state, apolloClient) {
  const { wornItemIds, speciesId, colorId } = state;

  const { items } = apolloClient.readQuery({
    query: gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $itemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              zone {
                id
              }
            }

            restrictedZones {
              id
            }
          }
        }
      }
    `,
    variables: {
      itemIds: [itemIdToAdd, ...wornItemIds],
      speciesId,
      colorId,
    },
  });
  const itemToAdd = items.find((i) => i.id === itemIdToAdd);
  if (!itemToAdd.appearanceOn) {
    return [];
  }
  const wornItems = Array.from(wornItemIds).map((id) =>
    items.find((i) => i.id === id)
  );

  const itemToAddZoneSets = getItemZones(itemToAdd);

  const conflictingIds = [];
  for (const wornItem of wornItems) {
    if (!wornItem.appearanceOn) {
      continue;
    }

    const wornItemZoneSets = getItemZones(wornItem);

    const itemsConflict =
      setsIntersect(
        itemToAddZoneSets.occupies,
        wornItemZoneSets.occupiesOrRestricts
      ) ||
      setsIntersect(
        wornItemZoneSets.occupies,
        itemToAddZoneSets.occupiesOrRestricts
      );

    if (itemsConflict) {
      conflictingIds.push(wornItem.id);
    }
  }

  return conflictingIds;
}

function getItemZones(item) {
  const occupies = new Set(item.appearanceOn.layers.map((l) => l.zone.id));
  const restricts = new Set(item.appearanceOn.restrictedZones.map((z) => z.id));
  const occupiesOrRestricts = new Set([...occupies, ...restricts]);
  return { occupies, occupiesOrRestricts };
}

function setsIntersect(a, b) {
  for (const el of a) {
    if (b.has(el)) {
      return true;
    }
  }
  return false;
}

// TODO: Get this out of here, tbh...
function getZonesAndItems(itemsById, wornItemIds, closetedItemIds) {
  const wornItems = wornItemIds.map((id) => itemsById[id]).filter((i) => i);
  const closetedItems = closetedItemIds
    .map((id) => itemsById[id])
    .filter((i) => i);

  // We use zone label here, rather than ID, because some zones have the same
  // label and we *want* to over-simplify that in this UI. (e.g. there are
  // multiple Hat zones, and some items occupy different ones, but mostly let's
  // just group them and if they don't conflict then all the better!)
  const allItems = [...wornItems, ...closetedItems];
  const itemsByZoneLabel = new Map();
  for (const item of allItems) {
    if (!item.appearanceOn) {
      continue;
    }

    for (const layer of item.appearanceOn.layers) {
      const zoneLabel = layer.zone.label;

      if (!itemsByZoneLabel.has(zoneLabel)) {
        itemsByZoneLabel.set(zoneLabel, []);
      }
      itemsByZoneLabel.get(zoneLabel).push(item);
    }
  }

  const zonesAndItems = Array.from(itemsByZoneLabel.entries()).map(
    ([zoneLabel, items]) => ({
      zoneLabel: zoneLabel,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    })
  );

  zonesAndItems.sort((a, b) => a.zoneLabel.localeCompare(b.zoneLabel));

  return zonesAndItems;
}

function buildOutfitUrl(state) {
  const {
    name,
    speciesId,
    colorId,
    emotion,
    genderPresentation,
    wornItemIds,
    closetedItemIds,
  } = state;

  const params = new URLSearchParams();
  params.append("name", name);
  params.append("species", speciesId);
  params.append("color", colorId);
  params.append("emotion", emotion);
  params.append("genderPresentation", genderPresentation);
  for (const itemId of wornItemIds) {
    params.append("objects[]", itemId);
  }
  for (const itemId of closetedItemIds) {
    params.append("closet[]", itemId);
  }

  const { origin, pathname } = window.location;
  const url = origin + pathname + "?" + params.toString();
  return url;
}

export default useOutfitState;
