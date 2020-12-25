import React from "react";
import { Box, Grid } from "@chakra-ui/react";

function WardrobePageLayout({ preview, controls, itemsAndSearch }) {
  return (
    <Box
      position="absolute"
      top="0"
      bottom="0"
      left="0"
      right="0"
      // Create a stacking context, so that our drawers and modals don't fight
      // with the z-indexes in here!
      zIndex="0"
    >
      <Grid
        templateAreas={{
          base: `"previewAndControls"
                 "itemsAndSearch"`,
          lg: `"previewAndControls itemsAndSearch"`,
        }}
        templateRows={{
          base: "minmax(100px, 45%) minmax(300px, 55%)",
          lg: "100%",
        }}
        templateColumns={{
          base: "100%",
          lg: "50% 50%",
        }}
        height="100%"
        width="100%"
      >
        <Box gridArea="previewAndControls" bg="gray.900" pos="relative">
          <Box position="absolute" top="0" bottom="0" left="0" right="0">
            {preview}
          </Box>
          <Box position="absolute" top="0" bottom="0" left="0" right="0">
            {controls}
          </Box>
        </Box>
        <Box gridArea="itemsAndSearch">{itemsAndSearch}</Box>
      </Grid>
    </Box>
  );
}

export default WardrobePageLayout;
