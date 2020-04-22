import React from "react";
import {
  Box,
  Editable,
  EditablePreview,
  EditableInput,
  Flex,
  Grid,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  PseudoBox,
  Stack,
  Text,
} from "@chakra-ui/core";

import useOutfitState from "./useOutfitState.js";
import { ITEMS } from "./data";

function WardrobePage() {
  const [data, wearItem] = useOutfitState();
  const [searchQuery, setSearchQuery] = React.useState("");

  return (
    <Grid
      // Fullscreen, split into a vertical stack on smaller screens
      // or a horizontal stack on larger ones!
      templateAreas={{
        base: `"outfit"
               "search"
               "items"`,
        lg: `"outfit search"
             "outfit items"`,
      }}
      templateRows={{
        base: "50% auto 1fr",
        lg: "auto 1fr",
      }}
      templateColumns={{
        base: "100%",
        lg: "50% 50%",
      }}
      position="absolute"
      top="0"
      bottom="0"
      left="0"
      right="0"
    >
      <Box gridArea="outfit">
        <OutfitPreview />
      </Box>
      <Box gridArea="search" boxShadow="sm">
        <Box px="5" py="3">
          <SearchToolbar query={searchQuery} onChange={setSearchQuery} />
        </Box>
      </Box>
      <Box gridArea="items" overflow="auto">
        <Box px="5" py="5">
          {searchQuery ? (
            <SearchPanel
              query={searchQuery}
              wornItemIds={data.wornItemIds}
              onWearItem={wearItem}
            />
          ) : (
            <ItemsPanel
              zonesAndItems={data.zonesAndItems}
              onWearItem={wearItem}
            />
          )}
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

function SearchToolbar({ query, onChange }) {
  return (
    <InputGroup>
      <InputLeftElement>
        <Icon name="search" color="gray.400" />
      </InputLeftElement>
      <Input
        placeholder="Search items…"
        focusBorderColor="green.600"
        color="green.800"
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
      {query && (
        <InputRightElement>
          <IconButton
            icon="close"
            color="gray.400"
            variant="ghost"
            variantColor="green"
            aria-label="Clear search"
            onClick={() => onChange("")}
          />
        </InputRightElement>
      )}
    </InputGroup>
  );
}

function SearchPanel({ query, wornItemIds, onWearItem }) {
  const normalize = (s) => s.toLowerCase();
  const results = ITEMS.filter((item) =>
    normalize(item.name).includes(normalize(query))
  );
  results.sort((a, b) => a.name.localeCompare(b.name));

  const resultsSection =
    results.length > 0 ? (
      <ItemList
        items={results}
        wornItemIds={wornItemIds}
        onWearItem={onWearItem}
      />
    ) : (
      <Text color="green.500">
        We couldn't find any matching items{" "}
        <span role="img" aria-label="(thinking emoji)">
          🤔
        </span>{" "}
        Try again?
      </Text>
    );

  return (
    <Box color="green.800">
      <Heading fontFamily="Delicious" fontWeight="800" size="2xl" mb="6">
        Searching for "{query}"
      </Heading>
      {resultsSection}
    </Box>
  );
}

function ItemsPanel({ zonesAndItems, onWearItem }) {
  return (
    <Box color="green.800">
      <OutfitHeading />
      <Stack spacing="10">
        {zonesAndItems.map(({ zoneName, items, wornItemId }) => (
          <Box key={zoneName}>
            <ItemsForZone
              zoneName={zoneName}
              items={items}
              wornItemId={wornItemId}
              onWearItem={onWearItem}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function OutfitHeading() {
  return (
    <PseudoBox role="group" d="inline-block">
      <Heading
        size="2xl"
        mb="6"
        wordBreak="break-word"
        fontFamily="Delicious"
        fontWeight="800"
      >
        <Editable defaultValue="Zafara Agent (roopal27)">
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
  );
}

function ItemsForZone({ zoneName, items, wornItemId, onWearItem }) {
  return (
    <Box>
      <Heading size="xl" color="green.800" mb="3" fontFamily="Delicious">
        {zoneName}
      </Heading>
      <ItemList
        items={items}
        wornItemIds={[wornItemId]}
        onWearItem={onWearItem}
      />
    </Box>
  );
}

function ItemList({ items, wornItemIds, onWearItem }) {
  return (
    <Stack spacing="3">
      {items.map((item) => (
        <Box key={item.id}>
          <Item
            item={item}
            isWorn={wornItemIds.includes(item.id)}
            onWear={() => onWearItem(item.id)}
          />
        </Box>
      ))}
    </Stack>
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
