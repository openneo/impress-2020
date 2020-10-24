import React from "react";
import { Badge, Box, Center, Wrap } from "@chakra-ui/core";
import { EmailIcon } from "@chakra-ui/icons";
import gql from "graphql-tag";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2 } from "./util";
import ItemCard, {
  ItemBadgeList,
  ItemCardList,
  NcBadge,
  NpBadge,
  YouOwnThisBadge,
  YouWantThisBadge,
  ZoneBadgeList,
} from "./components/ItemCard";
import useCurrentUser from "./components/useCurrentUser";
import WIPCallout from "./components/WIPCallout";

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
          contactNeopetsUsername

          itemsTheyOwn {
            id
            isNc
            name
            thumbnailUrl
            allOccupiedZones {
              id
              label @client
            }
          }

          itemsTheyWant {
            id
            isNc
            name
            thumbnailUrl
            allOccupiedZones {
              id
              label @client
            }
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

  const itemIdsYouOwn = new Set(
    data.currentUser?.itemsTheyOwn.map((i) => i.id) || []
  );
  const itemIdsYouWant = new Set(
    data.currentUser?.itemsTheyWant.map((i) => i.id) || []
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
      <Box float="right">
        <WIPCallout details="These lists are simplified and read-only for now. Full power coming soon!" />
      </Box>
      <Heading1>
        {isCurrentUser ? "Your items" : `${data.user.username}'s items`}
      </Heading1>
      {data.user.contactNeopetsUsername && (
        <Wrap spacing="2" opacity="0.7">
          <Badge
            as="a"
            href={`http://www.neopets.com/userlookup.phtml?user=${data.user.contactNeopetsUsername}`}
            display="inline-flex"
            alignItems="center"
          >
            <NeopetsStarIcon marginRight="1" />
            {data.user.contactNeopetsUsername}
          </Badge>
          <Badge
            as="a"
            href={`http://www.neopets.com/neomessages.phtml?type=send&recipient=${data.user.contactNeopetsUsername}`}
            display="inline-flex"
            alignItems="center"
          >
            <EmailIcon marginRight="1" />
            Neomail
          </Badge>
        </Wrap>
      )}
      <Heading2 marginTop="4" marginBottom="6">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading2>
      <ItemCardList>
        {sortedItemsTheyOwn.map((item) => {
          return (
            <ItemCard
              key={item.id}
              item={item}
              badges={
                <ItemBadgeList>
                  {item.isNc ? <NcBadge /> : <NpBadge />}
                  {showYouWantThisBadge(item) && <YouWantThisBadge />}
                  <ZoneBadgeList
                    zones={item.allOccupiedZones}
                    variant="occupies"
                  />
                </ItemBadgeList>
              }
            />
          );
        })}
      </ItemCardList>

      <Heading2 marginBottom="6" marginTop="8">
        {isCurrentUser ? "Items you want" : `Items ${data.user.username} wants`}
      </Heading2>
      <ItemCardList>
        {sortedItemsTheyWant.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            badges={
              <ItemBadgeList>
                {item.isNc ? <NcBadge /> : <NpBadge />}
                {showYouOwnThisBadge(item) && <YouOwnThisBadge />}
                <ZoneBadgeList
                  zones={item.allOccupiedZones}
                  variant="occupies"
                />
              </ItemBadgeList>
            }
          />
        ))}
      </ItemCardList>
    </Box>
  );
}

function NeopetsStarIcon(props) {
  // Converted from the Neopets favicon with https://www.vectorizer.io/.
  return (
    <Box {...props}>
      <svg
        version="1.0"
        xmlns="http://www.w3.org/2000/svg"
        width="1.2em"
        height="1.2em"
        viewBox="0 0 160 160"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          fill="currentColor"
          fill-rule="evenodd"
          d="M85 129 L60 108 40 119 C11 135,7 132,24 108 L39 86 23 68 L6 50 32 50 L58 50 73 29 L88 8 94 29 L101 50 128 50 L155 50 131 68 L107 86 113 118 C121 155,118 156,85 129 "
        />
      </svg>
    </Box>
  );
}

export default UserItemsPage;
