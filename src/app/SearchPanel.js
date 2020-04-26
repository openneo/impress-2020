import React from "react";
import gql from "graphql-tag";
import { Box, Text, VisuallyHidden } from "@chakra-ui/core";
import { useQuery } from "@apollo/react-hooks";

import { Delay, Heading1, useDebounce } from "./util";
import { Item, ItemListContainer, ItemListSkeleton } from "./Item";
import { itemAppearanceFragment } from "./OutfitPreview";

function SearchPanel({
  query,
  outfitState,
  dispatchToOutfit,
  scrollContainerRef,
  searchQueryRef,
  firstSearchResultRef,
}) {
  // Whenever the search query changes, scroll back up to the top!
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [query, scrollContainerRef]);

  const onMoveFocusUpToQuery = (e) => {
    if (searchQueryRef.current) {
      searchQueryRef.current.focus();
      e.preventDefault();
    }
  };

  return (
    <Box
      color="green.800"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onMoveFocusUpToQuery(e);
        }
      }}
    >
      <Heading1 mb="4">Searching for "{query}"</Heading1>
      <SearchResults
        query={query}
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
        scrollContainerRef={scrollContainerRef}
        firstSearchResultRef={firstSearchResultRef}
        onMoveFocusUpToQuery={onMoveFocusUpToQuery}
      />
    </Box>
  );
}

function SearchResults({
  query,
  outfitState,
  dispatchToOutfit,
  scrollContainerRef,
  firstSearchResultRef,
  onMoveFocusUpToQuery,
}) {
  const { speciesId, colorId } = outfitState;

  const debouncedQuery = useDebounce(query, 300, { waitForFirstPause: true });
  const [isEndOfResults, setIsEndOfResults] = React.useState(false);

  React.useEffect(() => {
    setIsEndOfResults(false);
  }, [query]);

  const { loading, error, data, fetchMore } = useQuery(
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
      onCompleted: (d) => {
        const items = d && d.itemSearchToFit && d.itemSearchToFit.items;
        if (items && items.length < 30) {
          setIsEndOfResults(true);
        }
      },
    }
  );

  const result = data && data.itemSearchToFit;
  const resultQuery = result && result.query;
  const items = (result && result.items) || [];

  const onScrolledToBottom = React.useCallback(() => {
    if (!loading && !isEndOfResults) {
      fetchMore({
        variables: {
          offset: items.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult || fetchMoreResult.query !== prev.query) {
            return prev;
          }

          // Note: This is a bit awkward because, if the results count ends on
          // a multiple of 30, the user will see a flash of loading before
          // getting told it's actually the end. Ah well :/
          //
          // We could maybe make this more rigorous later with
          // react-virtualized to have a better scrollbar anyway, and then
          // we'd need to return the total result count... a bit annoying to
          // potentially double the query runtime? We'd need to see how slow it
          // actually makes things.
          if (fetchMoreResult.itemSearchToFit.items.length < 30) {
            setIsEndOfResults(true);
          }

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
  }, [loading, isEndOfResults, fetchMore, items.length]);

  useScrollTracker({ threshold: 300, scrollContainerRef, onScrolledToBottom });

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

  const onChange = (e) => {
    const itemId = e.target.value;
    const willBeWorn = e.target.checked;
    if (willBeWorn) {
      dispatchToOutfit({ type: "wearItem", itemId });
    } else {
      dispatchToOutfit({ type: "unwearItem", itemId });
    }
  };

  const goToPrevItem = (e) => {
    const prevLabel = e.target.closest("label").previousSibling;
    if (prevLabel) {
      prevLabel.querySelector("input[type=checkbox]").focus();
      prevLabel.scrollIntoView({ block: "center" });
      e.preventDefault();
    } else {
      // If we're at the top of the list, move back up to the search box!
      onMoveFocusUpToQuery(e);
    }
  };

  const goToNextItem = (e) => {
    const nextLabel = e.target.closest("label").nextSibling;
    if (nextLabel) {
      nextLabel.querySelector("input[type=checkbox]").focus();
      nextLabel.scrollIntoView({ block: "center" });
      e.preventDefault();
    }
  };

  return (
    <>
      <ItemListContainer>
        {items.map((item, index) => (
          <label key={item.id}>
            <VisuallyHidden
              as="input"
              type="checkbox"
              aria-label={`Wear "${item.name}"`}
              value={item.id}
              checked={outfitState.wornItemIds.includes(item.id)}
              ref={index === 0 ? firstSearchResultRef : null}
              onChange={onChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.click();
                } else if (e.key === "ArrowUp") {
                  goToPrevItem(e);
                } else if (e.key === "ArrowDown") {
                  goToNextItem(e);
                }
              }}
            />
            <Item
              item={item}
              outfitState={outfitState}
              dispatchToOutfit={dispatchToOutfit}
            />
          </label>
        ))}
      </ItemListContainer>
      {items && loading && <ItemListSkeleton count={8} />}
    </>
  );
}

function useScrollTracker({
  threshold,
  scrollContainerRef,
  onScrolledToBottom,
}) {
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
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) {
      return;
    }

    scrollContainer.addEventListener("scroll", onScroll);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", onScroll);
      }
    };
  }, [onScroll, scrollContainerRef]);
}

export default SearchPanel;
