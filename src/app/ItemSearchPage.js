import React from "react";
import { Box, Button, Flex, Wrap, WrapItem } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";

import SearchToolbar, {
  emptySearchQuery,
  searchQueryIsEmpty,
} from "./WardrobePage/SearchToolbar";
import SquareItemCard, {
  SquareItemCardSkeleton,
} from "./components/SquareItemCard";
import { Delay, ErrorMessage, useCommonStyles, useDebounce } from "./util";

function ItemSearchPage() {
  const [query, offset, setQuery] = useSearchQueryInUrl();
  const { brightBackground } = useCommonStyles();

  return (
    <Box>
      <SearchToolbar
        query={query}
        onChange={setQuery}
        showItemsLabel
        background={brightBackground}
        boxShadow="md"
        autoFocus
      />
      <Box height="6" />
      <ItemSearchPageResults query={query} offset={offset} />
    </Box>
  );
}

/**
 * useSearchQueryInUrl provides an API like useState, but stores the search
 * query in the URL! It also parses out the offset for us.
 */
function useSearchQueryInUrl() {
  const history = useHistory();

  const { query: value } = useParams();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  const query = {
    value: value || "",
    filterToZoneLabel: searchParams.get("zone") || null,
    filterToItemKind: searchParams.get("kind") || null,
    filterToCurrentUserOwnsOrWants: searchParams.get("user") || null,
  };

  const offset = parseInt(searchParams.get("offset")) || 0;

  const setQuery = React.useCallback(
    (newQuery) => {
      let url = `/items/search`;

      if (newQuery.value) {
        url += "/" + encodeURIComponent(newQuery.value);
      }

      const newParams = new URLSearchParams();
      if (newQuery.filterToItemKind) {
        newParams.append("kind", newQuery.filterToItemKind);
      }
      if (newQuery.filterToZoneLabel) {
        newParams.append("zone", newQuery.filterToZoneLabel);
      }
      if (newQuery.filterToCurrentUserOwnsOrWants) {
        newParams.append("user", newQuery.filterToCurrentUserOwnsOrWants);
      }

      // NOTE: We omit `offset`, because changing the query should reset us
      //       back to the first page!

      const search = newParams.toString();
      if (search) {
        url += "?" + search;
      }

      history.replace(url);
    },
    [history]
  );

  // NOTE: We don't provide a `setOffset`, because that's handled via
  //       pagination links.

  return [query, offset, setQuery];
}

function ItemSearchPageResults({ query: latestQuery, offset }) {
  // NOTE: Some of this is copied from SearchPanel... but all of this is messy
  //       enough that I'm not comfy code-sharing yet, esp since I feel like
  //       SearchPanel pagination is a bit of a mess and will need refactoring.

  // We debounce the search query, so that we don't resend a new query whenever
  // the user types anything.
  const query = useDebounce(latestQuery, 300, {
    waitForFirstPause: true,
    initialValue: emptySearchQuery,

    // When the query is empty, clear the debounced query immediately too! That
    // will give us fast feedback when the search field clears.
    forceReset: searchQueryIsEmpty(latestQuery),
  });

  // NOTE: This query should always load ~instantly, from the client cache.
  const { data: zoneData } = useQuery(gql`
    query SearchPanelZones {
      allZones {
        id
        label
      }
    }
  `);
  const allZones = zoneData?.allZones || [];
  const filterToZones = query.filterToZoneLabel
    ? allZones.filter((z) => z.label === query.filterToZoneLabel)
    : [];
  const filterToZoneIds = filterToZones.map((z) => z.id);

  const { loading, error, data } = useQuery(
    gql`
      query ItemSearchPageResults(
        $query: String!
        $itemKind: ItemKindSearchFilter
        $currentUserOwnsOrWants: OwnsOrWants
        $zoneIds: [ID!]!
        $offset: Int!
      ) {
        itemSearch(
          query: $query
          itemKind: $itemKind
          currentUserOwnsOrWants: $currentUserOwnsOrWants
          zoneIds: $zoneIds
          offset: $offset
          limit: 30
        ) {
          numTotalItems
          items {
            id
            name
            thumbnailUrl
          }
        }
      }
    `,
    {
      variables: {
        query: query.value,
        itemKind: query.filterToItemKind,
        currentUserOwnsOrWants: query.filterToCurrentUserOwnsOrWants,
        zoneIds: filterToZoneIds,
        offset,
      },
      context: { sendAuth: true },
      skip: searchQueryIsEmpty(query),
    }
  );

  if (searchQueryIsEmpty(query)) {
    return null;
  }

  if (loading) {
    return (
      <Box>
        <ItemSearchPagePagination isLoading marginBottom="6" />
        <Delay>
          <ItemSearchPageResultsLoading />
        </Delay>
        <ItemSearchPagePagination isLoading marginTop="4" />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorMessage>
        Oops, we couldn't load the search results. Check your connection and try
        again!
      </ErrorMessage>
    );
  }

  if (data.itemSearch.items.length === 0) {
    return (
      <Box>
        We couldn't find any matching items{" "}
        <span role="img" aria-label="(thinking emoji)">
          🤔
        </span>{" "}
        Try again?
      </Box>
    );
  }

  return (
    <Box>
      <ItemSearchPagePagination
        numTotalItems={data.itemSearch.numTotalItems}
        marginBottom="6"
      />
      <Wrap justify="center" spacing="4">
        {data.itemSearch.items.map((item) => (
          <WrapItem key={item.id}>
            <SquareItemCard item={item} />
          </WrapItem>
        ))}
      </Wrap>
      <ItemSearchPagePagination
        numTotalItems={data.itemSearch.numTotalItems}
        marginTop="4"
      />
    </Box>
  );
}

function ItemSearchPagePagination({ isLoading, numTotalItems, ...props }) {
  const { search } = useLocation();

  const currentOffset =
    parseInt(new URLSearchParams(search).get("offset")) || 0;

  const prevPageSearchParams = new URLSearchParams(search);
  const prevPageOffset = currentOffset - 30;
  prevPageSearchParams.set("offset", prevPageOffset);
  const prevPageUrl = "?" + prevPageSearchParams.toString();
  const prevPageIsDisabled = isLoading || prevPageOffset < 0;

  const nextPageSearchParams = new URLSearchParams(search);
  const nextPageOffset = currentOffset + 30;
  nextPageSearchParams.set("offset", nextPageOffset);
  const nextPageUrl = "?" + nextPageSearchParams.toString();
  const nextPageIsDisabled = isLoading || nextPageOffset >= numTotalItems;

  return (
    <Flex justify="space-between" {...props}>
      <Button
        as={prevPageIsDisabled ? "button" : Link}
        to={prevPageIsDisabled ? undefined : prevPageUrl}
        _disabled={{ cursor: isLoading ? "wait" : "not-allowed", opacity: 0.4 }}
        isDisabled={prevPageIsDisabled}
      >
        ← Prev
      </Button>
      <Button
        as={nextPageIsDisabled ? "button" : Link}
        to={nextPageIsDisabled ? undefined : nextPageUrl}
        _disabled={{ cursor: isLoading ? "wait" : "not-allowed", opacity: 0.4 }}
        isDisabled={nextPageIsDisabled}
      >
        Next →
      </Button>
    </Flex>
  );
}

function ItemSearchPageResultsLoading() {
  return (
    <Wrap justify="center" spacing="4">
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton minHeightNumLines={3} />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
      <WrapItem>
        <SquareItemCardSkeleton />
      </WrapItem>
    </Wrap>
  );
}

export default ItemSearchPage;
