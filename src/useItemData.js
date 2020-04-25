import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";

function useItemData(itemIds, speciesId, colorId) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!, $speciesId: ID!, $colorId: ID!) {
        items(ids: $itemIds) {
          id
          name
          thumbnailUrl

          # This is used to group items by zone, and to detect conflicts when
          # wearing a new item.
          appearanceOn(speciesId: $speciesId, colorId: $colorId) {
            layers {
              zone {
                id
                label
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
    itemsById[item.id] = item;
  }

  return { loading, error, itemsById };
}

export default useItemData;
