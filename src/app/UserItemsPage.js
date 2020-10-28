import React from "react";
import { Badge, Box, Center, Wrap, VStack } from "@chakra-ui/core";
import { CheckIcon, EmailIcon, StarIcon } from "@chakra-ui/icons";
import gql from "graphql-tag";
import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2, Heading3 } from "./util";
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

          closetLists {
            id
            name
            ownsOrWantsItems
            isDefaultList
            items {
              id
              isNc
              name
              thumbnailUrl
              currentUserOwnsThis
              currentUserWantsThis
              allOccupiedZones {
                id
                label @client
              }
            }
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

  if (data.user == null) {
    return <Box color="red.400">User not found</Box>;
  }

  const listsOfOwnedItems = data.user.closetLists.filter(
    (l) => l.ownsOrWantsItems === "OWNS"
  );
  const listsOfWantedItems = data.user.closetLists.filter(
    (l) => l.ownsOrWantsItems === "WANTS"
  );

  // Sort default list to the end, then sort alphabetically. We use a similar
  // sort hack that we use for sorting items in ClosetList!
  listsOfOwnedItems.sort((a, b) => {
    const aName = `${a.isDefaultList ? "ZZZ" : "AAA"} ${a.name}`;
    const bName = `${b.isDefaultList ? "ZZZ" : "AAA"} ${b.name}`;
    return aName.localeCompare(bName);
  });
  listsOfWantedItems.sort((a, b) => {
    const aName = `${a.isDefaultList ? "ZZZ" : "AAA"} ${a.name}`;
    const bName = `${b.isDefaultList ? "ZZZ" : "AAA"} ${b.name}`;
    return aName.localeCompare(bName);
  });

  const allItemsTheyOwn = listsOfOwnedItems.map((l) => l.items).flat();
  const allItemsTheyWant = listsOfWantedItems.map((l) => l.items).flat();

  const itemsTheyOwnThatYouWant = allItemsTheyOwn.filter(
    (i) => i.currentUserWantsThis
  );
  const itemsTheyWantThatYouOwn = allItemsTheyWant.filter(
    (i) => i.currentUserOwnsThis
  );

  // It's important to de-duplicate these! Otherwise, if the same item appears
  // in multiple lists, we'll double-count it.
  const numItemsTheyOwnThatYouWant = new Set(
    itemsTheyOwnThatYouWant.map((i) => i.id)
  ).size;
  const numItemsTheyWantThatYouOwn = new Set(
    itemsTheyWantThatYouOwn.map((i) => i.id)
  ).size;

  return (
    <Box>
      <Box float="right">
        <WIPCallout details="These lists are simplified and read-only for now. Full power coming soon!" />
      </Box>
      <Heading1>
        {isCurrentUser ? "Your items" : `${data.user.username}'s items`}
      </Heading1>
      <Wrap spacing="2" opacity="0.7">
        {data.user.contactNeopetsUsername && (
          <Badge
            as="a"
            href={`http://www.neopets.com/userlookup.phtml?user=${data.user.contactNeopetsUsername}`}
            display="flex"
            alignItems="center"
          >
            <NeopetsStarIcon marginRight="1" />
            {data.user.contactNeopetsUsername}
          </Badge>
        )}
        {data.user.contactNeopetsUsername && (
          <Badge
            as="a"
            href={`http://www.neopets.com/neomessages.phtml?type=send&recipient=${data.user.contactNeopetsUsername}`}
            display="flex"
            alignItems="center"
          >
            <EmailIcon marginRight="1" />
            Neomail
          </Badge>
        )}
        {/* Usually I put "Own" before "Want", but this matches the natural
         * order on the page: the _matches_ for things you want are things
         * _this user_ owns, so they come first. I think it's also probably a
         * more natural train of thought: you come to someone's list _wanting_
         * something, and _then_ thinking about what you can offer. */}
        {!isCurrentUser && numItemsTheyOwnThatYouWant > 0 && (
          <Badge
            as="a"
            href="#owned-items"
            colorScheme="blue"
            display="flex"
            alignItems="center"
          >
            <StarIcon marginRight="1" />
            {numItemsTheyOwnThatYouWant > 1
              ? `${numItemsTheyOwnThatYouWant} items you want`
              : "1 item you want"}
          </Badge>
        )}
        {!isCurrentUser && numItemsTheyWantThatYouOwn > 0 && (
          <Badge
            as="a"
            href="#wanted-items"
            colorScheme="green"
            display="flex"
            alignItems="center"
          >
            <CheckIcon marginRight="1" />
            {numItemsTheyWantThatYouOwn > 1
              ? `${numItemsTheyWantThatYouOwn} items you own`
              : "1 item you own"}
          </Badge>
        )}
      </Wrap>
      <Heading2 id="owned-items" marginTop="4" marginBottom="2">
        {isCurrentUser ? "Items you own" : `Items ${data.user.username} owns`}
      </Heading2>
      <VStack spacing="8" alignItems="stretch">
        {listsOfOwnedItems.map((closetList) => (
          <ClosetList
            key={closetList.id}
            closetList={closetList}
            isCurrentUser={isCurrentUser}
            showHeading={listsOfOwnedItems.length > 1}
          />
        ))}
      </VStack>

      <Heading2 id="wanted-items" marginTop="10" marginBottom="2">
        {isCurrentUser ? "Items you want" : `Items ${data.user.username} wants`}
      </Heading2>
      <VStack spacing="4" alignItems="stretch">
        {listsOfWantedItems.map((closetList) => (
          <ClosetList
            key={closetList.id}
            closetList={closetList}
            isCurrentUser={isCurrentUser}
            showHeading={listsOfWantedItems.length > 1}
          />
        ))}
      </VStack>
    </Box>
  );
}

function ClosetList({ closetList, isCurrentUser, showHeading }) {
  const hasYouWantThisBadge = (item) =>
    !isCurrentUser &&
    closetList.ownsOrWantsItems === "OWNS" &&
    item.currentUserWantsThis;
  const hasYouOwnThisBadge = (item) =>
    !isCurrentUser &&
    closetList.ownsOrWantsItems === "WANTS" &&
    item.currentUserOwnsThis;
  const hasAnyTradeBadge = (item) =>
    hasYouOwnThisBadge(item) || hasYouWantThisBadge(item);

  const sortedItems = [...closetList.items].sort((a, b) => {
    // This is a cute sort hack. We sort first by, bringing "You own/want
    // this!" to the top, and then sorting by name _within_ those two groups.
    const aName = `${hasAnyTradeBadge(a) ? "000" : "999"} ${a.name}`;
    const bName = `${hasAnyTradeBadge(b) ? "000" : "999"} ${b.name}`;
    return aName.localeCompare(bName);
  });

  return (
    <Box>
      {showHeading && (
        <Heading3
          marginBottom="2"
          fontStyle={closetList.isDefaultList ? "italic" : "normal"}
        >
          {closetList.name}
        </Heading3>
      )}
      {sortedItems.length > 0 ? (
        <ItemCardList>
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              badges={
                <ItemBadgeList>
                  {item.isNc ? <NcBadge /> : <NpBadge />}
                  {hasYouOwnThisBadge(item) && <YouOwnThisBadge />}
                  {hasYouWantThisBadge(item) && <YouWantThisBadge />}
                  <ZoneBadgeList
                    zones={item.allOccupiedZones}
                    variant="occupies"
                  />
                </ItemBadgeList>
              }
            />
          ))}
        </ItemCardList>
      ) : (
        <Box fontStyle="italic">This list is empty!</Box>
      )}
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
