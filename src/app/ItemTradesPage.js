import React from "react";
import { css } from "emotion";
import { Box, Skeleton, useColorModeValue, useToken } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link, useHistory, useParams } from "react-router-dom";

import { Heading2, usePageTitle } from "./util";
import ItemPageLayout from "./ItemPageLayout";
import useCurrentUser from "./components/useCurrentUser";

export function ItemTradesOfferingPage() {
  return (
    <ItemTradesPage
      title="Trades: Offering"
      userHeading="Owner"
      compareListHeading="They're seeking"
      tradesQuery={gql`
        query ItemTradesTableOffering($itemId: ID!) {
          item(id: $itemId) {
            id
            trades: tradesOffering {
              id
              user {
                id
                username
                lastTradeActivity
                matchingItems: itemsTheyWantThatCurrentUserOwns {
                  id
                  name
                }
              }
              closetList {
                id
                name
              }
            }
          }
        }
      `}
    />
  );
}

export function ItemTradesSeekingPage() {
  return (
    <ItemTradesPage
      title="Trades: Seeking"
      userHeading="Seeker"
      compareListHeading="They're offering"
      tradesQuery={gql`
        query ItemTradesTableSeeking($itemId: ID!) {
          item(id: $itemId) {
            id
            trades: tradesSeeking {
              id
              user {
                id
                username
                lastTradeActivity
                matchingItems: itemsTheyOwnThatCurrentUserWants {
                  id
                  name
                }
              }
              closetList {
                id
                name
              }
            }
          }
        }
      `}
    />
  );
}

function ItemTradesPage({
  title,
  userHeading,
  compareListHeading,
  tradesQuery,
}) {
  const { itemId } = useParams();

  const { error, data } = useQuery(
    gql`
      query ItemTradesPage($itemId: ID!) {
        item(id: $itemId) {
          id
          name
          isNc
          isPb
          thumbnailUrl
          description
          createdAt
        }
      }
    `,
    { variables: { itemId }, returnPartialData: true }
  );

  usePageTitle(`${data?.item?.name} | ${title}`, { skip: !data?.item?.name });

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <ItemPageLayout item={data?.item}>
      <Heading2 marginTop="6" marginBottom="4">
        {title}
      </Heading2>
      <ItemTradesTable
        itemId={itemId}
        userHeading={userHeading}
        compareListHeading={compareListHeading}
        tradesQuery={tradesQuery}
      />
    </ItemPageLayout>
  );
}

