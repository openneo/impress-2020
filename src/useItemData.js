import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";

import { ITEMS } from "./data";

function useItemData(itemIds) {
  const { loading, error, data } = useQuery(
    gql`
      query($itemIds: [ID!]!) {
        items(ids: $itemIds) {
          id
          name
          thumbnailUrl
        }
      }
    `,
    { variables: { itemIds } }
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
