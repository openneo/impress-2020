import React from "react";
import { Badge, Box, SimpleGrid } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

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
    }
  `);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <HangerSpinner />
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

  return (
    <SimpleGrid columns={{ sm: 1, lg: 2 }} spacing="6">
      {items.map((item) => (
        <ItemModelCard key={item.id} item={item} />
      ))}
    </SimpleGrid>
  );
}

function ItemModelCard({ item, ...props }) {
  return (
    <Box
      as="a"
      href={`https://impress.openneo.net/items/${item.id}`}
      p="2"
      boxShadow="lg"
      borderRadius="lg"
      width="400px"
      {...props}
    >
      <ItemSummary item={item} badges={<ItemModelBadges item={item} />} />
    </Box>
  );
}

function ItemModelBadges({ item }) {
  return (
    <ItemSummaryBadgeList>
      {item.speciesThatNeedModels.map((species) => (
        <Badge>{species.name}</Badge>
      ))}
    </ItemSummaryBadgeList>
  );
}

export default ModelingPage;
