import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";

/**
 * useOutfitAppearance downloads the outfit's appearance data, and returns
 * visibleLayers for rendering.
 */
export default function useOutfitAppearance(outfitState) {
  const {
    wornItemIds,
    speciesId,
    colorId,
    emotion,
    genderPresentation,
  } = outfitState;

  const { loading, error, data } = useQuery(
    gql`
      query(
        $wornItemIds: [ID!]!
        $speciesId: ID!
        $colorId: ID!
        $emotion: Emotion!
        $genderPresentation: GenderPresentation!
      ) {
        petAppearance(
          speciesId: $speciesId
          colorId: $colorId
          emotion: $emotion
          genderPresentation: $genderPresentation
        ) {
          ...PetAppearanceForOutfitPreview
        }

        items(ids: $wornItemIds) {
          id
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            ...ItemAppearanceForOutfitPreview
          }
        }
      }
      ${itemAppearanceFragment}
      ${petAppearanceFragment}
    `,
    {
      variables: {
        wornItemIds,
        speciesId,
        colorId,
        emotion,
        genderPresentation,
      },
    }
  );

  const itemAppearances = (data?.items || []).map((i) => i.appearanceOn);
  const visibleLayers = getVisibleLayers(data?.petAppearance, itemAppearances);

  return { loading, error, visibleLayers };
}

export function getVisibleLayers(petAppearance, itemAppearances) {
  if (!petAppearance) {
    return [];
  }

  const validItemAppearances = itemAppearances.filter((a) => a);

  const allAppearances = [petAppearance, ...validItemAppearances];
  let allLayers = allAppearances.map((a) => a.layers).flat();

  // Clean up our data a bit, by ensuring only one layer per zone. This
  // shouldn't happen in theory, but sometimes our database doesn't clean up
  // after itself correctly :(
  allLayers = allLayers.filter((l, i) => {
    return allLayers.findIndex((l2) => l2.zone.id === l.zone.id) === i;
  });

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
      svgUrl
      imageUrl(size: SIZE_600)
      zone {
        id
        depth
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
    layers {
      id
      svgUrl
      imageUrl(size: SIZE_600)
      zone {
        id
        depth
      }
    }
  }
`;
