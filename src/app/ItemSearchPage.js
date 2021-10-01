import { Box, Wrap, WrapItem } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import {
  emptySearchQuery,
  searchQueryIsEmpty,
} from "./WardrobePage/SearchToolbar";
import SquareItemCard, {
  SquareItemCardSkeleton,
} from "./components/SquareItemCard";
import { Delay, MajorErrorMessage, useDebounce } from "./util";
import PaginationToolbar from "./components/PaginationToolbar";
import { useSearchQueryInUrl } from "./components/ItemSearchPageToolbar";

function ItemSearchPage() {
  const { query: latestQuery, offset } = useSearchQueryInUrl();

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
    forceReset: () => searchQueryIsEmpty(latestQuery),
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
        itemSearch: itemSearchV2(
          query: $query
          itemKind: $itemKind
          currentUserOwnsOrWants: $currentUserOwnsOrWants
          zoneIds: $zoneIds
        ) {
          id
          numTotalItems
          items(offset: $offset, limit: 30) {
            id
            name
            thumbnailUrl
            isNc
            isPb
            currentUserOwnsThis
            currentUserWantsThis
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
      // This will give us the cached numTotalItems while we wait for the
      // next item page!
      returnPartialData: true,
    }
  );

  if (searchQueryIsEmpty(query)) {
    return null;
  }

  if (error) {
    return <MajorErrorMessage error={error} variant="network" />;
  }

  if (data?.itemSearch?.numTotalItems === 0) {
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

  const items = data?.itemSearch?.items || [];
  const numTotalItems = data?.itemSearch?.numTotalItems || null;

  return (
    <Box>
      <PaginationToolbar
        totalCount={numTotalItems}
        isLoading={loading}
        marginBottom="6"
      />
      {items.length > 0 && (
        <Wrap justify="center" spacing="4">
          {items.map((item) => (
            <WrapItem key={item.id}>
              <SquareItemCard item={item} />
            </WrapItem>
          ))}
        </Wrap>
      )}
      {loading && items.length === 0 && (
        <Delay>
          <ItemSearchPageResultsLoading />
        </Delay>
      )}
      <PaginationToolbar
        totalCount={numTotalItems}
        isLoading={loading}
        marginTop="4"
      />
    </Box>
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
