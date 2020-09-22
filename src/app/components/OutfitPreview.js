import React from "react";
import { Box, DarkMode, Flex, Text } from "@chakra-ui/core";
import { WarningIcon } from "@chakra-ui/icons";
import { css, cx } from "emotion";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import OutfitCanvas, {
  OutfitCanvasImage,
  OutfitCanvasMovie,
  loadImage,
  useEaselDependenciesLoader,
} from "./OutfitCanvas";
import HangerSpinner from "./HangerSpinner";
import { useLocalStorage } from "../util";
import useOutfitAppearance from "./useOutfitAppearance";

/**
 * OutfitPreview is for rendering a full outfit! It accepts outfit data,
 * fetches the appearance data for it, and preloads and renders the layers
 * together.
 *
 * If the species/color/pose fields are null and a `placeholder` node is
 * provided instead, we'll render the placeholder. And then, once those props
 * become non-null, we'll keep showing the placeholder below the loading
 * overlay until loading completes. (We use this on the homepage to show the
 * beach splash until outfit data arrives!)
 *
 * TODO: There's some duplicate work happening in useOutfitAppearance and
 * useOutfitState both getting appearance data on first load...
 */
function OutfitPreview({
  speciesId,
  colorId,
  pose,
  wornItemIds,
  appearanceId = null,
  isLoading = false,
  placeholder,
  loadingDelayMs,
  spinnerVariant,
  engine = "images",
}) {
  const { loading, error, visibleLayers } = useOutfitAppearance({
    speciesId,
    colorId,
    pose,
    appearanceId,
    wornItemIds,
  });

  const { loading: loading2, error: error2, loadedLayers } = usePreloadLayers(
    visibleLayers
  );

  if (error || error2) {
    return (
      <FullScreenCenter>
        <Text color="green.50" d="flex" alignItems="center">
          <WarningIcon />
          <Box width={2} />
          Could not load preview. Try again?
        </Text>
      </FullScreenCenter>
    );
  }

  return (
    <OutfitLayers
      loading={isLoading || loading || loading2}
      visibleLayers={loadedLayers}
      placeholder={placeholder}
      loadingDelayMs={loadingDelayMs}
      spinnerVariant={spinnerVariant}
      engine={engine}
      doTransitions
    />
  );
}

/**
 * OutfitLayers is the raw UI component for rendering outfit layers. It's
 * used both in the main outfit preview, and in other minor UIs!
 */
