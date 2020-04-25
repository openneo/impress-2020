import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";

import { itemAppearanceFragment } from "./OutfitPreview";

function useItemData(itemIds, speciesId, colorId) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $itemIds) {
          id
          name
          thumbnailUrl

          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            # This enables us to quickly show the item when the user clicks it!
            ...AppearanceForOutfitPreview

            # This is used to group items by zone, and to detect conflicts when
            # wearing a new item.
            layers {
              zone {
                id
                label
              }
            }
          }
        }
      }
      ${itemAppearanceFragment}
    `,
    { variables: { itemIds, speciesId, colorId } }
  );

  const items = (data && data.items) || [];
  const itemsById = {};
  for (const item of items) {
    itemsById[item.id] = item;
  }

  return { loading, error, itemsById };
}

export default useItemData;
