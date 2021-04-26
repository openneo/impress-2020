import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

/**
 * useOutfitAppearance downloads the outfit's appearance data, and returns
 * visibleLayers for rendering.
 */
export default function useOutfitAppearance(outfitState) {
  const { wornItemIds, speciesId, colorId, pose, appearanceId } = outfitState;

  // We split this query out from the other one, so that we can HTTP cache it.
  //
  // While Apollo gives us fine-grained caching during the page session, we can
  // only HTTP a full query at a time.
  //
  // This is a minor optimization with respect to keeping the user's cache
  // populated with their favorite species/color combinations. Once we start
  // caching the items by body instead of species/color, this could make color
  // changes really snappy!
  //
  // The larger optimization is that this enables the CDN to edge-cache the
  // most popular species/color combinations, for very fast previews on the
  // HomePage. At time of writing, Vercel isn't actually edge-caching these, I
  // assume because our traffic isn't enough - so let's keep an eye on this!
  const { loading: loading1, error: error1, data: data1 } = useQuery(
    appearanceId == null
      ? gql`
          query OutfitPetAppearance(
            $speciesId: ID!
            $colorId: ID!
            $pose: Pose!
          ) {
            petAppearance(
              speciesId: $speciesId
              colorId: $colorId
              pose: $pose
            ) {
              ...PetAppearanceForOutfitPreview
            }
          }
          ${petAppearanceFragment}
        `
      : gql`
          query OutfitPetAppearanceById($appearanceId: ID!) {
            petAppearance: petAppearanceById(id: $appearanceId) {
              ...PetAppearanceForOutfitPreview
            }
          }
          ${petAppearanceFragment}
        `,
    {
      variables: {
        speciesId,
        colorId,
        pose,
        appearanceId,
      },
      skip:
        speciesId == null ||
        colorId == null ||
        (pose == null && appearanceId == null),
    }
  );

  const { loading: loading2, error: error2, data: data2 } = useQuery(
    gql`
      query OutfitItemsAppearance(
        $speciesId: ID!
        $colorId: ID!
        $wornItemIds: [ID!]!
      ) {
        items(ids: $wornItemIds) {
          id
          name # HACK: This is for HTML5 detection UI in OutfitControls!
          appearance: appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            ...ItemAppearanceForOutfitPreview
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    {
      variables: {
        speciesId,
        colorId,
        wornItemIds,
      },
      skip: speciesId == null || colorId == null || wornItemIds.length === 0,
    }
  );

  const petAppearance = data1?.petAppearance;
  const items = data2?.items;
  const itemAppearances = React.useMemo(
    () => (items || []).map((i) => i.appearance),
    [items]
  );
  const visibleLayers = React.useMemo(
    () => getVisibleLayers(petAppearance, itemAppearances),
    [petAppearance, itemAppearances]
  );

  const bodyId = petAppearance?.bodyId;

  return {
    loading: loading1 || loading2,
    error: error1 || error2,
    petAppearance,
    items: items || [],
    itemAppearances,
    visibleLayers,
    bodyId,
  };
}

export function getVisibleLayers(petAppearance, itemAppearances) {
  if (!petAppearance) {
    return [];
  }

  const validItemAppearances = itemAppearances.filter((a) => a);

  const petLayers = petAppearance.layers.map((l) => ({ ...l, source: "pet" }));

  const itemLayers = validItemAppearances
    .map((a) => a.layers)
    .flat()
    .map((l) => ({ ...l, source: "item" }));

  let allLayers = [...petLayers, ...itemLayers];

  const itemRestrictedZoneIds = new Set(
    validItemAppearances
      .map((a) => a.restrictedZones)
      .flat()
      .map((z) => z.id)
  );
  const petOccupiedZoneIds = new Set(petLayers.map((l) => l.zone.id));
  const petRestrictedZoneIds = new Set(
    petAppearance.restrictedZones.map((z) => z.id)
  );
  const petOccupiedOrRestrictedZoneIds = new Set([
    ...petOccupiedZoneIds,
    ...petRestrictedZoneIds,
  ]);

  const visibleLayers = allLayers.filter((layer) => {
    // When an item restricts a zone, it hides pet layers of the same zone.
    // We use this to e.g. make a hat hide a hair ruff.
    //
    // NOTE: Items' restricted layers also affect what items you can wear at
    //       the same time. We don't enforce anything about that here, and
    //       instead assume that the input by this point is valid!
    if (layer.source === "pet" && itemRestrictedZoneIds.has(layer.zone.id)) {
      return false;
    }

    // When a pet appearance restricts or occupies a zone, it makes items
    // that occupy the zone incompatible, but *only* if the item is
    // body-specific. We use this to disallow UCs from wearing certain
    // body-specific Biology Effects, Statics, etc, while still allowing
    // non-body-specific items in those zones! (I think this happens for some
    // Invisible pet stuff, too?)
    //
    // NOTE: This can result in both pet layers and items occupying the same
    //       zone, like Static! That's correct, and the item layer should be
    //       on top! (Here, we implement it by placing item layers second in
    //       the list, and depending on JS sort stability, and *then* depending
    //       on the UI to respect that ordering when rendering them by depth.
    //       Not great! 😅)
    //
    // TODO: Hiding the layer is the *old* behavior. Move this way deeper in
    //       the code to prevent these items from showing up in the first
    //       place!
    if (
      layer.source === "item" &&
      layer.bodyId !== "0" &&
      petOccupiedOrRestrictedZoneIds.has(layer.zone.id)
    ) {
      return false;
    }

    // A pet appearance can also restrict its own zones. The Wraith Uni is an
    // interesting example: it has a horn, but its zone restrictions hide it!
    if (layer.source === "pet" && petRestrictedZoneIds.has(layer.zone.id)) {
      return false;
    }

    return true;
  });
  visibleLayers.sort((a, b) => a.zone.depth - b.zone.depth);

  return visibleLayers;
}

export const itemAppearanceFragmentForGetVisibleLayers = gql`
  fragment ItemAppearanceForGetVisibleLayers on ItemAppearance {
    id
    layers {
      id
      zone {
        id
        depth @client
      }
    }
    restrictedZones {
      id
    }
  }
`;

export const appearanceLayerFragment = gql`
  fragment AppearanceLayerForOutfitPreview on AppearanceLayer {
    id
    svgUrl
    canvasMovieLibraryUrl
    imageUrl(size: SIZE_600)
    bodyId
    knownGlitches # For HTML5 & Known Glitches UI
    zone {
      id
      depth @client
      label @client
    }
  }
`;

export const appearanceLayerFragmentForSupport = gql`
  fragment AppearanceLayerForSupport on AppearanceLayer {
    id
    remoteId # HACK: This is for Support tools, but other views don't need it
    swfUrl # HACK: This is for Support tools, but other views don't need it
    zone {
      id
      label @client # HACK: This is for Support tools, but other views don't need it
    }
  }
`;

export const itemAppearanceFragment = gql`
  fragment ItemAppearanceForOutfitPreview on ItemAppearance {
    id
    layers {
      id
      ...AppearanceLayerForOutfitPreview
      ...AppearanceLayerForSupport # HACK: Most users don't need this!
    }
    ...ItemAppearanceForGetVisibleLayers
  }

  ${appearanceLayerFragment}
  ${appearanceLayerFragmentForSupport}
  ${itemAppearanceFragmentForGetVisibleLayers}
`;

export const petAppearanceFragmentForGetVisibleLayers = gql`
  fragment PetAppearanceForGetVisibleLayers on PetAppearance {
    id
    layers {
      id
      zone {
        id
        depth @client
      }
    }
    restrictedZones {
      id
    }
  }
`;

export const petAppearanceFragment = gql`
  fragment PetAppearanceForOutfitPreview on PetAppearance {
    id
    bodyId
    isGlitched # For Known Glitches UI
    color {
      id # For Known Glitches UI
    }
    layers {
      id
      ...AppearanceLayerForOutfitPreview
    }
    ...PetAppearanceForGetVisibleLayers
  }

  ${appearanceLayerFragment}
  ${petAppearanceFragmentForGetVisibleLayers}
`;
