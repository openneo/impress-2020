import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import { Flex, Image, Spinner, Text, Icon, Box } from "@chakra-ui/core";

import { Delay } from "./util";

function OutfitPreview({ itemIds, speciesId, colorId }) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $itemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              id
              imageUrl(size: SIZE_600)
            }
          }
        }
      }
    `,
    { variables: { itemIds, speciesId, colorId } }
  );

  if (loading) {
    return (
      <FullScreenCenter>
        <Delay>
          <Spinner color="green.400" size="lg" />
        </Delay>
      </FullScreenCenter>
    );
  }

  if (error) {
    return (
      <FullScreenCenter>
        <Text color="gray.50" d="flex" alignItems="center">
          <Icon name="warning" />
          <Box width={2} />
          Could not load preview. Try again?
        </Text>
      </FullScreenCenter>
    );
  }

  return (
    <FullScreenCenter>
      <Image
        src="http://pets.neopets.com/cp/wgmdtdwz/1/7.png"
        maxHeight="100%"
        maxWidth="100%"
      />
    </FullScreenCenter>
  );
}

function FullScreenCenter({ children }) {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      height="100%"
      width="100%"
    >
      {children}
    </Flex>
  );
}

export default OutfitPreview;
