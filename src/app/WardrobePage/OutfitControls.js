import React from "react";
import { ClassNames } from "@emotion/react";
import {
  Box,
  Button,
  DarkMode,
  Flex,
  IconButton,
  ListItem,
  Portal,
  Stack,
  Tooltip,
  UnorderedList,
  useClipboard,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowBackIcon,
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  WarningTwoIcon,
} from "@chakra-ui/icons";
import { FaBug } from "react-icons/fa";
import { MdPause, MdPlayArrow } from "react-icons/md";
import { Link } from "react-router-dom";

import { getBestImageUrlForLayer } from "../components/OutfitPreview";
import HTML5Badge, {
  GlitchBadgeLayout,
  layerUsesHTML5,
} from "../components/HTML5Badge";
import PosePicker from "./PosePicker";
import SpeciesColorPicker from "../components/SpeciesColorPicker";
import { loadImage, useLocalStorage } from "../util";
import useCurrentUser from "../components/useCurrentUser";
import useOutfitAppearance from "../components/useOutfitAppearance";

/**
 * OutfitControls is the set of controls layered over the outfit preview, to
 * control things like species/color and sharing links!
 */
function OutfitControls({
  outfitState,
  dispatchToOutfit,
  showAnimationControls,
  appearance,
}) {
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
    <ClassNames>
      {({ css, cx }) => (
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
            const opacity = parseFloat(
              getComputedStyle(e.currentTarget).opacity
            );
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
            <BackButton outfitState={outfitState} />
          </Box>
          {showAnimationControls && (
            <Box gridArea="play-pause" display="flex" justifyContent="center">
              <DarkMode>
                <PlayPauseButton />
              </DarkMode>
            </Box>
          )}
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
          {outfitState.speciesId && outfitState.colorId && (
            <Flex gridArea="picker" justify="center" onClick={maybeUnlockFocus}>
              {/**
               * We try to center the species/color picker, but the left spacer will
               * shrink more than the pose picker container if we run out of space!
               */}
              <Flex
                flex="1 1 0"
                paddingRight="3"
                align="center"
                justify="flex-end"
              >
                <OutfitHTML5Badge appearance={appearance} />
                <Box width="2" />
                <OutfitKnownGlitchesBadge appearance={appearance} />
              </Flex>
              <Box flex="0 0 auto">
                <DarkMode>
                  {
                    <SpeciesColorPicker
                      speciesId={outfitState.speciesId}
                      colorId={outfitState.colorId}
                      idealPose={outfitState.pose}
                      onChange={onSpeciesColorChange}
                      stateMustAlwaysBeValid
                    />
                  }
                </DarkMode>
              </Box>
              <Flex flex="1 1 0" align="center" pl="2">
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
          )}
        </Box>
      )}
    </ClassNames>
  );
}

function OutfitHTML5Badge({ appearance }) {
  const petIsUsingHTML5 = appearance.petAppearance?.layers.every(
    layerUsesHTML5
  );

  const itemsNotUsingHTML5 = appearance.items.filter((item) =>
    item.appearance.layers.some((l) => !layerUsesHTML5(l))
  );
  itemsNotUsingHTML5.sort((a, b) => a.name.localeCompare(b.name));

  const usesHTML5 = petIsUsingHTML5 && itemsNotUsingHTML5.length === 0;

  let tooltipLabel;
  if (usesHTML5) {
    tooltipLabel = (
      <>This outfit is converted to HTML5, and ready to use on Neopets.com!</>
    );
  } else {
    tooltipLabel = (
      <Box>
        <Box as="p">
          This outfit isn't converted to HTML5 yet, so it might not appear in
          Neopets.com customization yet. Once it's ready, it could look a bit
          different than our temporary preview here. It might even be animated!
        </Box>
        {!petIsUsingHTML5 && (
          <Box as="p" marginTop="1em" fontWeight="bold">
            This pet is not yet converted.
          </Box>
        )}
        {itemsNotUsingHTML5.length > 0 && (
          <>
            <Box as="header" marginTop="1em" fontWeight="bold">
              The following items aren't yet converted:
            </Box>
            <UnorderedList>
              {itemsNotUsingHTML5.map((item) => (
                <ListItem key={item.id}>{item.name}</ListItem>
              ))}
            </UnorderedList>
          </>
        )}
      </Box>
    );
  }

  return (
    <HTML5Badge
      usesHTML5={usesHTML5}
      isLoading={appearance.loading}
      tooltipLabel={tooltipLabel}
    />
  );
}

