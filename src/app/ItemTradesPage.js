import React from "react";
import { css } from "emotion";
import { Box, Tooltip, useColorModeValue, useToken } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { useHistory, useParams } from "react-router-dom";

import { Heading2, usePageTitle } from "./util";
import ItemPageLayout from "./ItemPageLayout";

export function ItemTradesOfferingPage() {
  return (
    <ItemTradesPage
      title="Trades: Offering"
      userHeading="Owner"
      compareListHeading="They're seeking"
    />
  );
}

export function ItemTradesSeekingPage() {
  return (
    <ItemTradesPage
      title="Trades: Seeking"
      userHeading="Seeker"
      compareListHeading="They're offering"
    />
  );
}

function ItemTradesPage({ title, userHeading, compareListHeading }) {
  const { itemId } = useParams();

  const { loading, error, data } = useQuery(
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

  usePageTitle(`${data?.item?.name} | ${title}`, { skip: loading });

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
      />
    </ItemPageLayout>
  );
}

function ItemTradesTable({ itemId, userHeading, compareListHeading }) {
  return (
    <Box
      as="table"
      width="100%"
      boxShadow="md"
      className={css`
        /* Chakra doesn't have props for these! */
        border-collapse: separate;
        border-spacing: 0;
      `}
    >
      <Box as="thead">
        <Box as="tr">
          <ItemTradesTableCell as="th">{userHeading}</ItemTradesTableCell>
          <ItemTradesTableCell as="th">List</ItemTradesTableCell>
          <ItemTradesTableCell as="th">
            {/* A small wording tweak to fit better on the xsmall screens! */}
            <Box display={{ base: "none", sm: "block" }}>Last updated</Box>
            <Box display={{ base: "block", sm: "none" }}>Updated</Box>
          </ItemTradesTableCell>
          <ItemTradesTableCell as="th">Compare</ItemTradesTableCell>
        </Box>
      </Box>
      <Box as="tbody">
        <ItemTradesTableRow compareListHeading={compareListHeading} />
        <ItemTradesTableRow compareListHeading={compareListHeading} />
        <ItemTradesTableRow compareListHeading={compareListHeading} />
        <ItemTradesTableRow compareListHeading={compareListHeading} />
        <ItemTradesTableRow compareListHeading={compareListHeading} />
      </Box>
    </Box>
  );
}

function ItemTradesTableRow({ compareListHeading }) {
  const href = "/user/6/items#list-1";

  const history = useHistory();
  const onClick = React.useCallback(() => history.push(href), [history, href]);
  const focusBackground = useColorModeValue("gray.100", "gray.600");

  return (
    <Box
      as="tr"
      cursor={"pointer"}
      _hover={{ background: focusBackground }}
      _focusWithin={{ background: focusBackground }}
      onClick={onClick}
    >
      <ItemTradesTableCell>Matchu</ItemTradesTableCell>
      <ItemTradesTableCell>
        <Box
          as="a"
          href="/user/6/items#list-1"
          className={css`
            &:hover,
            &:focus,
            tr:hover &,
            tr:focus-within & {
              text-decoration: underline;
            }
          `}
        >
          Top priorities and such so yeah
        </Box>
      </ItemTradesTableCell>
      <ItemTradesTableCell>
        <Box display={{ base: "block", sm: "none" }}>&lt;1 week</Box>
        <Box display={{ base: "none", sm: "block" }}>This week</Box>
      </ItemTradesTableCell>
      <ItemTradesTableCell height="100%">
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
      fontSize={{ base: "xs", sm: "sm" }}
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