function ItemTradesTable({
  itemId,
  userHeading,
  compareListHeading,
  tradesQuery,
}) {
  const { isLoggedIn } = useCurrentUser();
  const { loading, error, data } = useQuery(tradesQuery, {
    variables: { itemId },
  });

  const shouldShowCompareColumn = isLoggedIn;

  // We partially randomize trade sorting, but we want it to stay stable across
  // re-renders. To do this, we can use `getTradeSortKey`, which will either
  // build a new sort key for the trade, or return the cached one from the
  // `tradeSortKeys` map.
  const tradeSortKeys = React.useMemo(() => new Map(), []);
  const getTradeSortKey = (trade) => {
    if (!tradeSortKeys.has(trade.id)) {
      tradeSortKeys.set(
        trade.id,
        getVaguelyRandomizedTradeSortKey(
          trade.user.lastTradeActivity,
          trade.user.matchingItems.length
        )
      );
    }
    return tradeSortKeys.get(trade.id);
  };

  const trades = [...(data?.item?.trades || [])];
  trades.sort((a, b) => getTradeSortKey(b).localeCompare(getTradeSortKey(a)));

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const minorColumnWidth = {
    base: shouldShowCompareColumn ? "23%" : "30%",
    md: "20ex",
  };

  return (
    <Box
      as="table"
      width="100%"
      boxShadow="md"
      className={css`
        /* Chakra doesn't have props for these! */
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      `}
    >
      <Box as="thead" fontSize={{ base: "xs", sm: "sm" }}>
        <Box as="tr">
          <ItemTradesTableCell as="th" width={minorColumnWidth}>
            {/* A small wording tweak to fit better on the xsmall screens! */}
            <Box display={{ base: "none", sm: "block" }}>Last active</Box>
            <Box display={{ base: "block", sm: "none" }}>Last edit</Box>
          </ItemTradesTableCell>
          {shouldShowCompareColumn && (
            <ItemTradesTableCell as="th" width={minorColumnWidth}>
              <Box display={{ base: "none", sm: "block" }}>
                Potential trades
              </Box>
              <Box display={{ base: "block", sm: "none" }}>Matches</Box>
            </ItemTradesTableCell>
          )}
          <ItemTradesTableCell as="th" width={minorColumnWidth}>
            {userHeading}
          </ItemTradesTableCell>
          <ItemTradesTableCell as="th">List</ItemTradesTableCell>
        </Box>
      </Box>
      <Box as="tbody">
        {loading && (
          <>
            <ItemTradesTableRowSkeleton
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
            <ItemTradesTableRowSkeleton
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
            <ItemTradesTableRowSkeleton
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
            <ItemTradesTableRowSkeleton
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
            <ItemTradesTableRowSkeleton
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
          </>
        )}
        {!loading &&
          trades.length > 0 &&
          trades.map((trade) => (
            <ItemTradesTableRow
              key={trade.id}
              compareListHeading={compareListHeading}
              href={`/user/${trade.user.id}/items#list-${trade.closetList.id}`}
              username={trade.user.username}
              listName={trade.closetList.name}
              lastTradeActivity={trade.user.lastTradeActivity}
              matchingItems={trade.user.matchingItems}
              shouldShowCompareColumn={shouldShowCompareColumn}
            />
          ))}
        {!loading && trades.length === 0 && (
          <Box as="tr">
            <ItemTradesTableCell
              colSpan={shouldShowCompareColumn ? 4 : 3}
              textAlign="center"
              fontStyle="italic"
            >
              No trades yet!
            </ItemTradesTableCell>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ItemTradesTableRow({
  compareListHeading,
  href,
  username,
  listName,
  lastTradeActivity,
  matchingItems,
  shouldShowCompareColumn,
}) {
  const history = useHistory();
  const onClick = React.useCallback(() => history.push(href), [history, href]);
  const focusBackground = useColorModeValue("gray.100", "gray.600");

  const sortedMatchingItems = [...matchingItems].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <Box
      as="tr"
      cursor="pointer"
      _hover={{ background: focusBackground }}
      _focusWithin={{ background: focusBackground }}
      onClick={onClick}
    >
      <ItemTradesTableCell fontSize="xs">
        {formatVagueDate(lastTradeActivity)}
      </ItemTradesTableCell>
      {shouldShowCompareColumn && (
        <ItemTradesTableCell fontSize="xs">
          {matchingItems.length > 0 ? (
            <Box as="ul">
              {sortedMatchingItems.slice(0, 4).map((item) => (
                <Box key={item.id} as="li">
                  <Box
                    lineHeight="1.5"
                    maxHeight="1.5em"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {item.name}
                  </Box>
                </Box>
              ))}
              {matchingItems.length > 4 && (
                <Box as="li">+ {matchingItems.length - 4} more</Box>
              )}
            </Box>
          ) : (
            <>
              <Box display={{ base: "none", sm: "block" }}>No matches</Box>
              <Box display={{ base: "block", sm: "none" }}>None</Box>
            </>
          )}
        </ItemTradesTableCell>
      )}
      <ItemTradesTableCell fontSize="xs">{username}</ItemTradesTableCell>
      <ItemTradesTableCell fontSize="sm">
        <Box
          as={Link}
          to={href}
          className={css`
            &:hover,
            &:focus,
            tr:hover &,
            tr:focus-within & {
              text-decoration: underline;
            }
          `}
        >
          {listName}
        </Box>
      </ItemTradesTableCell>
    </Box>
  );
}

function ItemTradesTableRowSkeleton({ shouldShowCompareColumn }) {
  return (
    <Box as="tr">
      <ItemTradesTableCell>
        <Skeleton width="100%">X</Skeleton>
      </ItemTradesTableCell>
      <ItemTradesTableCell>
        <Skeleton width="100%">X</Skeleton>
      </ItemTradesTableCell>
      <ItemTradesTableCell>
        <Skeleton width="100%">X</Skeleton>
      </ItemTradesTableCell>
      {shouldShowCompareColumn && (
        <ItemTradesTableCell>
          <Skeleton width="100%">X</Skeleton>
        </ItemTradesTableCell>
      )}
    </Box>
  );
}

function ItemTradesTableCell({ children, as = "td", ...props }) {
  const borderColor = useColorModeValue("gray.300", "gray.400");
  const borderColorCss = useToken("colors", borderColor);
  const borderRadiusCss = useToken("radii", "md");

  return (
    <Box
      as={as}
      paddingX="4"
      paddingY="2"
      textAlign="left"
      className={css`
        /* Lol sigh, getting this right is way more involved than I wish it
         * were. What I really want is border-collapse and a simple 1px border,
         * but that disables border-radius. So, we homebrew it by giving all
         * cells bottom and right borders, but only the cells on the edges a
         * top or left border; and then target the exact 4 corner cells to
         * round them. Pretty old-school tbh 🙃 */

        border-bottom: 1px solid ${borderColorCss};
        border-right: 1px solid ${borderColorCss};

        thead tr:first-of-type & {
          border-top: 1px solid ${borderColorCss};
        }

        &:first-of-type {
          border-left: 1px solid ${borderColorCss};
        }

        thead tr:first-of-type &:first-of-type {
          border-top-left-radius: ${borderRadiusCss};
        }
        thead tr:first-of-type &:last-of-type {
          border-top-right-radius: ${borderRadiusCss};
        }
        tbody tr:last-of-type &:first-of-type {
          border-bottom-left-radius: ${borderRadiusCss};
        }
        tbody tr:last-of-type &:last-of-type {
          border-bottom-right-radius: ${borderRadiusCss};
        }
      `}
      {...props}
    >
      {children}
    </Box>
  );
}

function isThisWeek(date) {
  const startOfThisWeek = new Date();
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);
  return date > startOfThisWeek;
}

const shortMonthYearFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
});

function formatVagueDate(dateString) {
  const date = new Date(dateString);

  if (isThisWeek(date)) {
    return "This week";
  }

  return shortMonthYearFormatter.format(date);
}

function getVaguelyRandomizedTradeSortKey(dateString, numMatchingItems) {
  const date = new Date(dateString);
  const hasMatchingItems = numMatchingItems >= 1;

  // "This week" sorts after all other dates, but with a random factor! I don't
  // want people worrying about gaming themselves up to the very top, just be
  // active and trust the system 😅 (I figure that, if you care enough to "game"
  // the system by faking activity every week, you probably also care enough to
  // be... making real trades every week lmao)
  //
  // We also prioritize having matches, but we don't bother to sort _how many_
  // matches, to decrease the power of gaming with large honeypot lists, and
  // because it's hard to judge how good matches are anyway.
  if (isThisWeek(date)) {
    const matchingItemsKey = hasMatchingItems
      ? "ZZmatchingZZ"
      : "AAnotmatchingAA";
    return `ZZZthisweekZZZ-${matchingItemsKey}-${Math.random()}`;
  }

  return dateString;
}
