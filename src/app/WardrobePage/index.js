import React from "react";
import { useToast } from "@chakra-ui/react";
import loadable from "@loadable/component";

import ItemsAndSearchPanels from "./ItemsAndSearchPanels";
import OutfitPreview from "../components/OutfitPreview";
import SupportOnly from "./support/SupportOnly";
import useOutfitState, { OutfitStateContext } from "./useOutfitState";
import { usePageTitle } from "../util";
import WardrobePageLayout from "./WardrobePageLayout";

const OutfitControls = loadable(() =>
  import(/* webpackPreload: true */ "./OutfitControls")
);
const WardrobeDevHacks = loadable(() => import("./WardrobeDevHacks"));

/**
 * WardrobePage is the most fun page on the site - it's where you create
 * outfits!
 *
 * This page has two sections: the OutfitPreview, where we show the outfit as a
 * big image; and the ItemsAndSearchPanels, which let you manage which items
 * are in the outfit and find new ones.
 *
 * This component manages shared outfit state, and the fullscreen responsive
 * page layout.
 */
function WardrobePage() {
  const toast = useToast();
  const { loading, error, outfitState, dispatchToOutfit } = useOutfitState();

  // Whether the current outfit preview has animations. Determines whether we
  // show the play/pause button.
  const [hasAnimations, setHasAnimations] = React.useState(false);

  usePageTitle(outfitState.name || "Untitled outfit");

  // TODO: I haven't found a great place for this error UI yet, and this case
  // isn't very common, so this lil toast notification seems good enough!
  React.useEffect(() => {
    if (error) {
      console.log(error);
      toast({
        title: "We couldn't load this outfit 😖",
        description: "Please reload the page to try again. Sorry!",
        status: "error",
        isClosable: true,
        duration: 999999999,
      });
    }
  }, [error, toast]);

  // NOTE: Most components pass around outfitState directly, to make the data
  //       relationships more explicit... but there are some deep components
  //       that need it, where it's more useful and more performant to access
  //       via context.
  return (
    <OutfitStateContext.Provider value={outfitState}>
      <SupportOnly>
        <WardrobeDevHacks />
      </SupportOnly>
      <WardrobePageLayout
        preview={
          <OutfitPreview
            speciesId={outfitState.speciesId}
            colorId={outfitState.colorId}
            pose={outfitState.pose}
            appearanceId={outfitState.appearanceId}
            wornItemIds={outfitState.wornItemIds}
            onChangeHasAnimations={setHasAnimations}
          />
        }
        controls={
          <OutfitControls
            outfitState={outfitState}
            dispatchToOutfit={dispatchToOutfit}
            showAnimationControls={hasAnimations}
          />
        }
        itemsAndSearch={
          <ItemsAndSearchPanels
            loading={loading}
            outfitState={outfitState}
            dispatchToOutfit={dispatchToOutfit}
          />
        }
      />
    </OutfitStateContext.Provider>
  );
}

export default WardrobePage;
