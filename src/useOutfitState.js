import React from "react";

import useItemData from "./useItemData";

function useOutfitState() {
  const [wornItemIds, setWornItemIds] = React.useState([
    "38913",
    "38911",
    "38912",
    "37375",
    "48313",
    "37229",
    "43014",
    "43397",
  ]);
  const [closetedItemIds, setClosetedItemIds] = React.useState(["74166"]);

  const allItemIds = [...wornItemIds, ...closetedItemIds];

  const { loading, error, itemsById } = useItemData(allItemIds);

  const wearItem = React.useCallback(
    (itemIdToAdd) => {
      if (wornItemIds.includes(itemIdToAdd)) {
        return;
      }

      let newWornItemIds = wornItemIds;
      let newClosetedItemIds = closetedItemIds;

      const itemToAdd = itemsById[itemIdToAdd];

      // Move the item out of the closet.
      newClosetedItemIds = newClosetedItemIds.filter(
        (id) => id !== itemIdToAdd
      );

      // Move conflicting items to the closet.
      const conflictingItemIds = newWornItemIds.filter((wornItemId) => {
        const wornItem = itemsById[wornItemId];
        return wornItem.zoneName === itemToAdd.zoneName;
      });
      newWornItemIds = newWornItemIds.filter(
        (id) => !conflictingItemIds.includes(id)
      );
      newClosetedItemIds = [...newClosetedItemIds, ...conflictingItemIds];

      // Add this item to the worn set.
      newWornItemIds = [...newWornItemIds, itemIdToAdd];

      setWornItemIds(newWornItemIds);
      setClosetedItemIds(newClosetedItemIds);
    },
    [wornItemIds, closetedItemIds, itemsById]
  );

  const zonesAndItems = getZonesAndItems(
    itemsById,
    wornItemIds,
    closetedItemIds
  );

  const data = { zonesAndItems, wornItemIds };

  return { loading, error, data, wearItem };
}

function getZonesAndItems(itemsById, wornItemIds, closetedItemIds) {
  const wornItems = wornItemIds.map((id) => itemsById[id]).filter((i) => i);
  const closetedItems = closetedItemIds
    .map((id) => itemsById[id])
    .filter((i) => i);

  const allItems = [...wornItems, ...closetedItems];
  const allZoneNames = [...new Set(allItems.map((item) => item.zoneName))];
  allZoneNames.sort();

  const zonesAndItems = allZoneNames.map((zoneName) => {
    const items = allItems.filter((item) => item.zoneName === zoneName);
    items.sort((a, b) => a.name.localeCompare(b.name));
    const wornItemId =
      items.map((item) => item.id).find((id) => wornItemIds.includes(id)) ||
      null;
    return { zoneName, items, wornItemId };
  });

  return zonesAndItems;
}

export default useOutfitState;
