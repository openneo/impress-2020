import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";

import { ITEMS } from "./data";

function useItemData(itemIds, speciesId, colorId) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $itemIds) {
          id
          name
          thumbnailUrl

          # This is used for wearItem actions, to resolve conflicts. We don't
          # use it directly; we just expect it to be in the cache!
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              zone {
                id
              }
            }
          }
        }
      }
    `,
    { variables: { itemIds, speciesId, colorId } }
  );

  const items = (data && data.items) || [];
  const itemsById = {};
  for (const item of items) {
    const hardcodedItem = ITEMS.find((i) => i.id === item.id);
    itemsById[item.id] = {
      ...hardcodedItem,
      ...item,
    };
  }

  return { loading, error, itemsById };
}

export default useItemData;
