import React from "react";
import { css } from "emotion";
import { CSSTransition, TransitionGroup } from "react-transition-group";

import { Box, Flex, Icon, Image, Spinner, Text } from "@chakra-ui/core";

import { Delay } from "./util";
import useOutfitAppearance from "./useOutfitAppearance";

/**
 * OutfitPreview renders the actual image layers for the outfit we're viewing!
 */
function OutfitPreview({ outfitState }) {
  const { loading, error, visibleLayers } = useOutfitAppearance(outfitState);

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
    <Box pos="relative" height="100%" width="100%">
      <TransitionGroup>
        {visibleLayers.map((layer) => (
          // We manage the fade-in and fade-out separately! The fade-out
          // happens here, when the layer exits the DOM.
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
                // We manage the fade-in and fade-out separately! The fade-in
                // happens here, when the <Image> finishes preloading and
                // applies the src to the underlying <img>.
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
        <Delay ms={0}>
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

export default OutfitPreview;
