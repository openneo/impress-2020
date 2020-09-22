import React from "react";
import { Box, DarkMode, Flex, Text } from "@chakra-ui/core";
import { WarningIcon } from "@chakra-ui/icons";
import { css, cx } from "emotion";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import HangerSpinner from "./HangerSpinner";
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
  // NOTE: I couldn't find an official NPM source for this that worked with
  //       Webpack, and I didn't want to rely on random people's ports, and I
  //       couldn't get a bundled version to work quite right. So we load
  //       createjs async!
  const easelLoading = useScriptTag(
    "https://code.createjs.com/1.0.0/easeljs.min.js"
  );
  const tweenLoading = useScriptTag(
    "https://code.createjs.com/1.0.0/tweenjs.min.js"
  );
  const scriptsLoading = easelLoading || tweenLoading;

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

  console.log(loading, scriptsLoading);

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
          !scriptsLoading && (
            <FullScreenCenter>
              <EaselCanvas width={canvasSize} height={canvasSize}>
                {visibleLayers.map((layer) => (
                  <EaselBitmap
                    key={layer.id}
                    src={getBestImageUrlForLayer(layer)}
                    zIndex={layer.zone.depth}
                  />
                ))}
              </EaselCanvas>
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
        opacity={(loading || scriptsLoading) && loadingDelayHasPassed ? 1 : 0}
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

function useScriptTag(src) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const existingScript = document.querySelector(
      `script[src=${CSS.escape(src)}]`
    );
    if (existingScript) {
      setLoading(false);
      return;
    }

    let canceled = false;
    const script = document.createElement("script");
    script.onload = () => {
      if (!canceled) {
        setLoading(false);
      }
    };
    script.src = src;
    document.body.appendChild(script);

    return () => {
      canceled = true;
      setLoading(true);
    };
  }, [src, setLoading]);

  return loading;
}

const EaselContext = React.createContext({
  stage: null,
  addResizeListener: () => {},
  removeResizeListener: () => {},
});

function EaselCanvas({ children, width, height }) {
  const [stage, setStage] = React.useState(null);
  const resizeListenersRef = React.useRef([]);
  const canvasRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const stage = new window.createjs.Stage(canvasRef.current);
    setStage(stage);

    function onTick(event) {
      stage.update(event);
    }

    window.createjs.Ticker.timingMode = window.createjs.Ticker.RAF;
    window.createjs.Ticker.on("tick", onTick);

    return () => window.createjs.Ticker.off("tick", onTick);
  }, []);

  const addChild = React.useCallback(
    (child, zIndex, { afterFirstDraw = null } = {}) => {
      // Save this child's z-index for future sorting.
      child.DTI_zIndex = zIndex;
      // Add the child, then slot it into the right place in the order.
      stage.addChild(child);
      stage.sortChildren((a, b) => a.DTI_zIndex - b.DTI_zIndex);
      // Then update in bulk!
      stage.update();
      if (afterFirstDraw) {
        stage.on("drawend", afterFirstDraw, null, true);
      }
    },
    [stage]
  );

  const removeChild = React.useCallback(
    (child) => {
      stage.removeChild(child);
      stage.update();
    },
    [stage]
  );

  const addResizeListener = React.useCallback((handler) => {
    resizeListenersRef.current.push(handler);
  }, []);
  const removeResizeListener = React.useCallback((handler) => {
    resizeListenersRef.current = resizeListenersRef.current.filter(
      (h) => h !== handler
    );
  }, []);

  // When the canvas resizes, resize all the layers, then a single bulk update.
  React.useEffect(() => {
    for (const handler of resizeListenersRef.current) {
      handler();
    }
    if (stage) {
      stage.update();
    }
  }, [stage, width, height]);

  // Set the canvas's internal dimensions to be higher, if the device has high
  // DPI like retina. But we'll keep the layout width/height as expected!
  const internalWidth = width * window.devicePixelRatio;
  const internalHeight = height * window.devicePixelRatio;

  return (
    <EaselContext.Provider
      value={{
        width: internalWidth,
        height: internalHeight,
        addChild,
        removeChild,
        addResizeListener,
        removeResizeListener,
        stage, // Not used, but available for debugging.
      }}
    >
      <canvas
        ref={canvasRef}
        width={internalWidth}
        height={internalHeight}
        style={{
          width: width + "px",
          height: height + "px",
        }}
      />
      {stage && children}
    </EaselContext.Provider>
  );
}

function EaselBitmap({ src, zIndex }) {
  const {
    width,
    height,
    addChild,
    removeChild,
    addResizeListener,
    removeResizeListener,
  } = React.useContext(EaselContext);

  React.useEffect(() => {
    let image;
    let bitmap;
    let tween;

    function setBitmapSize() {
      bitmap.scaleX = width / image.width;
      bitmap.scaleY = height / image.height;
    }

    async function addBitmap() {
      image = await loadImage(src);
      bitmap = new window.createjs.Bitmap(image);

      // We're gonna fade in! Wait for the first frame to draw, to make the
      // timing smooth, but yeah here we go!
      bitmap.alpha = 0;
      tween = window.createjs.Tween.get(bitmap, { paused: true }).to(
        { alpha: 1 },
        200
      );
      const startFadeIn = () => {
        // NOTE: You must cache bitmaps to apply filters to them, and caching
        //       doesn't work until the first draw.
        bitmap.cache(0, 0, image.width, image.height);
        tween.paused = false;
      };

      setBitmapSize();
      addChild(bitmap, zIndex, { afterFirstDraw: startFadeIn });
      addResizeListener(setBitmapSize);
    }

    function removeBitmap() {
      removeResizeListener(setBitmapSize);
      removeChild(bitmap);
    }

    addBitmap();

    return () => {
      if (bitmap) {
        // Reverse the fade-in into a fade-out, then remove the bitmap.
        tween.reversed = true;
        tween.setPosition(0);
        tween.paused = false;
        tween.on("complete", removeBitmap, null, true);
      }
    };
  }, [
    src,
    zIndex,
    width,
    height,
    addChild,
    removeChild,
    addResizeListener,
    removeResizeListener,
  ]);

  return null;
}

function getBestImageUrlForLayer(layer) {
  if (layer.svgUrl) {
    return `/api/assetProxy?url=${encodeURIComponent(layer.svgUrl)}`;
  } else {
    return layer.imageUrl;
  }
}

function loadImage(url) {
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = url;
  });
  promise.cancel = () => {
    image.src = "";
  };
  return promise;
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
