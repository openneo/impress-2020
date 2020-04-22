import React from "react";
import {
  Box,
  Flex,
  Grid,
  Heading,
  IconButton,
  Image,
  Stack,
  PseudoBox,
  Editable,
  EditablePreview,
  EditableInput,
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
    <Box color="green.800">
      <PseudoBox role="group" d="inline-block">
        <Heading size="xl" mb="6" wordBreak="break-word">
          <Editable defaultValue="roopal27">
            {({ isEditing, onRequestEdit }) => (
              <>
                <EditablePreview d="inline" />
                <EditableInput />
                {!isEditing && (
                  <PseudoBox
                    d="inline-block"
                    opacity="0"
                    transition="opacity 0.5s"
                    _groupHover={{ opacity: "1" }}
                    onClick={onRequestEdit}
                  >
                    <IconButton
                      icon="edit"
                      variant="link"
                      color="green.600"
                      aria-label="Edit outfit name"
                      title="Edit outfit name"
                    />
                  </PseudoBox>
                )}
              </>
            )}
          </Editable>
        </Heading>
      </PseudoBox>
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
    </Box>
  );
}

function ItemsForZone({ zoneName, items, wornItemId, onWearItem }) {
  return (
    <Box>
      <Heading size="lg" color="green.900" mb="3">
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
        rounded="lg"
        boxShadow="md"
        border="1px"
        borderColor={isWorn ? "green.700" : "green.700"}
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
            borderColor: "green.600",
          }
        }
      >
        <Image src={item.thumbnailSrc} />
      </PseudoBox>
      <PseudoBox
        marginLeft="3"
        fontSize="md"
        fontWeight={isWorn && "bold"}
        color="green.800"
        transition="all 0.15s"
        opacity={isWorn ? 1 : 0.8}
        _groupHover={
          !isWorn && {
            color: "green.800",
            fontWeight: "medium",
            opacity: 0.9,
          }
        }
      >
        {item.name}
      </PseudoBox>
    </PseudoBox>
  );
}

export default WardrobePage;
