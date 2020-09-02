import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import {
  Box,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  InputRightElement,
  useColorModeValue,
} from "@chakra-ui/core";
import { CloseIcon, SearchIcon } from "@chakra-ui/icons";
import { css, cx } from "emotion";
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

  // NOTE: This query should always load ~instantly, from the client cache.
  const { data } = useQuery(gql`
    query SearchToolbarZones {
      allZones {
        id
        label
        depth
        isCommonlyUsedByItems
      }
    }
  `);
  const zones = data?.allZones || [];
  const itemZones = zones.filter((z) => z.isCommonlyUsedByItems);

  let zoneLabels = itemZones.map((z) => z.label);
  zoneLabels = [...new Set(zoneLabels)];
  zoneLabels.sort();

  const onMoveFocusDownToResults = (e) => {
    if (firstSearchResultRef.current) {
      firstSearchResultRef.current.focus();
      e.preventDefault();
    }
  };

  const suggestionBgColor = useColorModeValue("transparent", "whiteAlpha.100");
  const highlightedBgColor = useColorModeValue("gray.100", "whiteAlpha.300");

  const renderSuggestion = React.useCallback(
    (zoneLabel, { isHighlighted }) => (
      <Box
        fontWeight={isHighlighted ? "bold" : "normal"}
        background={isHighlighted ? highlightedBgColor : suggestionBgColor}
        padding="2"
        paddingLeft="2.5rem"
        fontSize="sm"
      >
        {zoneLabel}
      </Box>
    ),
    [suggestionBgColor, highlightedBgColor]
  );

  const renderSuggestionsContainer = React.useCallback(
    ({ containerProps, children }) => {
      const { className, ...otherContainerProps } = containerProps;
      return (
        <Box
          {...otherContainerProps}
          borderBottomRadius="md"
          boxShadow="md"
          overflow="hidden"
          transition="all 0.4s"
          className={cx(
            className,
            css`
              li {
                list-style: none;
              }
            `
          )}
        >
          {children}
        </Box>
      );
    },
    []
  );

  // When we change the filter zone, clear out the suggestions.
  React.useEffect(() => {
    setSuggestions([]);
  }, [query.filterToZoneLabel]);

  const focusBorderColor = useColorModeValue("green.600", "green.400");

  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={({ value }) =>
        setSuggestions(getSuggestions(value, zoneLabels))
      }
      onSuggestionsClearRequested={() => setSuggestions([])}
      onSuggestionSelected={(e, { suggestion }) => {
        const valueWithoutLastWord = query.value.match(/^(.*?)\s*\S+$/)[1];
        onChange({
          ...query,
          value: valueWithoutLastWord,
          filterToZoneLabel: suggestion,
        });
      }}
      getSuggestionValue={(zl) => zl}
      shouldRenderSuggestions={() => query.filterToZoneLabel == null}
      highlightFirstSuggestion={true}
      renderSuggestion={renderSuggestion}
      renderSuggestionsContainer={renderSuggestionsContainer}
      renderInputComponent={(props) => (
        <InputGroup>
          {query.filterToZoneLabel ? (
            <InputLeftAddon>
              <SearchIcon color="gray.400" marginRight="3" />
              <Box fontSize="sm">{query.filterToZoneLabel}</Box>
            </InputLeftAddon>
          ) : (
            <InputLeftElement>
              <SearchIcon color="gray.400" />
            </InputLeftElement>
          )}
          <Input {...props} />
          {(query.value || query.filterToZoneLabel) && (
            <InputRightElement>
              <IconButton
                icon={<CloseIcon />}
                color="gray.400"
                variant="ghost"
                colorScheme="green"
                aria-label="Clear search"
                onClick={() => {
                  onChange(null);
                }}
                // Big style hacks here!
                height="calc(100% - 2px)"
                marginRight="2px"
              />
            </InputRightElement>
          )}
        </InputGroup>
      )}
      inputProps={{
        // placeholder: "Search for items to add…",
        "aria-label": "Search for items to add…",
        focusBorderColor: focusBorderColor,
        value: query.value || "",
        ref: searchQueryRef,
        minWidth: 0,
        borderBottomRadius: suggestions.length > 0 ? "0" : "md",
        // HACK: Chakra isn't noticing the InputLeftElement swapping out
        //       for the InputLeftAddon, so the styles aren't updating...
        //       Hard override!
        className: css`
          padding-left: ${query.filterToZoneLabel
            ? "1rem"
            : "2.5rem"} !important;
          border-bottom-left-radius: ${query.filterToZoneLabel
            ? "0"
            : "0.25rem"} !important;
          border-top-left-radius: ${query.filterToZoneLabel
            ? "0"
            : "0.25rem"} !important;
        `,
        onChange: (e, { newValue, method }) => {
          // The Autosuggest tries to change the _entire_ value of the element
          // when navigating suggestions, which isn't actually what we want.
          // Only accept value changes that are typed by the user!
          if (method === "type") {
            onChange({ ...query, value: newValue });
          }
        },
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            if (suggestions.length > 0) {
              setSuggestions([]);
              return;
            }
            onChange(null);
            e.target.blur();
          } else if (e.key === "ArrowDown") {
            if (suggestions.length > 0) {
              return;
            }
            onMoveFocusDownToResults(e);
          } else if (e.key === "Backspace" && e.target.selectionStart === 0) {
            onChange({ ...query, filterToZoneLabel: null });
          }
        },
      }}
    />
  );
}

function getSuggestions(value, zoneLabels) {
  const words = value.split(/\s+/);
  const lastWord = words[words.length - 1];
  if (lastWord.length < 2) {
    return [];
  }

  const matchingZoneLabels = zoneLabels.filter((zl) =>
    zl.toLowerCase().includes(lastWord.toLowerCase())
  );
  return matchingZoneLabels;
}

export default SearchToolbar;