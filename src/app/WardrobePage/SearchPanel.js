import React from "react";
import gql from "graphql-tag";
import { Box, Text, VisuallyHidden } from "@chakra-ui/core";
import { useQuery } from "@apollo/client";

import { Delay, Heading1, useDebounce } from "../util";
import Item, { ItemListContainer, ItemListSkeleton } from "./Item";
import { itemAppearanceFragment } from "../components/useOutfitAppearance";

/**
 * SearchPanel shows item search results to the user, so they can preview them
 * and add them to their outfit!
 *
 * It's tightly coordinated with SearchToolbar, using refs to control special
 * keyboard and focus interactions.
 */
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

  // Sometimes we want to give focus back to the search field!
  const onMoveFocusUpToQuery = (e) => {
    if (searchQueryRef.current) {
      searchQueryRef.current.focus();
      e.preventDefault();
    }
  };

  return (
    <Box
      onKeyDown={(e) => {
        // This will catch any Escape presses when the user's focus is inside
        // the SearchPanel.
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

/**
 * SearchResults loads the search results from the user's query, renders them,
 * and tracks the scroll container for infinite scrolling.
 *
 * For each item, we render a <label> with a visually-hidden checkbox and the
 * Item component (which will visually reflect the radio's state). This makes
 * the list screen-reader- and keyboard-accessible!
 */
function SearchResults({
  query,
  outfitState,
  dispatchToOutfit,
  scrollContainerRef,
  firstSearchResultRef,
  onMoveFocusUpToQuery,
}) {
  const { loading, loadingMore, error, items, fetchMore } = useSearchResults(
    query,
    outfitState
  );
  useScrollTracker(scrollContainerRef, 300, fetchMore);

  // When the checkbox changes, we should wear/unwear the item!
  const onChange = (e) => {
    const itemId = e.target.value;
    const willBeWorn = e.target.checked;
    if (willBeWorn) {
      dispatchToOutfit({ type: "wearItem", itemId });
    } else {
      dispatchToOutfit({ type: "unwearItem", itemId });
    }
  };

  // You can use UpArrow/DownArrow to navigate between items, and even back up
  // to the search field!
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

  // If the results aren't ready, we have some special case UI!
  if (loading) {
    return (
      <Delay ms={500}>
        <ItemListSkeleton count={8} />
      </Delay>
    );
  } else if (error) {
    return (
      <Text>
        We hit an error trying to load your search results{" "}
        <span role="img" aria-label="(sweat emoji)">
          😓
        </span>{" "}
        Try again?
      </Text>
    );
  } else if (items.length === 0) {
    return (
      <Text>
        We couldn't find any matching items{" "}
        <span role="img" aria-label="(thinking emoji)">
          🤔
        </span>{" "}
        Try again?
      </Text>
    );
  }

  // Finally, render the item list, with checkboxes and Item components!
  // We also render some extra skeleton items at the bottom during infinite
  // scroll loading.
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
              isWorn={outfitState.wornItemIds.includes(item.id)}
              isInOutfit={outfitState.allItemIds.includes(item.id)}
              dispatchToOutfit={dispatchToOutfit}
            />
          </label>
        ))}
      </ItemListContainer>
      {loadingMore && <ItemListSkeleton count={8} />}
    </>
  );
}

/**
 * useSearchResults manages the actual querying and state management of search!
 * It's hefty, infinite-scroll pagination is a bit of a thing!
 */
function useSearchResults(query, outfitState) {
  const { speciesId, colorId } = outfitState;
  const [isEndOfResults, setIsEndOfResults] = React.useState(false);

  // We debounce the search query, so that we don't resend a new query whenever
  // the user types anything.
  const debouncedQuery = useDebounce(query, 300, { waitForFirstPause: true });

  // When the query changes, we should update our impression of whether we've
  // reached the end!
  React.useEffect(() => {
    setIsEndOfResults(false);
  }, [query]);

  // Here's the actual GQL query! At the bottom we have more config than usual!
  const {
    loading: loadingGQL,
    error,
    data,
    fetchMore: fetchMoreGQL,
  } = useQuery(
    gql`
      query SearchPanel(
        $query: String!
        $speciesId: ID!
        $colorId: ID!
        $offset: Int!
      ) {
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
              ...ItemAppearanceForOutfitPreview

              # This is used to group items by zone, and to detect conflicts when
              # wearing a new item.
              layers {
                zone {
                  id
                  label @client
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
        // This is called each time the query completes, including on
        // `fetchMore`, with the extended results. But, on the first time, this
        // logic can tell us whether we're at the end of the list, by counting
        // whether there was <30. We also have to check in `fetchMore`!
        const items = d && d.itemSearchToFit && d.itemSearchToFit.items;
        if (items && items.length < 30) {
          setIsEndOfResults(true);
        }
      },
    }
  );

  // Smooth over the data a bit, so that we can use key fields with confidence!
  const result = data && data.itemSearchToFit;
  const resultQuery = result && result.query;
  const items = (result && result.items) || [];

  // Okay, what kind of loading state is this?
  let loading;
  let loadingMore;
  if (loadingGQL && items.length > 0 && resultQuery === query) {
    // If we already have items for this query, but we're also loading GQL,
    // then we're `loadingMore`.
    loading = false;
    loadingMore = true;
  } else if (loadingGQL || query !== debouncedQuery) {
    // Otherwise, if we're loading GQL or the user has changed the query, we're
    // just `loading`.
    loading = true;
    loadingMore = false;
  } else {
    // Otherwise, we're not loading at all!
    loading = false;
    loadingMore = false;
  }

  // When SearchResults calls this, we'll resend the query, with the `offset`
  // increased. We'll append the results to the original query!
  const fetchMore = React.useCallback(() => {
    if (!loadingGQL && !isEndOfResults) {
      fetchMoreGQL({
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
  }, [loadingGQL, isEndOfResults, fetchMoreGQL, items.length]);

  return { loading, loadingMore, error, items, fetchMore };
}

/**
 * useScrollTracker watches for the given scroll container to scroll near the
 * bottom, then fires a callback. We use this to fetch more search results!
 */
function useScrollTracker(scrollContainerRef, threshold, onScrolledToBottom) {
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
