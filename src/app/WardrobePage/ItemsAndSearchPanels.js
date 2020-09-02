import React from "react";
import { Box, Flex } from "@chakra-ui/core";

import ItemsPanel from "./ItemsPanel";
import SearchToolbar from "./SearchToolbar";
import SearchPanel from "./SearchPanel";

const emptyQuery = { value: "", filterToZoneLabel: null };

/**
 * ItemsAndSearchPanels manages the shared layout and state for:
 *   - ItemsPanel, which shows the items in the outfit now, and
 *   - SearchPanel, which helps you find new items to add.
 *
 * These panels don't share a _lot_ of concerns; they're mainly intertwined by
 * the fact that they share the SearchToolbar at the top!
 *
 * We try to keep the search concerns in the search components, by avoiding
 * letting any actual _logic_ live at the root here; and instead just
 * performing some wiring to help them interact with each other via simple
 * state and refs.
 */
function ItemsAndSearchPanels({ loading, outfitState, dispatchToOutfit }) {
  const [searchQuery, setSearchQuery] = React.useState(emptyQuery);
  const scrollContainerRef = React.useRef();
  const searchQueryRef = React.useRef();
  const firstSearchResultRef = React.useRef();

  const onChange = React.useCallback(
    (newQuery) => setSearchQuery(newQuery || emptyQuery),
    [setSearchQuery]
  );

  return (
    <Flex direction="column" height="100%">
      <Box px="5" py="3" boxShadow="sm">
        <SearchToolbar
          query={searchQuery}
          searchQueryRef={searchQueryRef}
          firstSearchResultRef={firstSearchResultRef}
          onChange={onChange}
        />
      </Box>
      {searchQuery.value || searchQuery.filterToZoneLabel ? (
        <Box
          key="search-panel"
          gridArea="items"
          position="relative"
          overflow="auto"
          ref={scrollContainerRef}
        >
          <Box px="4" py="2">
            <SearchPanel
              query={searchQuery.value}
              outfitState={outfitState}
              dispatchToOutfit={dispatchToOutfit}
              scrollContainerRef={scrollContainerRef}
              searchQueryRef={searchQueryRef}
              firstSearchResultRef={firstSearchResultRef}
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
          <Box px="4" py="2">
            <ItemsPanel
              loading={loading}
              outfitState={outfitState}
              dispatchToOutfit={dispatchToOutfit}
            />
          </Box>
        </Box>
      )}
    </Flex>
  );
}

export default ItemsAndSearchPanels;
