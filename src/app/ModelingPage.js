import React from "react";
import { Badge, Box, SimpleGrid, useColorModeValue } from "@chakra-ui/core";
import { StarIcon } from "@chakra-ui/icons";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import { Delay } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2 } from "./util";
import ItemSummary, { ItemSummaryBadgeList } from "./components/ItemSummary";

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
    <SimpleGrid columns={{ sm: 1, lg: 2 }} spacing="6">
      {items.map((item) => (
        <ItemModelCard
          key={item.id}
          item={item}
          currentUserOwnsItem={ownedItemIds.has(item.id)}
        />
      ))}
    </SimpleGrid>
  );
}

function ItemModelCard({ item, currentUserOwnsItem, ...props }) {
  const borderColor = useColorModeValue("transparent", "green.500");

  return (
    <Box
      as="a"
      href={`https://impress.openneo.net/items/${item.id}`}
      p="2"
      boxShadow="lg"
      borderRadius="lg"
      width="400px"
      border="1px"
      borderColor={borderColor}
      className="item-model-card"
      {...props}
    >
      <ItemSummary
        item={item}
        badges={
          <ItemModelBadges
            item={item}
            currentUserOwnsItem={currentUserOwnsItem}
          />
        }
        focusSelector=".item-model-card:hover &, .item-model-card:focus &"
      />
    </Box>
  );
}

function ItemModelBadges({ item, currentUserOwnsItem }) {
  return (
    <ItemSummaryBadgeList>
      {currentUserOwnsItem && (
        <Badge colorScheme="yellow" display="flex" alignItems="center">
          <StarIcon aria-label="Star" marginRight="1" />
          You own this!
        </Badge>
      )}
      {item.speciesThatNeedModels.map((species) => (
        <Badge>{species.name}</Badge>
      ))}
    </ItemSummaryBadgeList>
  );
}

export default ModelingPage;
