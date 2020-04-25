import React from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Image,
  PseudoBox,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/core";

import { Delay } from "./util";

import "./OutfitPreview.css";

export const itemAppearanceFragment = gql`
  fragment AppearanceForOutfitPreview on Appearance {
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
`;

function OutfitPreview({ outfitState }) {
  const { wornItemIds, speciesId, colorId } = outfitState;
  const toast = useToast();

  const { loading, error, data } = useQuery(
    gql`
      query($wornItemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        petAppearance(speciesId: $speciesId, colorId: $colorId) {
          ...AppearanceForOutfitPreview
        }

        items(ids: $wornItemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            ...AppearanceForOutfitPreview
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: { wornItemIds, speciesId, colorId },
    }
  );

  const visibleLayers = getVisibleLayers(data);
  const [downloadImageUrl, prepareDownload] = useDownloadableImage(
    visibleLayers
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
    <PseudoBox role="group" pos="relative" height="100%" width="100%">
      <TransitionGroup>
        {visibleLayers.map((layer) => (
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
                // This sets up the cache to not need to reload images during
                // download!
                crossOrigin="Anonymous"
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
      <Box
        // Bottom-right in small screens, top-right on large screens
        pos="absolute"
        right="2"
        bottom={{ base: "2", lg: "auto" }}
        top={{ base: "auto", lg: "2" }}
      >
        <Tooltip label="Download" placement="left">
          <IconButton
            icon="download"
            aria-label="Download"
            isRound
            as="a"
            // eslint-disable-next-line no-script-url
            href={downloadImageUrl || "javascript:void 0"}
            download={(outfitState.name || "Outfit") + ".png"}
            onMouseEnter={prepareDownload}
            onFocus={prepareDownload}
            onClick={() => {
              if (!downloadImageUrl) {
                toast({
                  title:
                    "Just a second, try again when the image is done loading!",
                });
              }
            }}
            variant="unstyled"
            backgroundColor="gray.600"
            color="gray.50"
            d="flex"
            alignItems="center"
            justifyContent="center"
            opacity="0"
            transition="all 0.2s"
            _groupHover={{
              opacity: 1,
            }}
            _focus={{
              opacity: 1,
              backgroundColor: "gray.500",
            }}
            _hover={{
              backgroundColor: "gray.500",
            }}
            outline="initial"
          />
        </Tooltip>
      </Box>
    </PseudoBox>
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

function useDownloadableImage(visibleLayers) {
  const [downloadImageUrl, setDownloadImageUrl] = React.useState(null);
  const [preparedForLayerIds, setPreparedForLayerIds] = React.useState([]);

  const prepareDownload = React.useCallback(async () => {
    // Skip if the current image URL is already correct for these layers.
    const layerIds = visibleLayers.map((l) => l.id);
    if (layerIds.join(",") === preparedForLayerIds.join(",")) {
      return;
    }

    const imagePromises = visibleLayers.map(
      (layer) =>
        new Promise((resolve, reject) => {
          const image = new window.Image();
          image.crossOrigin = "Anonymous"; // Requires S3 CORS config!
          image.addEventListener("load", () => resolve(image), false);
          image.addEventListener("error", (e) => reject(e), false);
          image.src = layer.imageUrl;
        })
    );

    const images = await Promise.all(imagePromises);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 600;

    for (const image of images) {
      context.drawImage(image, 0, 0);
    }

    console.log(
      "Generated image for download",
      layerIds,
      canvas.toDataURL("image/png")
    );
    setDownloadImageUrl(canvas.toDataURL("image/png"));
    setPreparedForLayerIds(layerIds);
  }, [preparedForLayerIds, visibleLayers]);

  return [downloadImageUrl, prepareDownload];
}

export default OutfitPreview;
