import React from "react";
import gql from "graphql-tag";
import { Box, Text, VisuallyHidden } from "@chakra-ui/core";
import { useQuery } from "@apollo/react-hooks";

import { Delay, Heading1, useDebounce } from "./util";
import { ItemListContainer, ItemListSkeleton, Item } from "./ItemList";
import { itemAppearanceFragment } from "./OutfitPreview";

function SearchPanel({
  query,
  outfitState,
  dispatchToOutfit,
  firstSearchResultRef,
  onMoveFocusUpToQuery,
}) {
  return (
    <Box color="green.800">
      <Heading1 mb="4">Searching for "{query}"</Heading1>
      <SearchResults
        query={query}
        outfitState={outfitState}
        dispatchToOutfit={dispatchToOutfit}
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
      e.preventDefault();
    }
  };

  return (
    <ScrollTracker threshold={300} onScrolledToBottom={onScrolledToBottom}>
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
                if (e.key === "ArrowUp") {
                  goToPrevItem(e);
                } else if (e.key === "ArrowDown") {
                  goToNextItem(e);
                } else if (e.key === "Escape") {
                  onMoveFocusUpToQuery(e);
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
      if (getComputedStyle(el).overflow === "auto") {
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

  return <div ref={containerRef}>{children}</div>;
}

export default SearchPanel;
