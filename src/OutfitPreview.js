import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import { Flex, Image, Spinner, Text, Icon, Box } from "@chakra-ui/core";

import { Delay } from "./util";

function OutfitPreview({ itemIds, speciesId, colorId }) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        petAppearance(speciesId: $speciesId, colorId: $colorId) {
          layers {
            id
            imageUrl(size: SIZE_600)
            zone {
              id
              depth
            }
          }

          restrictedZones {
            id
          }
        }

        items(ids: $itemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              id
              imageUrl(size: SIZE_600)
              zone {
                id
                depth
              }
            }

            restrictedZones {
              id
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

  const allAppearances = [
    data.petAppearance,
    ...data.items.map((i) => i.appearanceOn),
  ];
  const allLayers = allAppearances.map((a) => a.layers).flat();

  const allRestrictedZoneIds = allAppearances
    .map((l) => l.restrictedZones)
    .flat()
    .map((z) => z.id);

  const visibleLayers = allLayers.filter(
    (l) => !allRestrictedZoneIds.includes(l.zone.id)
  );
  visibleLayers.sort((a, b) => a.zone.depth - b.zone.depth);

  return (
    <Box pos="relative" height="100%" width="100%">
      {visibleLayers.map((layer) => (
        <Box
          key={layer.id}
          pos="absolute"
          top="0"
          right="0"
          bottom="0"
          left="0"
        >
          <FullScreenCenter>
            <Image src={layer.imageUrl} maxWidth="100%" maxHeight="100%" />
          </FullScreenCenter>
        </Box>
      ))}
    </Box>
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
