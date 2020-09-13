import React from "react";
import {
  AspectRatio,
  Badge,
  Button,
  Box,
  Skeleton,
  VisuallyHidden,
  VStack,
  useColorModeValue,
  useToast,
} from "@chakra-ui/core";
import { CheckIcon, ExternalLinkIcon, StarIcon } from "@chakra-ui/icons";
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
  return <ItemPageContent itemId={itemId} />;
}

/**
 * ItemPageContent is the content of ItemPage, but we also use it as the
 * entry point for ItemPageDrawer! When embedded in ItemPageDrawer, the
 * `isEmbedded` prop is true, so we know not to e.g. set the page title.
 */
export function ItemPageContent({ itemId, isEmbedded }) {
  return (
    <VStack spacing="8">
      <ItemPageHeader itemId={itemId} isEmbedded={isEmbedded} />
      <ItemPageOwnWantButtons itemId={itemId} />
      <ItemPageOutfitPreview itemId={itemId} />
    </VStack>
  );
}

function ItemPageHeader({ itemId, isEmbedded }) {
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

  usePageTitle(data?.item?.name, { skip: isEmbedded });

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
          <Heading1
            lineHeight="1.1"
            // Nudge down the size a bit in the embed case, to better fit the
            // tighter layout!
            size={isEmbedded ? "xl" : "2xl"}
          >
            {item?.name || "Item name here"}
          </Heading1>
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
            Trade Post
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

function ItemPageOwnWantButtons({ itemId }) {
  const [currentUserOwnsThis, setCurrentUserOwnsThis] = React.useState(false);
  const [currentUserWantsThis, setCurrentUserWantsThis] = React.useState(false);

  const toast = useToast();

  const { loading, error } = useQuery(
    gql`
      query ItemPageOwnWantButtons($itemId: ID!) {
        item(id: $itemId) {
          id
          currentUserOwnsThis
          currentUserWantsThis
        }
      }
    `,
    {
      variables: { itemId },
      onCompleted: (data) => {
        setCurrentUserOwnsThis(data.item.currentUserOwnsThis);
        setCurrentUserWantsThis(data.item.currentUserWantsThis);
      },
    }
  );

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  return (
    <Box display="flex">
      <Skeleton isLoaded={!loading} marginRight="4">
        <Box as="label">
          <VisuallyHidden
            as="input"
            type="checkbox"
            isChecked={currentUserOwnsThis}
            onChange={(e) => {
              setCurrentUserOwnsThis(e.target.checked);
              toast({
                title: "Todo: This doesn't actually work yet!",
                status: "info",
                duration: 1500,
              });
            }}
          />
          <Button
            as="div"
            colorScheme={currentUserOwnsThis ? "green" : "gray"}
            size="lg"
            cursor="pointer"
            transitionDuration="0.4s"
          >
            <IconCheckbox
              icon={<CheckIcon />}
              isChecked={currentUserOwnsThis}
              marginRight="0.5em"
            />
            I own this
          </Button>
        </Box>
      </Skeleton>

      <Skeleton isLoaded={!loading}>
        <Box as="label">
          <VisuallyHidden
            as="input"
            type="checkbox"
            isChecked={currentUserWantsThis}
            onChange={(e) => {
              setCurrentUserWantsThis(e.target.checked);
              toast({
                title: "Todo: This doesn't actually work yet!",
                status: "info",
                duration: 1500,
              });
            }}
          />
          <Button
            as="div"
            colorScheme={currentUserWantsThis ? "blue" : "gray"}
            size="lg"
            cursor="pointer"
            transitionDuration="0.4s"
          >
            <IconCheckbox
              icon={<StarIcon />}
              isChecked={currentUserWantsThis}
              marginRight="0.5em"
            />
            I want this
          </Button>
        </Box>
      </Skeleton>
    </Box>
  );
}

function IconCheckbox({ icon, isChecked, ...props }) {
  return (
    <Box display="grid" gridTemplateAreas="the-same-area" {...props}>
      <Box
        gridArea="the-same-area"
        width="1em"
        height="1em"
        border="2px solid currentColor"
        borderRadius="md"
        opacity={isChecked ? "0" : "0.75"}
        transform={isChecked ? "scale(0.75)" : "none"}
        transition="all 0.4s"
      />
      <Box
        gridArea="the-same-area"
        display="flex"
        opacity={isChecked ? "1" : "0"}
        transform={isChecked ? "none" : "scale(0.1)"}
        transition="all 0.4s"
      >
        {icon}
      </Box>
    </Box>
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