export function OutfitLayers({
  loading,
  visibleLayers,
  placeholder,
  loadingDelayMs = 500,
  spinnerVariant = "overlay",
  doTransitions = false,
  engine = "images",
}) {
  const containerRef = React.useRef(null);
  const [canvasSize, setCanvasSize] = React.useState(0);
  const [loadingDelayHasPassed, setLoadingDelayHasPassed] = React.useState(
    false
  );

  const { loading: loadingEasel } = useEaselDependenciesLoader();
  const loadingAnything = loading || loadingEasel;

  const [isPaused] = useLocalStorage("DTIOutfitIsPaused", true);

  // When we start in a loading state, or re-enter a loading state, start the
  // loading delay timer.
  React.useEffect(() => {
    if (loadingAnything) {
      setLoadingDelayHasPassed(false);
      const t = setTimeout(
        () => setLoadingDelayHasPassed(true),
        loadingDelayMs
      );
      return () => clearTimeout(t);
    }
  }, [loadingDelayMs, loadingAnything]);

  React.useLayoutEffect(() => {
    function computeAndSizeCanvasSize() {
      setCanvasSize(
        Math.min(
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight
        )
      );
    }

    window.addEventListener("resize", computeAndSizeCanvasSize);
    return () => window.removeEventListener("resize", computeAndSizeCanvasSize);
  }, [setCanvasSize]);

  return (
    <Box
      pos="relative"
      height="100%"
      width="100%"
      // Create a stacking context, so the z-indexed layers don't escape!
      zIndex="0"
      ref={containerRef}
    >
      {placeholder && (
        <FullScreenCenter>
          <Box
            // We show the placeholder until there are visible layers, at which
            // point we fade it out.
            opacity={visibleLayers.length === 0 ? 1 : 0}
            transition="opacity 0.2s"
          >
            {placeholder}
          </Box>
        </FullScreenCenter>
      )}
      {
        // TODO: A bit of a mess in here! Extract these out?
        engine === "canvas" ? (
          !loadingEasel && (
            <FullScreenCenter>
              <OutfitCanvas
                width={canvasSize}
                height={canvasSize}
                pauseMovieLayers={isPaused}
              >
                {visibleLayers.map((layer) =>
                  layer.canvasMovieLibraryUrl ? (
                    <OutfitCanvasMovie
                      key={layer.id}
                      librarySrc={layer.canvasMovieLibraryUrl}
                      zIndex={layer.zone.depth}
                    />
                  ) : (
                    <OutfitCanvasImage
                      key={layer.id}
                      src={getBestImageUrlForLayer(layer)}
                      zIndex={layer.zone.depth}
                    />
                  )
                )}
              </OutfitCanvas>
            </FullScreenCenter>
          )
        ) : (
          <TransitionGroup enter={false} exit={doTransitions}>
            {visibleLayers.map((layer) => (
              <CSSTransition
                // We manage the fade-in and fade-out separately! The fade-out
                // happens here, when the layer exits the DOM.
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
                <FullScreenCenter zIndex={layer.zone.depth}>
                  <img
                    src={getBestImageUrlForLayer(layer)}
                    alt=""
                    // We manage the fade-in and fade-out separately! The fade-in
                    // happens here, when the <Image> finishes preloading and
                    // applies the src to the underlying <img>.
                    className={cx(
                      css`
                        object-fit: contain;
                        max-width: 100%;
                        max-height: 100%;

                        &.do-animations {
                          animation: fade-in 0.2s;
                        }

                        @keyframes fade-in {
                          from {
                            opacity: 0;
                          }
                          to {
                            opacity: 1;
                          }
                        }
                      `,
                      doTransitions && "do-animations"
                    )}
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
        )
      }
      <FullScreenCenter
        zIndex="9000"
        // This is similar to our Delay util component, but Delay disappears
        // immediately on load, whereas we want this to fade out smoothly. We
        // also use a timeout to delay the fade-in by 0.5s, but don't delay the
        // fade-out at all. (The timeout was an awkward choice, it was hard to
        // find a good CSS way to specify this delay well!)
        opacity={loadingAnything && loadingDelayHasPassed ? 1 : 0}
        transition="opacity 0.2s"
      >
        {spinnerVariant === "overlay" && (
          <>
            <Box
              position="absolute"
              top="0"
              left="0"
              right="0"
              bottom="0"
              backgroundColor="gray.900"
              opacity="0.7"
            />
            {/* Against the dark overlay, use the Dark Mode spinner. */}
            <DarkMode>
              <HangerSpinner />
            </DarkMode>
          </>
        )}
        {spinnerVariant === "corner" && (
          <HangerSpinner size="sm" position="absolute" bottom="2" right="2" />
        )}
      </FullScreenCenter>
    </Box>
  );
}

export function FullScreenCenter({ children, ...otherProps }) {
  return (
    <Flex
      pos="absolute"
      top="0"
      right="0"
      bottom="0"
      left="0"
      alignItems="center"
      justifyContent="center"
      {...otherProps}
    >
      {children}
    </Flex>
  );
}

function getBestImageUrlForLayer(layer) {
  if (layer.svgUrl) {
    return `/api/assetProxy?url=${encodeURIComponent(layer.svgUrl)}`;
  } else {
    return layer.imageUrl;
  }
}

/**
 * usePreloadLayers preloads the images for the given layers, and yields them
 * when done. This enables us to keep the old outfit preview on screen until
 * all the new layers are ready, then show them all at once!
 */
export function usePreloadLayers(layers) {
  const [error, setError] = React.useState(null);
  const [loadedLayers, setLoadedLayers] = React.useState([]);

  // NOTE: This condition would need to change if we started loading one at a
  // time, or if the error case would need to show a partial state!
  const loading = loadedLayers !== layers;

  React.useEffect(() => {
    // HACK: Don't clear the preview when we have zero layers, because it
    // usually means the parent is still loading data. I feel like this isn't
    // the right abstraction, though...
    if (loadedLayers.length > 0 && layers.length === 0) {
      return;
    }

    // If the layers already match, we can ignore extra effect triggers.
    if (!loading) {
      return;
    }

    let canceled = false;
    setError(null);

    const loadImages = async () => {
      const imagePromises = layers.map(getBestImageUrlForLayer).map(loadImage);
      try {
        // TODO: Load in one at a time, under a loading spinner & delay?
        await Promise.all(imagePromises);
      } catch (e) {
        if (canceled) return;
        console.error("Error preloading outfit layers", e);
        imagePromises.forEach((p) => p.cancel());
        setError(e);
        return;
      }

      if (canceled) return;
      setLoadedLayers(layers);
    };

    loadImages();

    return () => {
      canceled = true;
    };
  }, [layers, loadedLayers.length, loading]);

  return { loading, error, loadedLayers };
}

export default OutfitPreview;
