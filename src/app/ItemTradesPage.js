import React from "react";
import { css } from "emotion";
import {
  Box,
  Skeleton,
  Tooltip,
  useColorModeValue,
  useToken,
} from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { Link, useHistory, useParams } from "react-router-dom";

import { Heading2, usePageTitle } from "./util";
import ItemPageLayout from "./ItemPageLayout";

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
  const { loading, error, data } = useQuery(tradesQuery, {
    variables: { itemId },
  });

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  // HACK: I'm pretty much hiding this for now, because it's not ready. But
  ///      it's visible at #show-compare-column!
  const shouldShowCompareColumn = window.location.href.includes(
    "show-compare-column"
  );

  const minorColumnWidth = {
    base: shouldShowCompareColumn ? "23%" : "30%",
    md: "18ex",
  };

  const trades = [...(data?.item?.trades || [])].sort(
    (a, b) =>
      new Date(b.user.lastTradeActivity) - new Date(a.user.lastTradeActivity)
  );

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
          <ItemTradesTableCell as="th" width={minorColumnWidth}>
            {userHeading}
          </ItemTradesTableCell>
          {shouldShowCompareColumn && (
            <ItemTradesTableCell as="th" width={minorColumnWidth}>
              Compare
            </ItemTradesTableCell>
          )}
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
  shouldShowCompareColumn,
}) {
  const history = useHistory();
  const onClick = React.useCallback(() => history.push(href), [history, href]);
  const focusBackground = useColorModeValue("gray.100", "gray.600");

  return (
    <Box
      as="tr"
      cursor="pointer"
      _hover={{ background: focusBackground }}
      _focusWithin={{ background: focusBackground }}
      onClick={onClick}
    >
      <ItemTradesTableCell fontSize="xs">
        {new Intl.DateTimeFormat("en", {
          month: "short",
          year: "numeric",
        }).format(new Date(lastTradeActivity))}
      </ItemTradesTableCell>
      <ItemTradesTableCell overflowWrap="break-word" fontSize="xs">
        {username}
      </ItemTradesTableCell>
      {shouldShowCompareColumn && (
        <ItemTradesTableCell fontSize="xs">
          <Tooltip
            placement="bottom"
            label={
              <Box>
                {compareListHeading}:
                <Box as="ul" listStyle="disc">
                  <Box as="li" marginLeft="1em">
                    Adorable Freckles
                  </Box>
                  <Box as="li" marginLeft="1em">
                    Constellation Dress
                  </Box>
                </Box>
                <Box>(WIP: This is placeholder data!)</Box>
              </Box>
            }
          >
            <Box
              tabIndex="0"
              width="100%"
              className={css`
                &:hover,
                &:focus,
                tr:hover &,
                tr:focus-within & {
                  text-decoration: underline dashed;
                }
              `}
            >
              <Box display={{ base: "block", md: "none" }}>2 match</Box>
              <Box display={{ base: "none", md: "block" }}>2 matches</Box>
            </Box>
          </Tooltip>
        </ItemTradesTableCell>
      )}
      <ItemTradesTableCell overflowWrap="break-word" fontSize="sm">
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
