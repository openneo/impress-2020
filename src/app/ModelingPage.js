import React from "react";
import { Box } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1 } from "./util";

function ModelingPage() {
  return (
    <Box>
      <Heading1 marginBottom="2">Modeling Hub</Heading1>
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

  const items = [...data.itemsThatNeedModels].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <Box as="ul">
      {items.map((item) => (
        <ItemModelCard item={item} />
      ))}
    </Box>
  );
}

function ItemModelCard({ item }) {
  return (
    <Box as="li" listStyleType="none" boxShadow="lg">
      {item.name}
    </Box>
  );
}

export default ModelingPage;
