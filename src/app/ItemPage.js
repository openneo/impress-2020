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
  const { error, data } = useQuery(
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
    { variables: { itemId }, returnPartialData: true }
  );

  usePageTitle(data?.item?.name);

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const item = data?.item;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
      width="100%"
    >
      <Skeleton isLoaded={item?.thumbnailUrl} marginRight="4">
        <ItemThumbnail item={item} size="lg" isActive flex="0 0 auto" />
      </Skeleton>
      <Box>
        <Skeleton isLoaded={item?.name}>
          <Heading1 lineHeight="1.1">{item?.name || "Item name here"}</Heading1>
        </Skeleton>
        <ItemPageBadges item={item} />
      </Box>
    </Box>
  );
}

function ItemPageBadges({ item }) {
  const searchBadgesAreLoaded = item?.name != null && item?.isNc != null;

  return (
    <ItemBadgeList>
      <Skeleton isLoaded={item?.isNc != null}>
        {item?.isNc ? <NcBadge /> : <NpBadge />}
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        <LinkBadge href={`https://impress.openneo.net/items/${item.id}`}>
          Old DTI
        </LinkBadge>
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        <LinkBadge
          href={
            "https://items.jellyneo.net/search/?name=" +
            encodeURIComponent(item.name) +
            "&name_type=3"
          }
        >
          Jellyneo
        </LinkBadge>
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/market.phtml?type=wizard&string=" +
              encodeURIComponent(item.name)
            }
          >
            Shop Wiz
          </LinkBadge>
        )}
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/portal/supershopwiz.phtml?string=" +
              encodeURIComponent(item.name)
            }
          >
            Super Wiz
          </LinkBadge>
        )}
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/island/tradingpost.phtml?type=browse&criteria=item_exact&search_string=" +
              encodeURIComponent(item.name)
            }
          >
            Trades
          </LinkBadge>
        )}
      </Skeleton>
      <Skeleton isLoaded={searchBadgesAreLoaded}>
        {!item?.isNc && (
          <LinkBadge
            href={
              "http://www.neopets.com/genie.phtml?type=process_genie&criteria=exact&auctiongenie=" +
              encodeURIComponent(item.name)
            }
          >
            Auctions
          </LinkBadge>
        )}
      </Skeleton>
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
