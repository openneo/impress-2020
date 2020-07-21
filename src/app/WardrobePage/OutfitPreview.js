import React from "react";
import { css, cx } from "emotion";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { Box, Flex, Text } from "@chakra-ui/core";
import { WarningIcon } from "@chakra-ui/icons";

import HangerSpinner from "../components/HangerSpinner";
import useOutfitAppearance from "./useOutfitAppearance";

/**
 * OutfitPreview renders the actual image layers for the outfit we're viewing!
 */
function OutfitPreview({ outfitState }) {
  const {
    loading: loading1,
    error: error1,
    visibleLayers,
  } = useOutfitAppearance(outfitState);

  const { loading: loading2, error: error2, loadedLayers } = usePreloadLayers(
    visibleLayers
  );

  if (error1 || error2) {
    return (
      <FullScreenCenter>
        <Text color="gray.50" d="flex" alignItems="center">
          <WarningIcon />
          <Box width={2} />
          Could not load preview. Try again?
        </Text>
      </FullScreenCenter>
    );
  }

  return (
    <OutfitLayers
      loading={loading1 || loading2}
      visibleLayers={loadedLayers}
      doAnimations
    />
  );
}

/**
 * OutfitLayers is the raw UI component for rendering outfit layers. It's
 * used both in the main outfit preview, and in other minor UIs!
 */
export function OutfitLayers({ loading, visibleLayers, doAnimations = false }) {
  return (
    <Box pos="relative" height="100%" width="100%">
      <TransitionGroup enter={false} exit={doAnimations}>
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
            <FullScreenCenter>
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
                  doAnimations && "do-animations"
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
      <Box
        // This is similar to our Delay util component, but Delay disappears
        // immediately on load, whereas we want this to fade out smoothly.
        opacity={loading ? 1 : 0}
        transition={`opacity 0.2s ${loading ? "0.5s" : "0s"}`}
      >
        <FullScreenCenter>
          <Box
            width="100%"
            height="100%"
            backgroundColor="gray.900"
            opacity="0.8"
          />
        </FullScreenCenter>
        <FullScreenCenter>
          <HangerSpinner color="green.300" boxSize="48px" />
        </FullScreenCenter>
      </Box>
    </Box>
  );
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
    image.onload = () => resolve();
    image.onerror = () => reject();
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
function usePreloadLayers(layers) {
  const [error, setError] = React.useState(null);
  const [loadedLayers, setLoadedLayers] = React.useState([]);

  React.useEffect(() => {
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
  }, [layers]);

  // NOTE: This condition would need to change if we started loading one at a
  // time, or if the error case would need to show a partial state!
  const loading = loadedLayers !== layers;

  return { loading, error, loadedLayers };
}

export default OutfitPreview;
