import React from "react";
import { Badge, Box, SimpleGrid } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { Delay } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2 } from "./util";
import ItemCard, {
  ItemBadgeList,
  ItemCardList,
  YouOwnThisBadge,
} from "./components/ItemCard";

function ModelingPage() {
  return (
    <Box>
      <Heading1 marginBottom="2">Modeling Hub</Heading1>
      <Heading2 marginBottom="2">Item models we need</Heading2>
      <ItemModelsList />
    </Box>
  );
}

function ItemModelsList() {
  const { loading, error, data } = useQuery(gql`
    query ModelingPage {
      itemsThatNeedModels {
        id
        name
        thumbnailUrl
        speciesThatNeedModels {
          id
          name
        }
      }

      currentUser {
        itemsTheyOwn {
          id
        }
      }
    }
  `);

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        marginTop="16"
      >
        <HangerSpinner />
        <Box fontSize="xs" marginTop="1">
          <Delay ms={2500}>Checking all the items…</Delay>
        </Box>
      </Box>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const items = data.itemsThatNeedModels
    // enough MMEs are broken that I just don't want to deal right now!
    .filter((item) => !item.name.includes("MME"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const ownedItemIds = new Set(
    data.currentUser?.itemsTheyOwn?.map((item) => item.id)
  );

  return (
    <ItemCardList>
      {items.map((item) => (
        <ItemModelCard
          key={item.id}
          item={item}
          currentUserOwnsItem={ownedItemIds.has(item.id)}
        />
      ))}
    </ItemCardList>
  );
}

function ItemModelCard({ item, currentUserOwnsItem, ...props }) {
  const badges = (
    <ItemModelBadges item={item} currentUserOwnsItem={currentUserOwnsItem} />
  );

  return <ItemCard item={item} badges={badges} {...props} />;
}

function ItemModelBadges({ item, currentUserOwnsItem }) {
  return (
    <ItemBadgeList>
      {currentUserOwnsItem && <YouOwnThisBadge />}
      {item.speciesThatNeedModels.map((species) => (
        <Badge>{species.name}</Badge>
      ))}
    </ItemBadgeList>
  );
}

export default ModelingPage;