function OutfitKnownGlitchesBadge({ appearance }) {
  const glitchMessages = [];

  // Look for conflicts between Static pet zones (UCs), and Static items.
  const petHasStaticZone = appearance.petAppearance?.layers.some(
    (l) => l.zone.id === "46"
  );
  if (petHasStaticZone) {
    for (const item of appearance.items) {
      const itemHasStaticZone = item.appearance.layers.some(
        (l) => l.zone.id === "46"
      );
      if (itemHasStaticZone) {
        glitchMessages.push(
          <Box key={`static-zone-conflict-for-item-${item.id}`}>
            When you apply a Static-zone item like <i>{item.name}</i> to an
            Unconverted pet, it hides the pet. This is a known bug on
            Neopets.com, so we reproduce it here, too.
          </Box>
        );
      }
    }
  }

  // Look for items with the OFFICIAL_SVG_IS_INCORRECT glitch.
  for (const item of appearance.items) {
    const itemHasOfficialSvgIsIncorrect = item.appearance.layers.some((l) =>
      (l.knownGlitches || []).includes("OFFICIAL_SVG_IS_INCORRECT")
    );
    if (itemHasOfficialSvgIsIncorrect) {
      glitchMessages.push(
        <Box key={`official-svg-is-incorrect-for-item-${item.id}`}>
          There's a glitch in the art for <i>{item.name}</i> that prevents us
          from showing the full-scale SVG version of the image. Instead, we're
          showing a PNG, which might look a bit blurry on larger screens.
        </Box>
      );
    }
  }

  // Look for Dyeworks items that aren't converted yet.
  for (const item of appearance.items) {
    const itemIsDyeworks = item.name.includes("Dyeworks");
    const itemIsConverted = item.appearance.layers.every(layerUsesHTML5);

    if (itemIsDyeworks && !itemIsConverted) {
      glitchMessages.push(
        <Box key={`unconverted-dyeworks-warning-for-item-${item.id}`}>
          <i>{item.name}</i> isn't converted to HTML5 yet, and our Classic DTI
          code often shows old Dyeworks items in the wrong color. Once it's
          converted, we'll display it correctly!
        </Box>
      );
    }
  }

  if (glitchMessages.length === 0) {
    return null;
  }

  return (
    <GlitchBadgeLayout
      aria-label="Has known glitches"
      tooltipLabel={
        <Box>
          <Box as="header" fontWeight="bold" fontSize="sm" marginBottom="1">
            Known glitches
          </Box>
          <VStack spacing="1em">{glitchMessages}</VStack>
        </Box>
      }
    >
      <WarningTwoIcon fontSize="xs" marginRight="1" />
      <FaBug />
    </GlitchBadgeLayout>
  );
}

/**
 * BackButton takes you back home, or to Your Outfits if this outfit is yours.
 */
function BackButton({ outfitState }) {
  const currentUser = useCurrentUser();
  const outfitBelongsToCurrentUser =
    outfitState.creator && outfitState.creator.id === currentUser.id;

  return (
    <ControlButton
      as={Link}
      to={outfitBelongsToCurrentUser ? "/your-outfits" : "/"}
      icon={<ArrowBackIcon />}
      aria-label="Leave this outfit"
      d="inline-flex" // Not sure why <a> requires this to style right! ^^`
    />
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

  // We show an intro animation if this mounts while paused. Whereas if we're
  // not paused, we initialize as if we had already finished.
  const [blinkInState, setBlinkInState] = React.useState(
    isPaused ? { type: "ready" } : { type: "done" }
  );
  const buttonRef = React.useRef(null);

  React.useLayoutEffect(() => {
    if (blinkInState.type === "ready" && buttonRef.current) {
      setBlinkInState({
        type: "started",
        position: {
          left: buttonRef.current.offsetLeft,
          top: buttonRef.current.offsetTop,
        },
      });
    }
  }, [blinkInState, setBlinkInState]);

  return (
    <ClassNames>
      {({ css }) => (
        <>
          <PlayPauseButtonContent
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            marginTop="0.3rem" // to center-align with buttons (not sure on amt?)
            ref={buttonRef}
          />
          {blinkInState.type === "started" && (
            <Portal>
              <PlayPauseButtonContent
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                position="absolute"
                left={blinkInState.position.left}
                top={blinkInState.position.top}
                backgroundColor="gray.600"
                borderColor="gray.50"
                color="gray.50"
                onAnimationEnd={() => setBlinkInState({ type: "done" })}
                // Don't disrupt the hover state of the controls! (And the button
                // doesn't seem to click correctly, not sure why, but instead of
                // debugging I'm adding this :p)
                pointerEvents="none"
                className={css`
                  @keyframes fade-in-out {
                    0% {
                      opacity: 0;
                    }

                    10% {
                      opacity: 1;
                    }

                    90% {
                      opacity: 1;
                    }

                    100% {
                      opacity: 0;
                    }
                  }

                  opacity: 0;
                  animation: fade-in-out 2s;
                `}
              />
            </Portal>
          )}
        </>
      )}
    </ClassNames>
  );
}

const PlayPauseButtonContent = React.forwardRef(
  ({ isPaused, setIsPaused, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        leftIcon={isPaused ? <MdPause /> : <MdPlayArrow />}
        size="sm"
        color="gray.100"
        variant="outline"
        borderColor="gray.200"
        borderRadius="full"
        backgroundColor="blackAlpha.600"
        boxShadow="md"
        position="absolute"
        _hover={{
          backgroundColor: "gray.600",
          borderColor: "gray.50",
          color: "gray.50",
        }}
        _focus={{
          backgroundColor: "gray.600",
          borderColor: "gray.50",
          color: "gray.50",
        }}
        onClick={() => setIsPaused(!isPaused)}
        {...props}
      >
        {isPaused ? <>Paused</> : <>Playing</>}
      </Button>
    );
  }
);

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
  const toast = useToast();

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

    const imagePromises = visibleLayers.map((layer) =>
      loadImage(getBestImageUrlForLayer(layer))
    );

    let images;
    try {
      images = await Promise.all(imagePromises);
    } catch (e) {
      console.error("Error building downloadable image", e);
      toast({
        status: "error",
        title: "Oops, sorry, we couldn't download the image!",
        description:
          "Check your connection, then reload the page and try again.",
      });
      return;
    }

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
  }, [preparedForLayerIds, visibleLayers, toast]);

  return [downloadImageUrl, prepareDownload];
}

export default OutfitControls;
