import React from "react";
import {
  Box,
  Flex,
  Grid,
  Heading,
  Image,
  Stack,
  PseudoBox,
} from "@chakra-ui/core";

import { ITEMS } from "./data.js";

function WardrobePage() {
  return (
    <Grid templateRows="50vh 50vh">
      <Box boxShadow="md">
        <OutfitPreview />
      </Box>
      <Box overflow="auto">
        <Box px="5" py="5">
          <ItemsPanel />
        </Box>
      </Box>
    </Grid>
  );
}

function OutfitPreview() {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      height="100%"
      width="100%"
      backgroundColor="gray.900"
    >
      <Image
        src="http://pets.neopets.com/cp/wgmdtdwz/1/7.png"
        maxHeight="100%"
        maxWidth="100%"
      />
    </Flex>
  );
}

function ItemsPanel() {
  const [wornItemIds, setWornItemIds] = React.useState([1, 2, 3, 4, 6, 7]);
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

  return (
    <Stack spacing="10">
      {zonesAndItems.map(({ zoneName, items, wornItemId }) => (
        <Box key={zoneName}>
          <ItemsForZone
            zoneName={zoneName}
            items={items}
            wornItemId={wornItemId}
            onWearItem={wearItem}
          />
        </Box>
      ))}
    </Stack>
  );
}

function ItemsForZone({ zoneName, items, wornItemId, onWearItem }) {
  return (
    <Box>
      <Heading size="lg" mb="3">
        {zoneName}
      </Heading>
      <Stack spacing="3">
        {items.map((item) => (
          <Box key={item.id}>
            <Item
              item={item}
              isWorn={item.id === wornItemId}
              onWear={() => onWearItem(item.id)}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function Item({ item, isWorn, onWear }) {
  return (
    <PseudoBox
      role="group"
      d="flex"
      alignItems="center"
      cursor="pointer"
      onClick={onWear}
    >
      <PseudoBox
        rounded="full"
        boxShadow="md"
        border="1px"
        borderColor={isWorn ? "green.700" : "gray.400"}
        opacity={isWorn ? 1 : 0.7}
        width="50px"
        height="50px"
        overflow="hidden"
        transition="all 0.15s"
        transformOrigin="center"
        transform={isWorn ? null : "scale(0.8)"}
        _groupHover={
          !isWorn && {
            opacity: 0.9,
            transform: "scale(0.9)",
            borderColor: "gray.600",
          }
        }
      >
        <Image src={item.thumbnailSrc} />
      </PseudoBox>
      <PseudoBox
        marginLeft="3"
        fontSize="md"
        fontWeight={isWorn && "bold"}
        color={isWorn ? "gray.800" : "gray.600"}
        transition="all 0.15s"
        _groupHover={
          !isWorn && {
            color: "gray.800",
            fontWeight: "medium",
          }
        }
      >
        {item.name}
      </PseudoBox>
    </PseudoBox>
  );
}

export default WardrobePage;
