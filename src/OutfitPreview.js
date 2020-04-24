import React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import { Flex, Image, Spinner, Text, Icon, Box } from "@chakra-ui/core";

import { Delay } from "./util";

import "./OutfitPreview.css";

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
    {
      variables: { itemIds, speciesId, colorId },
    }
  );

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
    <Box pos="relative" height="100%" width="100%">
      <TransitionGroup>
        {getVisibleLayers(data).map((layer) => (
          <CSSTransition
            key={layer.id}
            classNames={{
              exit: "outfit-preview-layer-exit",
              exitActive: "outfit-preview-layer-exit-active",
            }}
            timeout={200}
          >
            <FullScreenCenter>
              <Image
                src={layer.imageUrl}
                objectFit="contain"
                maxWidth="100%"
                maxHeight="100%"
                className="outfit-preview-layer-image"
              />
            </FullScreenCenter>
          </CSSTransition>
        ))}
      </TransitionGroup>
      {loading && (
        <Delay>
          <FullScreenCenter>
            <Box
              width="100%"
              height="100%"
              backgroundColor="gray.900"
              opacity="0.8"
            />
          </FullScreenCenter>
          <FullScreenCenter>
            <Spinner color="green.400" size="xl" />
          </FullScreenCenter>
        </Delay>
      )}
    </Box>
  );
}

function getVisibleLayers(data) {
  if (!data) {
    return [];
  }

  const allAppearances = [
    data.petAppearance,
    ...(data.items || []).map((i) => i.appearanceOn),
  ].filter((a) => a);
  let allLayers = allAppearances.map((a) => a.layers).flat();

  // Clean up our data a bit, by ensuring only one layer per zone. This
  // shouldn't happen in theory, but sometimes our database doesn't clean up
  // after itself correctly :(
  allLayers = allLayers.filter((l, i) => {
    return allLayers.findIndex((l2) => l2.zone.id === l.zone.id) === i;
  });

  const allRestrictedZoneIds = allAppearances
    .map((l) => l.restrictedZones)
    .flat()
    .map((z) => z.id);

  const visibleLayers = allLayers.filter(
    (l) => !allRestrictedZoneIds.includes(l.zone.id)
  );
  visibleLayers.sort((a, b) => a.zone.depth - b.zone.depth);

  return visibleLayers;
}

function FullScreenCenter({ children }) {
  return (
    <Flex
      pos="absolute"
      top="0"
      right="0"
      bottom="0"
      left="0"
      alignItems="center"
      justifyContent="center"
    >
      {children}
    </Flex>
  );
}

export default OutfitPreview;
