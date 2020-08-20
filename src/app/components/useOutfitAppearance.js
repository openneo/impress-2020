import React from "react";
import gql from "graphql-tag";
import { useQuery } from "@apollo/client";

/**
 * useOutfitAppearance downloads the outfit's appearance data, and returns
 * visibleLayers for rendering.
 */
export default function useOutfitAppearance(outfitState) {
  const { wornItemIds, speciesId, colorId, pose } = outfitState;

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
    gql`
      query OutfitPetAppearance($speciesId: ID!, $colorId: ID!, $pose: Pose!) {
        petAppearance(speciesId: $speciesId, colorId: $colorId, pose: $pose) {
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
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
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

  const itemAppearances = React.useMemo(
    () => (data2?.items || []).map((i) => i.appearanceOn),
    [data2]
  );
  const visibleLayers = React.useMemo(
    () => getVisibleLayers(data1?.petAppearance, itemAppearances),
    [data1, itemAppearances]
  );

  const bodyId = data1?.petAppearance?.bodyId;

  return {
    loading: loading1 || loading2,
    error: error1 || error2,
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

  const allRestrictedZoneIds = validItemAppearances
    .map((l) => l.restrictedZones)
    .flat()
    .map((z) => z.id);

  const visibleLayers = allLayers.filter(
    (l) => !allRestrictedZoneIds.includes(l.zone.id)
  );
  visibleLayers.sort((a, b) => a.zone.depth - b.zone.depth);

  return visibleLayers;
}

export const itemAppearanceFragment = gql`
  fragment ItemAppearanceForOutfitPreview on ItemAppearance {
    layers {
      id
      remoteId # HACK: This is for Support tools, but other views don't need it
      svgUrl
      imageUrl(size: SIZE_600)
      swfUrl # HACK: This is for Support tools, but other views don't need it
      bodyId
      zone {
        id
        depth @client
        label @client # HACK: This is for Support tools, but other views don't need it
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
      imageUrl(size: SIZE_600)
      zone {
        id
        depth @client
      }
    }
  }
`;
