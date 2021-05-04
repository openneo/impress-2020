import React from "react";
import { useToast } from "@chakra-ui/react";
import { loadable } from "../util";

import ItemsAndSearchPanels from "./ItemsAndSearchPanels";
import SupportOnly from "./support/SupportOnly";
import useOutfitSaving from "./useOutfitSaving";
import useOutfitState, { OutfitStateContext } from "./useOutfitState";
import { usePageTitle } from "../util";
import WardrobePageLayout from "./WardrobePageLayout";
import WardrobePreviewAndControls from "./WardrobePreviewAndControls";

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

  // We manage outfit saving up here, rather than at the point of the UI where
  // "Saving" indicators appear. That way, auto-saving still happens even when
  // the indicator isn't on the page, e.g. when searching.
  const outfitSaving = useOutfitSaving(outfitState, dispatchToOutfit);

  usePageTitle(outfitState.name || "Untitled outfit");

  // TODO: I haven't found a great place for this error UI yet, and this case
  // isn't very common, so this lil toast notification seems good enough!
  React.useEffect(() => {
    if (error) {
      console.error(error);
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
        previewAndControls={
          <WardrobePreviewAndControls
            isLoading={loading}
            outfitState={outfitState}
            dispatchToOutfit={dispatchToOutfit}
          />
        }
        itemsAndSearch={
          <ItemsAndSearchPanels
            loading={loading}
            outfitState={outfitState}
            outfitSaving={outfitSaving}
            dispatchToOutfit={dispatchToOutfit}
          />
        }
      />
    </OutfitStateContext.Provider>
  );
}

export default WardrobePage;
