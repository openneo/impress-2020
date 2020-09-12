import React from "react";
import { Box, Center } from "@chakra-ui/core";
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

function UserItemsPage() {
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
      <Center>
        <HangerSpinner />
      </Center>
    );
  }

  if (error) {
    return <Box color="red.400">{error.message}</Box>;
  }

  const itemIdsYouOwn = new Set(data.currentUser.itemsTheyOwn.map((i) => i.id));
  const itemIdsYouWant = new Set(
    data.currentUser.itemsTheyWant.map((i) => i.id)
  );

  // This helps you compare your owns/wants to other users! If they own
  // something, and you want it, we say "You want this!". And if they want
  // something, and you own it, we say "You own this!".
  const showYouOwnThisBadge = (item) =>
    !isCurrentUser && itemIdsYouOwn.has(item.id);
  const showYouWantThisBadge = (item) =>
    !isCurrentUser && itemIdsYouWant.has(item.id);

  const sortedItemsTheyOwn = [...data.user.itemsTheyOwn].sort((a, b) => {
    // This is a cute sort hack. We sort first by, bringing "You want this!" to
    // the top, and then sorting by name _within_ those two groups.
    const aName = `${showYouWantThisBadge(a) ? "000" : "999"} ${a.name}`;
    const bName = `${showYouWantThisBadge(b) ? "000" : "999"} ${b.name}`;
    return aName.localeCompare(bName);
  });

  const sortedItemsTheyWant = [...data.user.itemsTheyWant].sort((a, b) => {
    // This is a cute sort hack. We sort first by, bringing "You own this!" to
    // the top, and then sorting by name _within_ those two groups.
    const aName = `${showYouOwnThisBadge(a) ? "000" : "999"} ${a.name}`;
    const bName = `${showYouOwnThisBadge(b) ? "000" : "999"} ${b.name}`;
    return aName.localeCompare(bName);
  });

  return (
    <Box>
      <Heading1 marginBottom="6">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading1>
      <ItemCardList>
        {sortedItemsTheyOwn.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
                {showYouWantThisBadge(item) && <YouWantThisBadge />}
              </ItemBadgeList>
            }
          />
        ))}
      </ItemCardList>

      <Heading1 marginBottom="6" marginTop="8">
        {isCurrentUser ? "Items you want" : `Items ${data.user.username} wants`}
      </Heading1>
      <ItemCardList>
        {sortedItemsTheyWant.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
                {showYouOwnThisBadge(item) && <YouOwnThisBadge />}
              </ItemBadgeList>
            }
          />
        ))}
      </ItemCardList>
    </Box>
  );
}

export default UserItemsPage;
