import React from "react";

import { ITEMS } from "./data.js";

function useOutfitState() {
  const [wornItemIds, setWornItemIds] = React.useState([
    1,
    2,
    3,
    4,
    6,
    7,
    8,
    9,
  ]);
  const [closetedItemIds, setClosetedItemIds] = React.useState([5]);

  const wearItem = React.useCallback(
    (itemIdToAdd) => {
      if (wornItemIds.includes(itemIdToAdd)) {
        return;
      }

      let newWornItemIds = wornItemIds;
      let newClosetedItemIds = closetedItemIds;

      const itemToAdd = ITEMS.find((item) => item.id === itemIdToAdd);

      // Move the item out of the closet.
      newClosetedItemIds = newClosetedItemIds.filter(
        (id) => id !== itemIdToAdd
      );

      // Move conflicting items to the closet.
      const conflictingItemIds = newWornItemIds.filter((wornItemId) => {
        const wornItem = ITEMS.find((item) => item.id === wornItemId);
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
    [wornItemIds, setWornItemIds, closetedItemIds, setClosetedItemIds]
  );

  const wornItems = wornItemIds.map((id) =>
    ITEMS.find((item) => item.id === id)
  );
  const closetedItems = closetedItemIds.map((id) =>
    ITEMS.find((item) => item.id === id)
  );

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

  const data = { zonesAndItems, wornItemIds };

  return [data, wearItem];
}

export default useOutfitState;
