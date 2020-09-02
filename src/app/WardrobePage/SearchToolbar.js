import React from "react";
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  useColorModeValue,
} from "@chakra-ui/core";
import { CloseIcon, SearchIcon } from "@chakra-ui/icons";

/**
 * SearchToolbar is rendered above both the ItemsPanel and the SearchPanel,
 * and contains the search field where the user types their query.
 *
 * It has some subtle keyboard interaction support, like DownArrow to go to the
 * first search result, and Escape to clear the search and go back to the
 * ItemsPanel. (The SearchPanel can also send focus back to here, with Escape
 * from anywhere, or UpArrow from the first result!)
 */
function SearchToolbar({
  query,
  searchQueryRef,
  firstSearchResultRef,
  onChange,
}) {
  const onMoveFocusDownToResults = (e) => {
    if (firstSearchResultRef.current) {
      firstSearchResultRef.current.focus();
      e.preventDefault();
    }
  };

  const focusBorderColor = useColorModeValue("green.600", "green.400");

  return (
    <InputGroup>
      <InputLeftElement>
        <SearchIcon color="gray.400" />
      </InputLeftElement>
      <Input
        placeholder="Search for items to add…"
        aria-label="Search for items to add…"
        focusBorderColor={focusBorderColor}
        value={query}
        ref={searchQueryRef}
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
            icon={<CloseIcon />}
            color="gray.400"
            variant="ghost"
            colorScheme="green"
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

export default SearchToolbar;
