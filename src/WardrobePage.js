import React from "react";
import {
  Box,
  Grid,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useToast,
} from "@chakra-ui/core";

import ItemsPanel from "./ItemsPanel";
import OutfitPreview from "./OutfitPreview";
import SearchPanel from "./SearchPanel";
import useOutfitState from "./useOutfitState.js";

function WardrobePage() {
  const { loading, error, outfitState, dispatchToOutfit } = useOutfitState();
  const [searchQuery, setSearchQuery] = React.useState("");
  const toast = useToast();
  const searchContainerRef = React.useRef();
  const searchQueryRef = React.useRef();
  const firstSearchResultRef = React.useRef();

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

  React.useEffect(() => {
    if (searchContainerRef.current) {
      searchContainerRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

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
          <OutfitPreview
            outfitState={outfitState}
            dispatchToOutfit={dispatchToOutfit}
          />
        </Box>
        <Box gridArea="search" boxShadow="sm">
          <Box px="5" py="3">
            <SearchToolbar
              query={searchQuery}
              queryRef={searchQueryRef}
              onChange={setSearchQuery}
              onMoveFocusDownToResults={(e) => {
                if (firstSearchResultRef.current) {
                  firstSearchResultRef.current.focus();
                  e.preventDefault();
                }
              }}
            />
          </Box>
        </Box>

        {searchQuery ? (
          <Box
            gridArea="items"
            position="relative"
            overflow="auto"
            key="search-panel"
            ref={searchContainerRef}
          >
            <Box px="4" py="5">
              <SearchPanel
                query={searchQuery}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
                firstSearchResultRef={firstSearchResultRef}
                onMoveFocusUpToQuery={(e) => {
                  if (searchQueryRef.current) {
                    searchQueryRef.current.focus();
                    e.preventDefault();
                  }
                }}
              />
            </Box>
          </Box>
        ) : (
          <Box
            gridArea="items"
            position="relative"
            overflow="auto"
            key="items-panel"
          >
            <Box px="5" py="5">
              <ItemsPanel
                loading={loading}
                outfitState={outfitState}
                dispatchToOutfit={dispatchToOutfit}
              />
            </Box>
          </Box>
        )}
      </Grid>
    </Box>
  );
}

function SearchToolbar({
  query,
  queryRef,
  onChange,
  onMoveFocusDownToResults,
}) {
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
        ref={queryRef}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.target.blur();
          } else if (e.key === "ArrowDown") {
            onMoveFocusDownToResults(e);
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
            // Big style hacks here!
            height="calc(100% - 2px)"
            marginRight="2px"
          />
        </InputRightElement>
      )}
    </InputGroup>
  );
}

export default WardrobePage;
