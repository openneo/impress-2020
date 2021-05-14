import React from "react";
import { Box } from "@chakra-ui/react";
import gql from "graphql-tag";

import getVisibleLayers, {
  petAppearanceFragmentForGetVisibleLayers,
  itemAppearanceFragmentForGetVisibleLayers,
} from "./getVisibleLayers";

function OutfitThumbnail({ petAppearance, itemAppearances, ...props }) {
  return (
    <Box
      as="img"
      src={buildOutfitThumbnailUrl(petAppearance, itemAppearances)}
      {...props}
    />
  );
}

function buildOutfitThumbnailUrl(petAppearance, itemAppearances) {
  const size = getOutfitThumbnailRenderSize();
  const visibleLayers = getVisibleLayers(petAppearance, itemAppearances);
  const layerUrls = visibleLayers.map(
    (layer) => layer.svgUrl || layer.imageUrl
  );

  return `/api/outfitImage?size=${size}&layerUrls=${layerUrls.join(",")}`;
}

/**
 * getOutfitThumbnailRenderSize returns the right image size to render at
 * 150x150, for the current device.
 *
 * On high-DPI devices, we'll download a 300x300 image to render at 150x150
 * scale. On standard-DPI devices, we'll download a 150x150 image, to save
 * bandwidth.
 */
export function getOutfitThumbnailRenderSize() {
  if (window.devicePixelRatio > 1) {
    return 300;
  } else {
    return 150;
  }
}

// NOTE: The query must include a `$size: LayerImageSize` parameter, probably
//       with the return value of `getOutfitThumbnailRenderSize`!
export const outfitThumbnailFragment = gql`
  fragment OutfitThumbnailFragment on Outfit {
    petAppearance {
      id
      layers {
        id
        svgUrl
        imageUrl(size: $size)
      }
      species {
        id
        name
      }
      color {
        id
        name
      }
      ...PetAppearanceForGetVisibleLayers
    }
    itemAppearances {
      id
      layers {
        id
        svgUrl
        imageUrl(size: $size)
      }
      ...ItemAppearanceForGetVisibleLayers
    }
  }
  ${petAppearanceFragmentForGetVisibleLayers}
  ${itemAppearanceFragmentForGetVisibleLayers}
`;

export default OutfitThumbnail;
