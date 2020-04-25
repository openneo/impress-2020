import React from "react";
import gql from "graphql-tag";
import { Box, Text } from "@chakra-ui/core";
import { useQuery } from "@apollo/react-hooks";

import { Delay, Heading1, useDebounce } from "./util";
import ItemList, { ItemListSkeleton } from "./ItemList";
import { itemAppearanceFragment } from "./OutfitPreview";

function SearchPanel({ query, outfitState, dispatchToOutfit }) {
  return (
    <Box color="green.800">
      <Heading1 mb="4">Searching for "{query}"</Heading1>
      <SearchResults
        query={query}
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
      />
    </Box>
  );
}

function SearchResults({ query, outfitState, dispatchToOutfit }) {
  const { speciesId, colorId } = outfitState;

  const debouncedQuery = useDebounce(query, 300, { waitForFirstPause: true });

  const { loading, error, data, variables } = useQuery(
    gql`
      query($query: String!, $speciesId: ID!, $colorId: ID!) {
        itemSearchToFit(
          query: $query
          speciesId: $speciesId
          colorId: $colorId
        ) {
          # TODO: De-dupe this from useOutfitState?
          id
          name
          thumbnailUrl

          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            # This enables us to quickly show the item when the user clicks it!
            ...AppearanceForOutfitPreview

            # This is used to group items by zone, and to detect conflicts when
            # wearing a new item.
            layers {
              zone {
                id
                label
              }
            }
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: { query: debouncedQuery, speciesId, colorId },
      skip: debouncedQuery === null,
    }
  );

  if (loading || variables.query !== query) {
    return (
      <Delay ms={500}>
        <ItemListSkeleton count={8} />
      </Delay>
    );
  }

  if (error) {
    return (
      <Text color="green.500">
        We hit an error trying to load your search results{" "}
        <span role="img" aria-label="(sweat emoji)">
          😓
        </span>{" "}
        Try again?
      </Text>
    );
  }

  const items = data.itemSearchToFit;

  if (items.length === 0) {
    return (
      <Text color="green.500">
        We couldn't find any matching items{" "}
        <span role="img" aria-label="(thinking emoji)">
          🤔
        </span>{" "}
        Try again?
      </Text>
    );
  }

  return (
    <ItemList
      items={items}
      outfitState={outfitState}
      dispatchToOutfit={dispatchToOutfit}
    />
  );
}

export default SearchPanel;
