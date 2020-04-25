import React from "react";
import {
  Box,
  Editable,
  EditablePreview,
  EditableInput,
  Grid,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  PseudoBox,
  Skeleton,
  Stack,
  useToast,
} from "@chakra-ui/core";

import { Delay, Heading1, Heading2 } from "./util";
import ItemList, { ItemListSkeleton } from "./ItemList";
import OutfitPreview from "./OutfitPreview";
import SearchPanel from "./SearchPanel";
import useOutfitState from "./useOutfitState.js";

function WardrobePage() {
  const { loading, error, outfitState, dispatchToOutfit } = useOutfitState();
  const [searchQuery, setSearchQuery] = React.useState("");
  const toast = useToast();

  React.useEffect(() => {
    if (error) {
      console.log(error);
      toast({
        title: "We couldn't load this outfit 😖",
        description: "Please reload the page to try again. Sorry!",
        status: "error",
        isClosable: true,
        duration: 999999999,
      });
    }
  }, [error, toast]);

  return (
    <Box position="absolute" top="0" bottom="0" left="0" right="0">
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
          base: "minmax(100px, 1fr) auto minmax(300px, 1fr)",
          lg: "auto 1fr",
        }}
        templateColumns={{
          base: "100%",
          lg: "50% 50%",
        }}
        height="100%"
        width="100%"
      >
        <Box gridArea="outfit" backgroundColor="gray.900">
          <OutfitPreview outfitState={outfitState} />
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
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
              />
            ) : (
              <ItemsPanel
                loading={loading}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
              />
            )}
          </Box>
        </Box>
      </Grid>
    </Box>
  );
}

function SearchToolbar({ query, onChange }) {
  return (
    <InputGroup>
      <InputLeftElement>
        <Icon name="search" color="gray.400" />
      </InputLeftElement>
      <Input
        placeholder="Search for items to add…"
        focusBorderColor="green.600"
        color="green.800"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.target.blur();
          }
        }}
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

function ItemsPanel({ outfitState, loading, dispatchToOutfit }) {
  const { zonesAndItems, wornItemIds } = outfitState;

  return (
    <Box color="green.800">
      <OutfitHeading />
      <Stack spacing="10">
        {loading &&
          [1, 2, 3].map((i) => (
            <Box key={i}>
              <Delay>
                <Skeleton height="2.3rem" width="12rem" mb="3" />
                <ItemListSkeleton />
              </Delay>
            </Box>
          ))}
        {!loading &&
          zonesAndItems.map(({ zone, items }) => (
            <Box key={zone.id}>
              <Heading2 mb="3">{zone.label}</Heading2>
              <ItemList
                items={items}
                wornItemIds={items
                  .map((i) => i.id)
                  .filter((id) => wornItemIds.includes(id))}
                dispatchToOutfit={dispatchToOutfit}
              />
            </Box>
          ))}
      </Stack>
    </Box>
  );
}

function OutfitHeading() {
  return (
    <Box>
      <PseudoBox role="group" d="inline-block" position="relative">
        <Heading1 mb="6">
          <Editable defaultValue="Zafara Agent (roopal27)">
            {({ isEditing, onRequestEdit }) => (
              <>
                <EditablePreview />
                <EditableInput />
                {!isEditing && (
                  <OutfitNameEditButton onRequestEdit={onRequestEdit} />
                )}
              </>
            )}
          </Editable>
        </Heading1>
      </PseudoBox>
    </Box>
  );
}

function OutfitNameEditButton({ onRequestEdit }) {
  return (
    <PseudoBox
      d="inline-block"
      opacity="0"
      transition="opacity 0.5s"
      _groupHover={{ opacity: "1" }}
      onClick={onRequestEdit}
      position="absolute"
    >
      <IconButton
        icon="edit"
        variant="link"
        color="green.600"
        aria-label="Edit outfit name"
        title="Edit outfit name"
      />
    </PseudoBox>
  );
}

export default WardrobePage;
