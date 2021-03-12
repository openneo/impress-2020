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
      skip: speciesId == null || colorId == null || pose == null,
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

  const itemRestrictedZoneIds = validItemAppearances
    .map((a) => a.restrictedZones)
    .flat()
    .map((z) => z.id);
  const petRestrictedZoneIds = petAppearance.restrictedZones.map((z) => z.id);
  const allRestrictedZoneIds = new Set([
    ...itemRestrictedZoneIds,
    ...petRestrictedZoneIds,
  ]);

  const visibleLayers = allLayers.filter(
    (l) => !allRestrictedZoneIds.has(l.zone.id)
  );
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

export const itemAppearanceFragment = gql`
  fragment ItemAppearanceForOutfitPreview on ItemAppearance {
    id
    layers {
      id
      remoteId # HACK: This is for Support tools, but other views don't need it
      svgUrl
      canvasMovieLibraryUrl
      imageUrl(size: SIZE_600)
      swfUrl # HACK: This is for Support tools, but other views don't need it
      knownGlitches # HACK: This is for Support tools, but other views don't need it
      bodyId
      zone {
        label @client # HACK: This is for Support tools, but other views don't need it
      }
    }
    ...ItemAppearanceForGetVisibleLayers
  }

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
    layers {
      id
      svgUrl
      canvasMovieLibraryUrl
      imageUrl(size: SIZE_600)
    }
    ...PetAppearanceForGetVisibleLayers
  }

  ${petAppearanceFragmentForGetVisibleLayers}
`;
