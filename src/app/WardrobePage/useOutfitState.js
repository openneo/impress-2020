import React from "react";
import gql from "graphql-tag";
import produce, { enableMapSet } from "immer";
import { useQuery, useApolloClient } from "@apollo/client";

import { itemAppearanceFragment } from "../components/useOutfitAppearance";

enableMapSet();

function useOutfitState() {
  const apolloClient = useApolloClient();
  const initialState = parseOutfitUrl();
  const [state, dispatchToOutfit] = React.useReducer(
    outfitStateReducer(apolloClient),
    initialState
  );

  const { name, speciesId, colorId, pose } = state;

  // It's more convenient to manage these as a Set in state, but most callers
  // will find it more convenient to access them as arrays! e.g. for `.map()`
  const wornItemIds = Array.from(state.wornItemIds);
  const closetedItemIds = Array.from(state.closetedItemIds);

  const allItemIds = [...state.wornItemIds, ...state.closetedItemIds];
  const { loading, error, data } = useQuery(
    gql`
      query OutfitStateItems(
        $allItemIds: [ID!]!
        $speciesId: ID!
        $colorId: ID!
      ) {
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

        # NOTE: We skip this query if items is empty for perf reasons. If
        #       you're adding more fields, consider changing that condition!
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: { allItemIds, speciesId, colorId },
      skip: allItemIds.length === 0,
    }
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
    pose,
    url,
  };

  // Keep the URL up-to-date. (We don't listen to it, though 😅)
  React.useEffect(() => {
    window.history.replaceState(null, "", url);
  }, [url]);

  return { loading, error, outfitState, dispatchToOutfit };
}

const outfitStateReducer = (apolloClient) => (baseState, action) => {
  switch (action.type) {
    case "rename":
      return { ...baseState, name: action.outfitName };
    case "setSpeciesAndColor":
      return {
        ...baseState,
        speciesId: action.speciesId,
        colorId: action.colorId,
        pose: action.pose,
      };
    case "wearItem":
      return produce(baseState, (state) => {
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
        let conflictingIds;
        try {
          conflictingIds = findItemConflicts(itemId, state, apolloClient);
        } catch (e) {
          console.error(e);
          return;
        }
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
      return { ...baseState, pose: action.pose };
    case "reset":
      return produce(baseState, (state) => {
        const {
          name,
          speciesId,
          colorId,
          pose,
          wornItemIds,
          closetedItemIds,
        } = action;
        state.name = name;
        state.speciesId = speciesId ? String(speciesId) : baseState.speciesId;
        state.colorId = colorId ? String(colorId) : baseState.colorId;
        state.pose = pose || baseState.pose;
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

function parseOutfitUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    name: urlParams.get("name"),
    speciesId: urlParams.get("species"),
    colorId: urlParams.get("color"),
    pose: urlParams.get("pose") || "HAPPY_FEM",
    wornItemIds: new Set(urlParams.getAll("objects[]")),
    closetedItemIds: new Set(urlParams.getAll("closet[]")),
  };
}

function findItemConflicts(itemIdToAdd, state, apolloClient) {
  const { wornItemIds, speciesId, colorId } = state;

  const { items } = apolloClient.readQuery({
    query: gql`
      query OutfitStateItemConflicts(
        $itemIds: [ID!]!
        $speciesId: ID!
        $colorId: ID!
      ) {
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
    pose,
    wornItemIds,
    closetedItemIds,
  } = state;

  const params = new URLSearchParams({
    name: name || "",
    species: speciesId,
    color: colorId,
    pose,
  });
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
