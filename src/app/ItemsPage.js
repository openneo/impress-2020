import React from "react";
import { Box, Wrap } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1 } from "./util";
import ItemCard, {
  ItemBadgeList,
  ItemCardList,
  NcBadge,
  NpBadge,
  YouOwnThisBadge,
  YouWantThisBadge,
} from "./components/ItemCard";
import useCurrentUser from "./components/useCurrentUser";

function ItemsPage() {
  const { userId } = useParams();
  const currentUser = useCurrentUser();
  const isCurrentUser = currentUser.id === userId;

  const { loading, error, data } = useQuery(
    gql`
      query ItemsPage($userId: ID!) {
        user(id: $userId) {
          id
          username

          itemsTheyOwn {
            id
            isNc
            name
            thumbnailUrl
          }

          itemsTheyWant {
            id
            isNc
            name
            thumbnailUrl
          }
        }

        currentUser {
          itemsTheyOwn {
            id
          }

          itemsTheyWant {
            id
          }
        }
      }
    `,
    { variables: { userId } }
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <HangerSpinner />
      </Box>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const itemIdsYouOwn = new Set(data.currentUser.itemsTheyOwn.map((i) => i.id));
  const itemIdsYouWant = new Set(
    data.currentUser.itemsTheyWant.map((i) => i.id)
  );

  return (
    <Box>
      <Heading1 marginBottom="8">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading1>
      <ItemCardList>
        {data.user.itemsTheyOwn.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
                {
                  // This helps you compare your owns/wants to other users.
                  !isCurrentUser && itemIdsYouWant.has(item.id) && (
                    <YouWantThisBadge />
                  )
                }
              </ItemBadgeList>
            }
          />
        ))}
      </ItemCardList>

      <Heading1 marginBottom="8" marginTop="8">
        {isCurrentUser ? "Items you want" : `Items ${data.user.username} wants`}
      </Heading1>
      <ItemCardList>
        {data.user.itemsTheyWant.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
                {
                  // This helps you compare your owns/wants to other users.
                  !isCurrentUser && itemIdsYouOwn.has(item.id) && (
                    <YouOwnThisBadge />
                  )
                }
              </ItemBadgeList>
            }
          />
        ))}
      </ItemCardList>
    </Box>
  );
}

export default ItemsPage;
