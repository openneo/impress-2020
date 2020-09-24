import React from "react";
import { css, cx } from "emotion";
import {
  Box,
  Button,
  DarkMode,
  Flex,
  IconButton,
  Stack,
  Tooltip,
  useClipboard,
  useToast,
} from "@chakra-ui/core";
import {
  ArrowBackIcon,
  CheckIcon,
  DownloadIcon,
  LinkIcon,
} from "@chakra-ui/icons";
import { MdPause, MdPlayArrow } from "react-icons/md";
import { Link } from "react-router-dom";

import PosePicker from "./PosePicker";
import SpeciesColorPicker from "../components/SpeciesColorPicker";
import { useLocalStorage } from "../util";
import useOutfitAppearance from "../components/useOutfitAppearance";

/**
 * OutfitControls is the set of controls layered over the outfit preview, to
 * control things like species/color and sharing links!
 */
function OutfitControls({ outfitState, dispatchToOutfit }) {
  const [focusIsLocked, setFocusIsLocked] = React.useState(false);
  const onLockFocus = React.useCallback(() => setFocusIsLocked(true), [
    setFocusIsLocked,
  ]);
  const onUnlockFocus = React.useCallback(() => setFocusIsLocked(false), [
    setFocusIsLocked,
  ]);

  // HACK: As of 1.0.0-rc.0, Chakra's `toast` function rebuilds unnecessarily,
  //       which triggers unnecessary rebuilds of the `onSpeciesColorChange`
  //       callback, which causes the `React.memo` on `SpeciesColorPicker` to
  //       fail, which harms performance. But it seems to work just fine if we
  //       hold onto the first copy of the function we get! :/
  const _toast = useToast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toast = React.useMemo(() => _toast, []);

  const onSpeciesColorChange = React.useCallback(
    (species, color, isValid, closestPose) => {
      if (isValid) {
        dispatchToOutfit({
          type: "setSpeciesAndColor",
          speciesId: species.id,
          colorId: color.id,
          pose: closestPose,
        });
      } else {
        // NOTE: This shouldn't be possible to trigger, because the
        //       `stateMustAlwaysBeValid` prop should prevent it. But we have
        //       it as a fallback, just in case!
        toast({
          title: `We haven't seen a ${color.name} ${species.name} before! 😓`,
          status: "warning",
        });
      }
    },
    [dispatchToOutfit, toast]
  );

  const maybeUnlockFocus = (e) => {
    // We lock focus when a touch-device user taps the area. When they tap
    // empty space, we treat that as a toggle and release the focus lock.
    if (e.target === e.currentTarget) {
      onUnlockFocus();
    }
  };

  return (
    <Box
      role="group"
      pos="absolute"
      left="0"
      right="0"
      top="0"
      bottom="0"
      height="100%" // Required for Safari to size the grid correctly
      padding={{ base: 2, lg: 6 }}
      display="grid"
      overflow="auto"
      gridTemplateAreas={`"back play-pause sharing"
                          "space space space"
                          "picker picker picker"`}
      gridTemplateRows="auto minmax(1rem, 1fr) auto"
      className={cx(
        css`
          opacity: 0;
          transition: opacity 0.2s;

          &:focus-within,
          &.focus-is-locked {
            opacity: 1;
          }

          /* Ignore simulated hovers, only reveal for _real_ hovers. This helps
           * us avoid state conflicts with the focus-lock from clicks. */
          @media (hover: hover) {
            &:hover {
              opacity: 1;
            }
          }
        `,
        focusIsLocked && "focus-is-locked"
      )}
      onClickCapture={(e) => {
        const opacity = parseFloat(getComputedStyle(e.currentTarget).opacity);
        if (opacity < 0.5) {
          // If the controls aren't visible right now, then clicks on them are
          // probably accidental. Ignore them! (We prevent default to block
          // built-in behaviors like link nav, and we stop propagation to block
          // our own custom click handlers. I don't know if I can prevent the
          // select clicks though?)
          e.preventDefault();
          e.stopPropagation();

          // We also show the controls, by locking focus. We'll undo this when
          // the user taps elsewhere (because it will trigger a blur event from
          // our child components), in `maybeUnlockFocus`.
          setFocusIsLocked(true);
        }
      }}
    >
      <Box gridArea="back" onClick={maybeUnlockFocus}>
        <ControlButton
          as={Link}
          to="/"
          icon={<ArrowBackIcon />}
          aria-label="Leave this outfit"
          d="inline-flex" // Not sure why <a> requires this to style right! ^^`
        />
      </Box>
      <Box gridArea="play-pause" display="flex" justifyContent="center">
        <DarkMode>
          <PlayPauseButton />
        </DarkMode>
      </Box>
      <Stack
        gridArea="sharing"
        alignSelf="flex-end"
        spacing={{ base: "2", lg: "4" }}
        align="flex-end"
        onClick={maybeUnlockFocus}
      >
        <Box>
          <DownloadButton outfitState={outfitState} />
        </Box>
        <Box>
          <CopyLinkButton outfitState={outfitState} />
        </Box>
      </Stack>
      <Box gridArea="space" onClick={maybeUnlockFocus} />
      <Flex gridArea="picker" justify="center" onClick={maybeUnlockFocus}>
        {/**
         * We try to center the species/color picker, but the left spacer will
         * shrink more than the pose picker container if we run out of space!
         */}
        <Box flex="1 1 0" />
        <Box flex="0 0 auto">
          <DarkMode>
            <SpeciesColorPicker
              speciesId={outfitState.speciesId}
              colorId={outfitState.colorId}
              idealPose={outfitState.pose}
              onChange={onSpeciesColorChange}
              stateMustAlwaysBeValid
            />
          </DarkMode>
        </Box>
        <Flex flex="1 1 0" align="center" pl="4">
          <PosePicker
            speciesId={outfitState.speciesId}
            colorId={outfitState.colorId}
            pose={outfitState.pose}
            appearanceId={outfitState.appearanceId}
            dispatchToOutfit={dispatchToOutfit}
            onLockFocus={onLockFocus}
            onUnlockFocus={onUnlockFocus}
          />
        </Flex>
      </Flex>
    </Box>
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
          icon={<DownloadIcon />}
          aria-label="Download"
          as="a"
          // eslint-disable-next-line no-script-url
          href={downloadImageUrl || "#"}
          onClick={(e) => {
            if (!downloadImageUrl) {
              e.preventDefault();
            }
          }}
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
          icon={hasCopied ? <CheckIcon /> : <LinkIcon />}
          aria-label="Copy link"
          onClick={onCopy}
        />
      </Box>
    </Tooltip>
  );
}

function PlayPauseButton() {
  const [isPaused, setIsPaused] = useLocalStorage("DTIOutfitIsPaused", true);

  return (
    <Button
      leftIcon={isPaused ? <MdPause /> : <MdPlayArrow />}
      size="sm"
      color="gray.300"
      variant="outline"
      borderColor="gray.300"
      borderRadius="full"
      backgroundColor="blackAlpha.500"
      marginTop="0.3rem" // to center-align with buttons (not sure on amt?)
      _hover={{
        backgroundColor: "gray.600",
        borderColor: "gray.50",
        color: "gray.50",
      }}
      onClick={() => setIsPaused(!isPaused)}
    >
      {isPaused ? <>Paused</> : <>Playing</>}
    </Button>
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
