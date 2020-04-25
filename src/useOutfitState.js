import React from "react";
import gql from "graphql-tag";
import produce, { enableMapSet } from "immer";
import { useQuery, useApolloClient } from "@apollo/react-hooks";

import { itemAppearanceFragment } from "./OutfitPreview";

enableMapSet();

function useOutfitState() {
  const apolloClient = useApolloClient();
  const [state, dispatchToOutfit] = React.useReducer(
    outfitStateReducer(apolloClient),
    {
      wornItemIds: new Set([
        "38913",
        "38911",
        "38912",
        "37375",
        "48313",
        "37229",
        "43014",
        "43397",
      ]),
      closetedItemIds: new Set(["74166", "68626", "40319"]),
      speciesId: "54", // Starry
      colorId: "75", // Zafara
    }
  );

  const { speciesId, colorId } = state;

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
            ...AppearanceForOutfitPreview

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

  const outfitState = {
    zonesAndItems,
    wornItemIds,
    allItemIds,
    speciesId,
    colorId,
  };

  return { loading, error, outfitState, dispatchToOutfit };
}

const outfitStateReducer = (apolloClient) => (baseState, action) => {
  switch (action.type) {
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
    default:
      throw new Error(`unexpected action ${action}`);
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
  const itemToAddZoneIds = itemToAdd.appearanceOn.layers.map((l) => l.zone.id);
  const wornItems = Array.from(wornItemIds).map((id) =>
    items.find((i) => i.id === id)
  );

  const conflictingIds = [];
  for (const wornItem of wornItems) {
    const wornItemZoneIds = wornItem.appearanceOn.layers.map((l) => l.zone.id);

    const hasConflict = wornItemZoneIds.some((zid) =>
      itemToAddZoneIds.includes(zid)
    );
    if (hasConflict) {
      conflictingIds.push(wornItem.id);
    }
  }

  return conflictingIds;
}

// TODO: Get this out of here, tbh...
function getZonesAndItems(itemsById, wornItemIds, closetedItemIds) {
  const wornItems = wornItemIds.map((id) => itemsById[id]).filter((i) => i);
  const closetedItems = closetedItemIds
    .map((id) => itemsById[id])
    .filter((i) => i);

  const allItems = [...wornItems, ...closetedItems];
  const zonesById = new Map();
  const itemsByZoneId = new Map();
  for (const item of allItems) {
    for (const layer of item.appearanceOn.layers) {
      const zoneId = layer.zone.id;
      zonesById.set(zoneId, layer.zone);

      if (!itemsByZoneId.has(zoneId)) {
        itemsByZoneId.set(zoneId, []);
      }
      itemsByZoneId.get(zoneId).push(item);
    }
  }

  const zonesAndItems = Array.from(itemsByZoneId.entries()).map(
    ([zoneId, items]) => ({
      zone: zonesById.get(zoneId),
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    })
  );

  zonesAndItems.sort((a, b) => a.zone.label.localeCompare(b.zone.label));

  return zonesAndItems;
}

export default useOutfitState;
