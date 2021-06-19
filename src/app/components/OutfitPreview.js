import React from "react";
import {
  Box,
  DarkMode,
  Flex,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import LRU from "lru-cache";
import { WarningIcon } from "@chakra-ui/icons";
import { ClassNames } from "@emotion/react";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import OutfitMovieLayer, {
  buildMovieClip,
  hasAnimations,
  loadMovieLibrary,
} from "./OutfitMovieLayer";
import HangerSpinner from "./HangerSpinner";
import { loadImage, safeImageUrl, useLocalStorage } from "../util";
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
function OutfitPreview(props) {
  const { preview } = useOutfitPreview(props);
  return preview;
}

/**
 * useOutfitPreview is like `<OutfitPreview />`, but a bit more power!
 *
 * It takes the same props and returns a `preview` field, which is just like
 * `<OutfitPreview />` - but it also returns `appearance` data too, in case you
 * want to show some additional UI that uses the appearance data we loaded!
 */
export function useOutfitPreview({
  speciesId,
  colorId,
  pose,
  wornItemIds,
  appearanceId = null,
  isLoading = false,
  placeholder = null,
  loadingDelayMs,
  spinnerVariant,
  onChangeHasAnimations = null,
  ...props
}) {
  const [isPaused, setIsPaused] = useLocalStorage("DTIOutfitIsPaused", true);
  const toast = useToast();

  const appearance = useOutfitAppearance({
    speciesId,
    colorId,
    pose,
    appearanceId,
    wornItemIds,
  });
  const { loading, error, visibleLayers } = appearance;

  const {
    loading: loading2,
    error: error2,
    loadedLayers,
    layersHaveAnimations,
  } = usePreloadLayers(visibleLayers);

  const onLowFps = React.useCallback(
    (fps) => {
      setIsPaused(true);
      console.warn(`[OutfitPreview] Pausing due to low FPS: ${fps}`);

      if (!toast.isActive("low-fps-warning")) {
        toast({
          id: "low-fps-warning",
          status: "warning",
          title: "Sorry, the animation was lagging, so we paused it! 😖",
          description:
            "We do this to help make sure your machine doesn't lag too much! " +
            "You can unpause the preview to try again.",
          duration: null,
          isClosable: true,
        });
      }
    },
    [setIsPaused, toast]
  );

  React.useEffect(() => {
    if (onChangeHasAnimations) {
      onChangeHasAnimations(layersHaveAnimations);
    }
  }, [layersHaveAnimations, onChangeHasAnimations]);

  const textColor = useColorModeValue("green.700", "white");

  let preview;
  if (error || error2) {
    preview = (
      <FullScreenCenter>
        <Text color={textColor} d="flex" alignItems="center">
          <WarningIcon />
          <Box width={2} />
          Could not load preview. Try again?
        </Text>
      </FullScreenCenter>
    );
  } else {
    preview = (
      <OutfitLayers
        loading={isLoading || loading || loading2}
        visibleLayers={loadedLayers}
        placeholder={placeholder}
        loadingDelayMs={loadingDelayMs}
        spinnerVariant={spinnerVariant}
        onChangeHasAnimations={onChangeHasAnimations}
        onLowFps={onLowFps}
        doTransitions
        isPaused={isPaused}
        {...props}
      />
    );
  }

  return { appearance, preview };
}

/**
 * OutfitLayers is the raw UI component for rendering outfit layers. It's
 * used both in the main outfit preview, and in other minor UIs!
 */
export function OutfitLayers({
  loading,
  visibleLayers,
  placeholder = null,
  loadingDelayMs = 500,
  spinnerVariant = "overlay",
  doTransitions = false,
  isPaused = true,
  onLowFps = null,
  ...props
}) {
  const [hiResMode] = useLocalStorage("DTIHiResMode", false);

  const containerRef = React.useRef(null);
  const [canvasSize, setCanvasSize] = React.useState(0);
  const [loadingDelayHasPassed, setLoadingDelayHasPassed] = React.useState(
    false
  );

  // When we start in a loading state, or re-enter a loading state, start the
  // loading delay timer.
  React.useEffect(() => {
    if (loading) {
      setLoadingDelayHasPassed(false);
      const t = setTimeout(
        () => setLoadingDelayHasPassed(true),
        loadingDelayMs
      );
      return () => clearTimeout(t);
    }
  }, [loadingDelayMs, loading]);

  React.useLayoutEffect(() => {
    function computeAndSaveCanvasSize() {
      setCanvasSize(
        // Follow an algorithm similar to the <img> sizing: a square that
        // covers the available space, without exceeding the natural image size
        // (which is 600px).
        //
        // TODO: Once we're entirely off PNGs, we could drop the 600
        //       requirement, and let SVGs and movies scale up as far as they
        //       want...
        Math.min(
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight,
          600
        )
      );
    }

    computeAndSaveCanvasSize();
    window.addEventListener("resize", computeAndSaveCanvasSize);
    return () => window.removeEventListener("resize", computeAndSaveCanvasSize);
  }, [setCanvasSize]);

  return (
    <ClassNames>
      {({ css }) => (
        <Box
          pos="relative"
          height="100%"
          width="100%"
          maxWidth="600px"
          maxHeight="600px"
          // Create a stacking context, so the z-indexed layers don't escape!
          zIndex="0"
          ref={containerRef}
          data-loading={loading ? true : undefined}
          {...props}
        >
          {placeholder && (
            <FullScreenCenter>
              <Box
                // We show the placeholder until there are visible layers, at which
                // point we fade it out.
                opacity={visibleLayers.length === 0 ? 1 : 0}
                transition="opacity 0.2s"
                width="100%"
                height="100%"
                maxWidth="600px"
                maxHeight="600px"
              >
                {placeholder}
              </Box>
            </FullScreenCenter>
          )}
          <TransitionGroup enter={false} exit={doTransitions}>
            {visibleLayers.map((layer) => (
              <CSSTransition
                // We manage the fade-in and fade-out separately! The fade-out
                // happens here, when the layer exits the DOM.
                key={layer.id}
                timeout={200}
              >
                <FadeInOnLoad
                  as={FullScreenCenter}
                  zIndex={layer.zone.depth}
                  className={css`
                    &.exit {
                      opacity: 1;
                    }

                    &.exit-active {
                      opacity: 0;
                      transition: opacity 0.2s;
                    }
                  `}
                >
                  {layer.canvasMovieLibraryUrl ? (
                    <OutfitMovieLayer
                      libraryUrl={layer.canvasMovieLibraryUrl}
                      width={canvasSize}
                      height={canvasSize}
                      isPaused={isPaused}
                      onLowFps={onLowFps}
                    />
                  ) : (
                    <Box
                      as="img"
                      src={getBestImageUrlForLayer(layer, { hiResMode })}
                      alt=""
                      objectFit="contain"
                      maxWidth="100%"
                      maxHeight="100%"
                    />
                  )}
                </FadeInOnLoad>
              </CSSTransition>
            ))}
          </TransitionGroup>
          <FullScreenCenter
            zIndex="9000"
            // This is similar to our Delay util component, but Delay disappears
            // immediately on load, whereas we want this to fade out smoothly. We
            // also use a timeout to delay the fade-in by 0.5s, but don't delay the
            // fade-out at all. (The timeout was an awkward choice, it was hard to
            // find a good CSS way to specify this delay well!)
            opacity={loading && loadingDelayHasPassed ? 1 : 0}
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
              <HangerSpinner
                size="sm"
                position="absolute"
                bottom="2"
                right="2"
              />
            )}
          </FullScreenCenter>
        </Box>
      )}
    </ClassNames>
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

export function getBestImageUrlForLayer(
  layer,
  { hiResMode = false, crossOrigin = null } = {}
) {
  if (hiResMode && layer.svgUrl) {
    return safeImageUrl(layer.svgUrl, { crossOrigin });
  } else {
    return safeImageUrl(layer.imageUrl, { crossOrigin });
  }
}

/**
 * usePreloadLayers preloads the images for the given layers, and yields them
 * when done. This enables us to keep the old outfit preview on screen until
 * all the new layers are ready, then show them all at once!
 */
export function usePreloadLayers(layers) {
  const [hiResMode] = useLocalStorage("DTIHiResMode", false);

  const [error, setError] = React.useState(null);
  const [loadedLayers, setLoadedLayers] = React.useState([]);
  const [layersHaveAnimations, setLayersHaveAnimations] = React.useState(false);

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

    const loadAssets = async () => {
      const assetPromises = layers.map((layer) => {
        if (layer.canvasMovieLibraryUrl) {
          return loadMovieLibrary(layer.canvasMovieLibraryUrl).then(
            (library) => ({
              type: "movie",
              library,
              libraryUrl: layer.canvasMovieLibraryUrl,
            })
          );
        } else {
          return loadImage({
            src: getBestImageUrlForLayer(layer, { hiResMode }),
          }).then((image) => ({
            type: "image",
            image,
          }));
        }
      });

      let assets;
      try {
        assets = await Promise.all(assetPromises);
      } catch (e) {
        if (canceled) return;
        console.error("Error preloading outfit layers", e);
        assetPromises.forEach((p) => {
          if (p.cancel) {
            p.cancel();
          }
        });
        setError(e);
        return;
      }

      if (canceled) return;

      let newLayersHaveAnimations;
      try {
        newLayersHaveAnimations = assets
          .filter((a) => a.type === "movie")
          .some(getHasAnimationsForMovieAsset);
      } catch (e) {
        console.error("Error testing layers for animations", e);
        setError(e);
        return;
      }

      setLayersHaveAnimations(newLayersHaveAnimations);
      setLoadedLayers(layers);
    };

    loadAssets();

    return () => {
      canceled = true;
    };
  }, [layers, loadedLayers.length, loading, hiResMode]);

  return { loading, error, loadedLayers, layersHaveAnimations };
}

