import React from "react";
import { Badge, Box, Center } from "@chakra-ui/core";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";
import { useParams } from "react-router-dom";

import HangerSpinner from "./components/HangerSpinner";
import {
  ItemBadgeList,
  ItemThumbnail,
  NcBadge,
  NpBadge,
} from "./components/ItemCard";
import { Heading1, usePageTitle } from "./util";

function ItemPage() {
  const { itemId } = useParams();

  const { loading, error, data } = useQuery(
    gql`
      query ItemPage($itemId: ID!) {
        item(id: $itemId) {
          id
          name
          isNc
          thumbnailUrl
        }
      }
    `,
    { variables: { itemId } }
  );

  usePageTitle(data?.item?.name);

  if (loading) {
    return (
      <Center>
        <HangerSpinner />
      </Center>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const { item } = data;

  return (
    <Box display="flex" alignItems="center">
      <ItemThumbnail
        item={item}
        size="lg"
        isActive
        marginRight="4"
        flex="0 0 auto"
      />
      <Box>
        <Heading1 lineHeight="1.1">{item.name}</Heading1>
        <ItemBadgeList>
          {item.isNc ? <NcBadge /> : <NpBadge />}
          <LinkBadge
            href={
              "https://items.jellyneo.net/search/?name=" +
              encodeURIComponent(item.name) +
              "&name_type=3"
            }
          >
            Jellyneo
          </LinkBadge>
          {!item.isNc && (
            <LinkBadge
              href={
                "http://www.neopets.com/market.phtml?type=wizard&string=" +
                encodeURIComponent(item.name)
              }
            >
              Shop Wiz
            </LinkBadge>
          )}
          {!item.isNc && (
            <LinkBadge
              href={
                "http://www.neopets.com/portal/supershopwiz.phtml?string=" +
                encodeURIComponent(item.name)
              }
            >
              Super Wiz
            </LinkBadge>
          )}
          {!item.isNc && (
            <LinkBadge
              href={
                "http://www.neopets.com/island/tradingpost.phtml?type=browse&criteria=item_exact&search_string=" +
                encodeURIComponent(item.name)
              }
            >
              Trades
            </LinkBadge>
          )}
          {!item.isNc && (
            <LinkBadge
              href={
                "http://www.neopets.com/genie.phtml?type=process_genie&criteria=exact&auctiongenie=" +
                encodeURIComponent(item.name)
              }
            >
              Auctions
            </LinkBadge>
          )}
        </ItemBadgeList>
      </Box>
    </Box>
  );
}

function LinkBadge({ children, href }) {
  return (
    <Badge as="a" href={href} display="flex" alignItems="center">
      {children}
      <ExternalLinkIcon marginLeft="1" />
    </Badge>
  );
}

export default ItemPage;
