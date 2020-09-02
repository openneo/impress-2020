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
import Autosuggest from "react-autosuggest";

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
  const [suggestions, setSuggestions] = React.useState([]);

  const onMoveFocusDownToResults = (e) => {
    if (firstSearchResultRef.current) {
      firstSearchResultRef.current.focus();
      e.preventDefault();
    }
  };

  const focusBorderColor = useColorModeValue("green.600", "green.400");

  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={({ value }) => {
        if (value.includes("hat")) setSuggestions(["Zone: Hat"]);
        else setSuggestions([]);
      }}
      onSuggestionsClearRequested={() => {}}
      renderSuggestion={() => "Hat"}
      renderInputComponent={(props) => (
        <InputGroup>
          <InputLeftElement>
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input {...props} />
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
      )}
      inputProps={{
        placeholder: "Search for items to add…",
        "aria-label": "Search for items to add…",
        focusBorderColor: focusBorderColor,
        value: query,
        ref: searchQueryRef,
        onChange: (e) => onChange(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            onChange("");
            e.target.blur();
          } else if (e.key === "ArrowDown") {
            onMoveFocusDownToResults(e);
          }
        },
      }}
    />
  );
}

export default SearchToolbar;