// This cache is large because it's only storing booleans; mostly just capping
// it to put *some* upper bound on memory growth.
const HAS_ANIMATIONS_FOR_MOVIE_ASSET_CACHE = new LRU(50);

function getHasAnimationsForMovieAsset({ library, libraryUrl }) {
  // This operation can be pretty expensive! We store a cache to only do it
  // once per layer per session ish, instead of on each outfit change.
  const cachedHasAnimations = HAS_ANIMATIONS_FOR_MOVIE_ASSET_CACHE.get(
    libraryUrl
  );
  if (cachedHasAnimations) {
    return cachedHasAnimations;
  }

  const movieClip = buildMovieClip(library, libraryUrl);

  // Some movie clips require you to tick to the first frame of the movie
  // before the children mount onto the stage. If we detect animations
  // without doing this, we'll incorrectly say no, because we see no children!
  // Example: http://images.neopets.com/cp/items/data/000/000/235/235877_6d273e217c/235877.js
  movieClip.advance();

  const movieClipHasAnimations = hasAnimations(movieClip);

  HAS_ANIMATIONS_FOR_MOVIE_ASSET_CACHE.set(libraryUrl, movieClipHasAnimations);
  return movieClipHasAnimations;
}

/**
 * FadeInOnLoad attaches an `onLoad` handler to its single child, and fades in
 * the container element once it triggers.
 */
function FadeInOnLoad({ children, ...props }) {
  const [isLoaded, setIsLoaded] = React.useState(false);

  const onLoad = React.useCallback(() => setIsLoaded(true), []);

  const child = React.Children.only(children);
  const wrappedChild = React.cloneElement(child, { onLoad });

  return (
    <Box opacity={isLoaded ? 1 : 0} transition="opacity 0.2s" {...props}>
      {wrappedChild}
    </Box>
  );
}

export default OutfitPreview;
