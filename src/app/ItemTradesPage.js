import React from "react";
import { ClassNames } from "@emotion/react";
import {
  Box,
  Button,
  Flex,
  Skeleton,
  useColorModeValue,
  useToken,
} from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/router";

import { Heading2 } from "./util";
import ItemPageLayout from "./ItemPageLayout";
import useCurrentUser from "./components/useCurrentUser";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import Head from "next/head";

export function ItemTradesOfferingPage() {
  return (
    <ItemTradesPage
      title="Trades: Offering"
      userHeading="Owner"
      compareColumnLabel="Trade for your…"
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
      compareColumnLabel="Trade for their…"
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
  compareColumnLabel,
  tradesQuery,
}) {
  const { query } = useRouter();
  const { itemId } = query;

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
          ncTradeValueText
        }
      }
    `,
    { variables: { itemId }, returnPartialData: true }
  );

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <>
      <Head>
        {data?.item?.name && (
          <title>
            {data?.item?.name} | {title} | Dress to Impress
          </title>
        )}
      </Head>
      <ItemPageLayout item={data?.item}>
        <Heading2 marginTop="6" marginBottom="4">
          {title}
        </Heading2>
        <ItemTradesTable
          itemId={itemId}
          userHeading={userHeading}
          compareColumnLabel={compareColumnLabel}
          tradesQuery={tradesQuery}
        />
      </ItemPageLayout>
    </>
  );
}

function ItemTradesTable({
  itemId,
  userHeading,
  compareColumnLabel,
  tradesQuery,
}) {
  const { isLoggedIn } = useCurrentUser();
  const { loading, error, data } = useQuery(tradesQuery, {
    variables: { itemId },
    context: { sendAuth: true },
  });

  const [isShowingInactiveTrades, setIsShowingInactiveTrades] = React.useState(
    false
  );

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

  const allTrades = [...(data?.item?.trades || [])];

  // Only trades from users active within the last 6 months are shown by
  // default. The user can toggle to the full view, though!
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const activeTrades = allTrades.filter(
    (t) => new Date(t.user.lastTradeActivity) > sixMonthsAgo
  );

  const trades = isShowingInactiveTrades ? allTrades : activeTrades;
  trades.sort((a, b) => getTradeSortKey(b).localeCompare(getTradeSortKey(a)));

  const numInactiveTrades = allTrades.length - activeTrades.length;

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const minorColumnWidth = {
    base: shouldShowCompareColumn ? "23%" : "30%",
    md: "20ex",
  };

  return (
    <ClassNames>
      {({ css }) => (
        <Box>
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
                      {compareColumnLabel}
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
                    href={`/user/${trade.user.id}/lists#list-${trade.closetList.id}`}
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
          {numInactiveTrades > 0 && (
            <Flex justify="center">
              <Button
                size="sm"
                variant="outline"
                marginTop="4"
                onClick={() => setIsShowingInactiveTrades((s) => !s)}
              >
                {isShowingInactiveTrades ? (
                  <>
                    <ChevronUpIcon marginRight="2" />
                    Hide {numInactiveTrades} older trades
                    <ChevronUpIcon marginLeft="2" />
                  </>
                ) : (
                  <>
                    <ChevronDownIcon marginRight="2" />
                    Show {numInactiveTrades} more older trades
                    <ChevronDownIcon marginLeft="2" />
                  </>
                )}
              </Button>
            </Flex>
          )}
        </Box>
      )}
    </ClassNames>
  );
}

function ItemTradesTableRow({
  href,
  username,
  listName,
  lastTradeActivity,
  matchingItems,
  shouldShowCompareColumn,
}) {
  const { push: pushHistory } = useRouter();
  const onClick = React.useCallback(() => pushHistory(href), [
    pushHistory,
    href,
  ]);
  const focusBackground = useColorModeValue("gray.100", "gray.600");

  const sortedMatchingItems = [...matchingItems].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <ClassNames>
      {({ css }) => (
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
            <Link href={href} passHref>
              <Box
                as="a"
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
            </Link>
          </ItemTradesTableCell>
        </Box>
      )}
    </ClassNames>
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
    <ClassNames>
      {({ css }) => (
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
      )}
    </ClassNames>
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
