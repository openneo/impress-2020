import React from "react";
import { css } from "emotion";
import {
  Box,
  Flex,
  IconButton,
  PseudoBox,
  Stack,
  Tooltip,
  useClipboard,
} from "@chakra-ui/core";

import OutfitResetModal from "./OutfitResetModal";
import SpeciesColorPicker from "./SpeciesColorPicker";
import useOutfitAppearance from "./useOutfitAppearance";

/**
 * OutfitControls is the set of controls layered over the outfit preview, to
 * control things like species/color and sharing links!
 */
function OutfitControls({ outfitState, dispatchToOutfit }) {
  return (
    <PseudoBox
      role="group"
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
      className={css`
        opacity: 0;
        transition: opacity 0.2s;

        &:hover,
        &:focus-within {
          opacity: 1;
        }
      `}
    >
      <Box gridArea="back">
        <BackButton dispatchToOutfit={dispatchToOutfit} />
      </Box>
      <Stack
        gridArea="sharing"
        alignSelf="flex-end"
        spacing={{ base: "2", lg: "4" }}
        align="flex-end"
      >
        <Box>
          <DownloadButton outfitState={outfitState} />
        </Box>
        <Box>
          <CopyLinkButton outfitState={outfitState} />
        </Box>
      </Stack>
      <Box gridArea="space" />
      <Flex gridArea="picker" justify="center">
        <SpeciesColorPicker
          outfitState={outfitState}
          dispatchToOutfit={dispatchToOutfit}
        />
      </Flex>
    </PseudoBox>
  );
}

/**
 * DownloadButton downloads the outfit as an image!
 */
function DownloadButton({ outfitState }) {
  const { visibleLayers } = useOutfitAppearance(outfitState);

  const [downloadImageUrl, prepareDownload] = useDownloadableImage(
    visibleLayers
  );

  return (
    <Tooltip label="Download" placement="left">
      <Box>
        <ControlButton
          icon="download"
          aria-label="Download"
          as="a"
          // eslint-disable-next-line no-script-url
          href={downloadImageUrl || "javascript:void 0"}
          download={(outfitState.name || "Outfit") + ".png"}
          onMouseEnter={prepareDownload}
          onFocus={prepareDownload}
          cursor={!downloadImageUrl && "wait"}
        />
      </Box>
    </Tooltip>
  );
}

/**
 * CopyLinkButton copies the outfit URL to the clipboard!
 */
function CopyLinkButton({ outfitState }) {
  const { onCopy, hasCopied } = useClipboard(outfitState.url);

  return (
    <Tooltip label={hasCopied ? "Copied!" : "Copy link"} placement="left">
      <Box>
        <ControlButton
          icon={hasCopied ? "check" : "link"}
          aria-label="Copy link"
          onClick={onCopy}
        />
      </Box>
    </Tooltip>
  );
}

/**
 * BackButton opens a reset modal to let you clear the outfit or enter a new
 * pet's name to start from!
 */
function BackButton({ dispatchToOutfit }) {
  const [showResetModal, setShowResetModal] = React.useState(false);

  return (
    <>
      <ControlButton
        icon="arrow-back"
        aria-label="Leave this outfit"
        onClick={() => setShowResetModal(true)}
      />
      <OutfitResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        dispatchToOutfit={dispatchToOutfit}
      />
    </>
  );
}

/**
 * ControlButton is a UI helper to render the cute round buttons we use in
 * OutfitControls!
 */
function ControlButton({ icon, "aria-label": ariaLabel, ...props }) {
  return (
    <IconButton
      icon={icon}
      aria-label={ariaLabel}
      isRound
      variant="unstyled"
      backgroundColor="gray.600"
      color="gray.50"
      boxShadow="md"
      d="flex"
      alignItems="center"
      justifyContent="center"
      transition="backgroundColor 0.2s"
      _focus={{ backgroundColor: "gray.500" }}
      _hover={{ backgroundColor: "gray.500" }}
      outline="initial"
      {...props}
    />
  );
}

/**
 * useDownloadableImage loads the image data and generates the downloadable
 * image URL.
 */
function useDownloadableImage(visibleLayers) {
  const [downloadImageUrl, setDownloadImageUrl] = React.useState(null);
  const [preparedForLayerIds, setPreparedForLayerIds] = React.useState([]);

  const prepareDownload = React.useCallback(async () => {
    // Skip if the current image URL is already correct for these layers.
    const layerIds = visibleLayers.map((l) => l.id);
    if (layerIds.join(",") === preparedForLayerIds.join(",")) {
      return;
    }

    // Skip if there are no layers. (This probably means we're still loading!)
    if (layerIds.length === 0) {
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

export default OutfitControls;
