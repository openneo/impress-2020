import React from "react";
import gql from "graphql-tag";
import { Box, Text } from "@chakra-ui/core";
import { useQuery } from "@apollo/react-hooks";

import { Delay, Heading1, useDebounce } from "./util";
import ItemList, { ItemListSkeleton } from "./ItemList";
import { itemAppearanceFragment } from "./OutfitPreview";

function SearchPanel({
  query,
  outfitState,
  dispatchToOutfit,
  getScrollParent,
}) {
  return (
    <Box color="green.800">
      <Heading1 mb="4">Searching for "{query}"</Heading1>
      <SearchResults
        query={query}
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
        getScrollParent={getScrollParent}
      />
    </Box>
  );
}

function SearchResults({ query, outfitState, dispatchToOutfit }) {
  const { speciesId, colorId } = outfitState;

  const debouncedQuery = useDebounce(query, 300, { waitForFirstPause: true });

  const { loading, error, data, fetchMore, variables } = useQuery(
    gql`
      query($query: String!, $speciesId: ID!, $colorId: ID!, $offset: Int!) {
        itemSearchToFit(
          query: $query
          speciesId: $speciesId
          colorId: $colorId
          offset: $offset
          limit: 50
        ) {
          query
          items {
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
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: { query: debouncedQuery, speciesId, colorId, offset: 0 },
      skip: debouncedQuery === null,
      notifyOnNetworkStatusChange: true,
    }
  );

  const result = data && data.itemSearchToFit;
  const resultQuery = result && result.query;
  const items = (result && result.items) || [];

  const onScrolledToBottom = React.useCallback(() => {
    if (!loading) {
      fetchMore({
        variables: {
          offset: items.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            ...prev,
            itemSearchToFit: {
              ...prev.itemSearchToFit,
              items: [
                ...prev.itemSearchToFit.items,
                ...fetchMoreResult.itemSearchToFit.items,
              ],
            },
          };
        },
      });
    }
  }, [loading, fetchMore, items.length]);

  if (resultQuery !== query || (loading && items.length === 0)) {
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
    <ScrollTracker threshold={300} onScrolledToBottom={onScrolledToBottom}>
      <ItemList
        items={items}
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
      />
      {items && loading && <ItemListSkeleton count={8} />}
    </ScrollTracker>
  );
}

function ScrollTracker({ children, threshold, onScrolledToBottom }) {
  const containerRef = React.useRef();
  const scrollParent = React.useRef();

  const onScroll = React.useCallback(
    (e) => {
      const topEdgeScrollPosition = e.target.scrollTop;
      const bottomEdgeScrollPosition =
        topEdgeScrollPosition + e.target.clientHeight;
      const remainingScrollDistance =
        e.target.scrollHeight - bottomEdgeScrollPosition;
      if (remainingScrollDistance < threshold) {
        onScrolledToBottom();
      }
    },
    [onScrolledToBottom, threshold]
  );

  React.useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }
    for (let el = containerRef.current; el.parentNode; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight) {
        scrollParent.current = el;
        break;
      }
    }

    scrollParent.current.addEventListener("scroll", onScroll);

    return () => {
      if (scrollParent.current) {
        scrollParent.current.removeEventListener("scroll", onScroll);
      }
    };
  }, [onScroll]);

  return <Box ref={containerRef}>{children}</Box>;
}

export default SearchPanel;
