import React from "react";
import { Box, DarkMode, Flex, Text } from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";
import { ClassNames } from "@emotion/react";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import OutfitMovieLayer, {
  buildMovieClip,
  hasAnimations,
  loadMovieLibrary,
  useEaselDependenciesLoader,
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
  onChangeHasAnimations = null,
}) {
  const { loading, error, visibleLayers } = useOutfitAppearance({
    speciesId,
    colorId,
    pose,
    appearanceId,
    wornItemIds,
  });

  const {
    loading: loading2,
    error: error2,
    loadedLayers,
    layersHaveAnimations,
  } = usePreloadLayers(visibleLayers);

  const [isPaused] = useLocalStorage("DTIOutfitIsPaused", true);

  React.useEffect(() => {
    if (onChangeHasAnimations) {
      onChangeHasAnimations(layersHaveAnimations);
    }
  }, [layersHaveAnimations, onChangeHasAnimations]);

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
      onChangeHasAnimations={onChangeHasAnimations}
      doTransitions
      isPaused={isPaused}
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
  isPaused = true,
}) {
  const containerRef = React.useRef(null);
  const [canvasSize, setCanvasSize] = React.useState(0);
  const [loadingDelayHasPassed, setLoadingDelayHasPassed] = React.useState(
    false
  );

  const { loading: loadingEasel } = useEaselDependenciesLoader();
  const loadingAnything = loading || loadingEasel;

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
                    />
                  ) : (
                    <Box
                      as="img"
                      src={getBestImageUrlForLayer(layer).src}
                      // The crossOrigin prop isn't strictly necessary for loading
                      // here (<img> tags are always allowed through CORS), but
                      // this means we make the same request that the Download
                      // button makes, so it can use the cached version of this
                      // image instead of requesting it again with crossOrigin!
                      crossOrigin={getBestImageUrlForLayer(layer).crossOrigin}
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

export function getBestImageUrlForLayer(layer) {
  if (layer.svgUrl) {
    return { src: safeImageUrl(layer.svgUrl) };
  } else {
    return { src: layer.imageUrl, crossOrigin: "anonymous" };
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
          return loadImage(getBestImageUrlForLayer(layer)).then((image) => ({
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

      let movieClips;
      try {
        movieClips = assets
          .filter((a) => a.type === "movie")
          .map((a) => buildMovieClip(a.library, a.libraryUrl));
      } catch (e) {
        console.error("Error building movie clips", e);
        assetPromises.forEach((p) => {
          if (p.cancel) {
            p.cancel();
          }
        });
        setError(e);
        return;
      }

      // Some movie clips require you to tick to the first frame of the movie
      // before the children mount onto the stage. If we detect animations
      // without doing this, we'll say no, because we see no children!
      // Example: http://images.neopets.com/cp/items/data/000/000/235/235877_6d273e217c/235877.js
      movieClips.forEach((mc) => mc.advance());

      setLayersHaveAnimations(movieClips.some(hasAnimations));
      setLoadedLayers(layers);
    };

    loadAssets();

    return () => {
      canceled = true;
    };
  }, [layers, loadedLayers.length, loading]);

  return { loading, error, loadedLayers, layersHaveAnimations };
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
