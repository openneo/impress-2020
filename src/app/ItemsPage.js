import React from "react";
import { Box, Wrap } from "@chakra-ui/core";
import gql from "graphql-tag";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1 } from "./util";
import ItemCard, {
  ItemBadgeList,
  NcBadge,
  NpBadge,
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

  return (
    <Box>
      <Heading1 marginBottom="8">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading1>
      <Wrap justify="center">
        {data.user.itemsTheyOwn.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
              </ItemBadgeList>
            }
          />
        ))}
      </Wrap>
    </Box>
  );
}

export default ItemsPage;
