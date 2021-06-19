import React from "react";
import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Center,
  Flex,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  ArrowForwardIcon,
  ChevronRightIcon,
  EmailIcon,
} from "@chakra-ui/icons";
import { Heading1, MajorErrorMessage, usePageTitle } from "./util";
import { gql, useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { HashLink } from "react-router-hash-link";

import HangerSpinner from "./components/HangerSpinner";
import MarkdownAndSafeHTML from "./components/MarkdownAndSafeHTML";
import ItemCard from "./components/ItemCard";
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
            contactNeopetsUsername
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

  const closetList = data?.closetList;

  usePageTitle(closetList?.name);

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
      <Heading1>{closetList.name}</Heading1>
      <Wrap spacing="2" opacity="0.7">
        {closetList.creator?.contactNeopetsUsername && (
          <WrapItem>
            <Badge
              as="a"
              href={`http://www.neopets.com/userlookup.phtml?user=${closetList.creator.contactNeopetsUsername}`}
              display="flex"
              alignItems="center"
            >
              <NeopetsStarIcon marginRight="1" />
              {closetList.creator.contactNeopetsUsername}
            </Badge>
          </WrapItem>
        )}
        {closetList.creator?.contactNeopetsUsername && (
          <WrapItem>
            <Badge
              as="a"
              href={`http://www.neopets.com/neomessages.phtml?type=send&recipient=${closetList.creator.contactNeopetsUsername}`}
              display="flex"
              alignItems="center"
            >
              <EmailIcon marginRight="1" />
              Neomail
            </Badge>
          </WrapItem>
        )}
      </Wrap>
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

export function ClosetListContents({
  closetList,
  isCurrentUser,
  maxNumItemsToShow = null,
}) {
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

  let itemsToShow = sortedItems;
  if (maxNumItemsToShow != null) {
    itemsToShow = itemsToShow.slice(0, maxNumItemsToShow);
  }

  const numMoreItems = Math.max(sortedItems.length - itemsToShow.length, 0);

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
      {itemsToShow.length > 0 ? (
        <Wrap spacing="4" justify="center">
          {itemsToShow.map((item) => (
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
      {numMoreItems > 0 && (
        <Box
          as={Link}
          to={buildClosetListPath(closetList)}
          display="flex"
          width="100%"
          alignItems="center"
          justifyContent="center"
          marginTop="6"
          fontStyle="italic"
          textAlign="center"
          role="group"
        >
          <Flex
            align="center"
            borderBottom="1px solid transparent"
            _groupHover={{ borderBottomColor: "currentColor" }}
            _groupFocus={{ borderBottomColor: "currentColor" }}
          >
            <Box>Show {numMoreItems} more items</Box>
            <Box width="1" />
            <ArrowForwardIcon />
          </Flex>
        </Box>
      )}
    </Box>
  );
}

export function buildClosetListPath(closetList) {
  let ownsOrWants;
  if (closetList.ownsOrWantsItems === "OWNS") {
    ownsOrWants = "owns";
  } else if (closetList.ownsOrWantsItems === "WANTS") {
    ownsOrWants = "wants";
  } else {
    throw new Error(
      `unexpected ownsOrWantsItems value: ${closetList.ownsOrWantsItems}`
    );
  }

  return `/user/${closetList.creator.id}/lists/${ownsOrWants}/${closetList.id}`;
}

export function NeopetsStarIcon(props) {
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

export default UserItemListPage;
