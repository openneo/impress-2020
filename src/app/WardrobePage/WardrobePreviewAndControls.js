import React from "react";
import { Box, DarkMode } from "@chakra-ui/react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

import OutfitThumbnail, {
  outfitThumbnailFragment,
  getOutfitThumbnailRenderSize,
} from "../components/OutfitThumbnail";
import OutfitPreview from "../components/OutfitPreview";
import { loadable } from "../util";

const OutfitControls = loadable(() => import("./OutfitControls"));

function WardrobePreviewAndControls({
  isLoading,
  outfitState,
  dispatchToOutfit,
}) {
  // Whether the current outfit preview has animations. Determines whether we
  // show the play/pause button.
  const [hasAnimations, setHasAnimations] = React.useState(false);

  return (
    <>
      <Box position="absolute" top="0" bottom="0" left="0" right="0">
        <DarkMode>
          <OutfitPreview
            isLoading={isLoading}
            speciesId={outfitState.speciesId}
            colorId={outfitState.colorId}
            pose={outfitState.pose}
            appearanceId={outfitState.appearanceId}
            wornItemIds={outfitState.wornItemIds}
            onChangeHasAnimations={setHasAnimations}
            backdrop={<OutfitThumbnailIfCached outfitId={outfitState.id} />}
          />
        </DarkMode>
      </Box>
      <Box position="absolute" top="0" bottom="0" left="0" right="0">
        <OutfitControls
          outfitState={outfitState}
          dispatchToOutfit={dispatchToOutfit}
          showAnimationControls={hasAnimations}
        />
      </Box>
    </>
  );
}

/**
 * OutfitThumbnailIfCached will render an OutfitThumbnail as a placeholder for
 * the outfit preview... but only if we already have the data to generate the
 * thumbnail stored in our local Apollo GraphQL cache.
 *
 * This means that, when you come from the Your Outfits page, we can show the
 * outfit thumbnail instantly while everything else loads. But on direct
 * navigation, this does nothing, and we just wait for the preview to load in
 * like usual!
 *
 * We even use it as our "backdrop", so the thumbnail actually _always_ renders
 * if possible. This makes loading look even smoother, by letting individual
 * layers load in on top of the thumbnail.
 * TODO: Can this become a perf problem on WIP outfits?
 */
function OutfitThumbnailIfCached({ outfitId }) {
  const { data } = useQuery(
    gql`
      query OutfitThumbnailIfCached($outfitId: ID!, $size: LayerImageSize!) {
        outfit(id: $outfitId) {
          id
          ...OutfitThumbnailFragment
        }
      }
      ${outfitThumbnailFragment}
    `,
    {
      variables: {
        outfitId,
        // NOTE: This parameter is used inside `OutfitThumbnailFragment`!
        size: "SIZE_" + getOutfitThumbnailRenderSize(),
      },
      fetchPolicy: "cache-only",
    }
  );

  if (!data?.outfit) {
    return null;
  }

  return (
    <OutfitThumbnail
      petAppearance={data.outfit.petAppearance}
      itemAppearances={data.outfit.itemAppearances}
      alt=""
      objectFit="contain"
      width="100%"
      height="100%"
      filter="blur(2px)"
    />
  );
}

export default WardrobePreviewAndControls;
