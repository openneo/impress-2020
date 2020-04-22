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

import useOutfitState from "./useOutfitState.js";

function WardrobePage() {
  return (
    <Grid
      // Fullscreen, split into a vertical stack on smaller screens
      // or a horizontal stack on larger ones!
      templateRows={{ base: "50% 50%", lg: "none" }}
      templateColumns={{ base: "none", lg: "50% 50%" }}
      position="absolute"
      top="0"
      bottom="0"
      left="0"
      right="0"
    >
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
  const [zonesAndItems, wearItem] = useOutfitState();

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
