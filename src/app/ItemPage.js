import React from "react";
import {
  AspectRatio,
  Badge,
  Box,
  Skeleton,
  VStack,
  useColorModeValue,
} from "@chakra-ui/core";
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
import OutfitPreview from "./components/OutfitPreview";

function ItemPage() {
  const { itemId } = useParams();

  return (
    <VStack spacing="6">
      <ItemPageHeader itemId={itemId} />
      <ItemPageOutfitPreview itemId={itemId} />
    </VStack>
  );
}

function ItemPageHeader({ itemId }) {
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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="flex-start"
        width="100%"
      >
        <Skeleton height="80px" width="80px" marginRight="4" flex="0 0 auto" />
        <Box display="flex" flexDirection="column" alignItems="flex-start">
          <Skeleton>
            <Heading1 lineHeight="1.1" maxHeight="1.1em">
              Item name goes here
            </Heading1>
          </Skeleton>
          <ItemBadgeList>
            <Skeleton>
              <NpBadge />
            </Skeleton>
            <Skeleton>
              <LinkBadge href="/">Jellyneo</LinkBadge>
            </Skeleton>
            <Skeleton>
              <LinkBadge href="/">Shop Wiz</LinkBadge>
            </Skeleton>
            <Skeleton>
              <LinkBadge href="/">Super Wiz</LinkBadge>
            </Skeleton>
            <Skeleton>
              <LinkBadge href="/">Trades</LinkBadge>
            </Skeleton>
            <Skeleton>
              <LinkBadge href="/">Auctions</LinkBadge>
            </Skeleton>
          </ItemBadgeList>
        </Box>
      </Box>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const { item } = data;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
      width="100%"
    >
      <ItemThumbnail
        item={item}
        size="lg"
        isActive
        marginRight="4"
        flex="0 0 auto"
      />
      <Box>
        <Heading1 lineHeight="1.1">{item.name}</Heading1>
        <ItemPageBadges item={item} />
      </Box>
    </Box>
  );
}

function ItemPageBadges({ item }) {
  return (
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

function ItemPageOutfitPreview({ itemId }) {
  const borderColor = useColorModeValue("green.700", "green.400");

  return (
    <AspectRatio
      width="100%"
      maxWidth="300px"
      ratio="1"
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="lg"
      overflow="hidden"
    >
      <Box>
        <OutfitPreview
          speciesId="1"
          colorId="8"
          pose="HAPPY_FEM"
          wornItemIds={[itemId]}
        />
      </Box>
    </AspectRatio>
  );
}

export default ItemPage;
