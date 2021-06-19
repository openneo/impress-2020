import React from "react";
import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Center,
  Flex,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { Heading1, MajorErrorMessage } from "./util";
import { gql, useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { HashLink } from "react-router-hash-link";

import HangerSpinner from "./components/HangerSpinner";
import MarkdownAndSafeHTML from "./components/MarkdownAndSafeHTML";
import ItemCard from "./components/ItemCard";
import WIPCallout from "./components/WIPCallout";
import useCurrentUser from "./components/useCurrentUser";

function UserItemListPage() {
  const { listId } = useParams();
  const currentUser = useCurrentUser();

  const { loading, error, data } = useQuery(
    gql`
      query UserItemListPage($listId: ID!) {
        closetList(id: $listId) {
          id
          name
          description
          ownsOrWantsItems
          creator {
            id
            username
          }
          items {
            id
            isNc
            isPb
            name
            thumbnailUrl
            currentUserOwnsThis
            currentUserWantsThis
          }
        }
      }
    `,
    { variables: { listId }, context: { sendAuth: true } }
  );

  if (loading) {
    return (
      <Center>
        <HangerSpinner />
      </Center>
    );
  }

  if (error) {
    return <MajorErrorMessage error={error} variant="network" />;
  }

  const closetList = data?.closetList;
  if (!closetList) {
    return <MajorErrorMessage variant="not-found" />;
  }

  const { creator, ownsOrWantsItems } = closetList;

  // NOTE: `currentUser` should have resolved by now, because the GraphQL query
  //       sends authorization, which requires the current user to load first!
  const isCurrentUser = currentUser.id === creator.id;

  let linkBackText;
  let linkBackPath;
  if (ownsOrWantsItems === "OWNS") {
    linkBackText = `Items ${creator.username} owns`;
    linkBackPath = `/user/${creator.id}/lists#owned-items`;
  } else if (ownsOrWantsItems === "WANTS") {
    linkBackText = `Items ${creator.username} wants`;
    linkBackPath = `/user/${creator.id}/lists#wanted-items`;
  } else {
    throw new Error(`unexpected ownsOrWantsItems value: ${ownsOrWantsItems}`);
  }

  return (
    <Box>
      <Breadcrumb
        fontSize="sm"
        opacity="0.8"
        separator={<ChevronRightIcon marginTop="-2px" />}
      >
        <BreadcrumbItem>
          <BreadcrumbLink as={Link} to={`/user/${creator.id}/lists`}>
            {creator.username}'s lists
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem as={HashLink} to={linkBackPath}>
          <BreadcrumbLink>{linkBackText}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      <Box height="1" />
      <Flex wrap="wrap">
        <Heading1>{closetList.name}</Heading1>
        <WIPCallout
          marginLeft="auto"
          details="We're planning to make this the detail view for each list, and then your lists page will be a easy-to-scan summary!"
        />
      </Flex>
      <Box height="6" />
      {closetList.description && (
        <MarkdownAndSafeHTML>{closetList.description}</MarkdownAndSafeHTML>
      )}
      <ClosetListContents
        closetList={closetList}
        isCurrentUser={isCurrentUser}
      />
    </Box>
  );
}

function ClosetListContents({ closetList, isCurrentUser }) {
  const isTradeMatch = (item) =>
    !isCurrentUser &&
    ((closetList.ownsOrWantsItems === "OWNS" && item.currentUserWantsThis) ||
      (closetList.ownsOrWantsItems === "WANTS" && item.currentUserOwnsThis));

  const sortedItems = [...closetList.items].sort((a, b) => {
    // This is a cute sort hack. We sort first by, bringing trade matches to
    // the top, and then sorting by name _within_ those two groups.
    const aName = `${isTradeMatch(a) ? "000" : "999"} ${a.name}`;
    const bName = `${isTradeMatch(b) ? "000" : "999"} ${b.name}`;
    return aName.localeCompare(bName);
  });

  let tradeMatchingMode;
  if (isCurrentUser) {
    // On your own item list, it's not helpful to show your own trade matches!
    tradeMatchingMode = "hide-all";
  } else if (closetList.ownsOrWantsItems === "OWNS") {
    tradeMatchingMode = "offering";
  } else if (closetList.ownsOrWantsItems === "WANTS") {
    tradeMatchingMode = "seeking";
  } else {
    throw new Error(
      `unexpected ownsOrWantsItems value: ${closetList.ownsOrWantsItems}`
    );
  }

  return (
    <Box>
      {sortedItems.length > 0 ? (
        <Wrap spacing="4" justify="center">
          {sortedItems.map((item) => (
            <WrapItem key={item.id}>
              <ItemCard
                item={item}
                variant="grid"
                tradeMatchingMode={tradeMatchingMode}
              />
            </WrapItem>
          ))}
        </Wrap>
      ) : (
        <Box fontStyle="italic">This list is empty!</Box>
      )}
    </Box>
  );
}

export default UserItemListPage;
