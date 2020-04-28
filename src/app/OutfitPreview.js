import React from "react";
import { css } from "emotion";
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
  Stack,
  Text,
  Tooltip,
  useClipboard,
} from "@chakra-ui/core";

import { Delay } from "./util";
import OutfitResetModal from "./OutfitResetModal";
import SpeciesColorPicker from "./SpeciesColorPicker";

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

function OutfitPreview({ outfitState, dispatchToOutfit }) {
  const { wornItemIds, speciesId, colorId } = outfitState;
  const [hasFocus, setHasFocus] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);

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

  const { onCopy, hasCopied } = useClipboard(getShareUrl(outfitState));

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
            classNames={css`
              &-exit {
                opacity: 1;
              }

              &-exit-active {
                opacity: 0;
                transition: opacity 0.2s;
              }
            `}
            timeout={200}
          >
            <FullScreenCenter>
              <Image
                src={layer.imageUrl}
                objectFit="contain"
                maxWidth="100%"
                maxHeight="100%"
                className={css`
                  opacity: 0.01;

                  &[src] {
                    opacity: 1;
                    transition: opacity 0.2s;
                  }
                `}
                // This sets up the cache to not need to reload images during
                // download!
                // TODO: Re-enable this once we get our change into Chakra
                // main. For now, this will make Downloads a bit slower, which
                // is fine!
                // crossOrigin="Anonymous"
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
        pos="absolute"
        left="0"
        right="0"
        top="0"
        bottom="0"
        padding={{ base: 2, lg: 6 }}
        display="grid"
        overflow="auto"
        gridTemplateAreas={`"back sharing"
                            "space space"
                            "picker picker"`}
        gridTemplateRows="auto minmax(1rem, 1fr) auto"
      >
        <Box gridArea="back">
          <IconButton
            icon="arrow-back"
            aria-label="Leave this outfit"
            variant="unstyled"
            backgroundColor="gray.600"
            isRound={true}
            d="flex"
            alignItems="center"
            justifyContent="center"
            color="gray.50"
            opacity={hasFocus ? 1 : 0}
            transition="all 0.2s"
            _groupHover={{
              opacity: 1,
            }}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
            onClick={() => setShowResetModal(true)}
          />
        </Box>
        <Stack
          gridArea="sharing"
          alignSelf="flex-end"
          spacing={{ base: "2", lg: "4" }}
          align="flex-end"
        >
          <Box>
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
                onFocus={() => {
                  prepareDownload();
                  setHasFocus(true);
                }}
                onBlur={() => setHasFocus(false)}
                cursor={!downloadImageUrl && "wait"}
                variant="unstyled"
                backgroundColor="gray.600"
                color="gray.50"
                boxShadow="md"
                d="flex"
                alignItems="center"
                justifyContent="center"
                opacity={hasFocus ? 1 : 0}
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
          <Box>
            <Tooltip
              label={hasCopied ? "Copied!" : "Copy link"}
              placement="left"
            >
              <IconButton
                icon={hasCopied ? "check" : "link"}
                aria-label="Copy link"
                isRound
                onClick={onCopy}
                onFocus={() => setHasFocus(true)}
                onBlur={() => setHasFocus(false)}
                variant="unstyled"
                backgroundColor="gray.600"
                color="gray.50"
                boxShadow="md"
                d="flex"
                alignItems="center"
                justifyContent="center"
                opacity={hasFocus ? 1 : 0}
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
        </Stack>
        <Box gridArea="space"></Box>
        <PseudoBox
          gridArea="picker"
          opacity={hasFocus ? 1 : 0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.2s"
          display="flex"
          justifyContent="center"
        >
          <SpeciesColorPicker
            outfitState={outfitState}
            dispatchToOutfit={dispatchToOutfit}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setHasFocus(false)}
          />
        </PseudoBox>
      </Box>
      <OutfitResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        dispatchToOutfit={dispatchToOutfit}
      />
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

    setDownloadImageUrl(null);

    const imagePromises = visibleLayers.map(
      (layer) =>
        new Promise((resolve, reject) => {
          const image = new window.Image();
          image.crossOrigin = "Anonymous"; // Requires S3 CORS config!
          image.addEventListener("load", () => resolve(image), false);
          image.addEventListener("error", (e) => reject(e), false);
          image.src = layer.imageUrl + "&xoxo";
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

function getShareUrl(outfitState) {
  const {
    name,
    speciesId,
    colorId,
    wornItemIds,
    closetedItemIds,
  } = outfitState;

  const params = new URLSearchParams();
  params.append("name", name);
  params.append("species", speciesId);
  params.append("color", colorId);
  for (const itemId of wornItemIds) {
    params.append("objects[]", itemId);
  }
  for (const itemId of closetedItemIds) {
    params.append("closet[]", itemId);
  }

  const { origin, pathname } = window.location;
  const url = origin + pathname + "?" + params.toString();
  return url;
}

export default OutfitPreview;
