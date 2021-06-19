import React from "react";
import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Center,
  Flex,
  HStack,
  Input,
  Textarea,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import {
  ArrowForwardIcon,
  CheckIcon,
  ChevronRightIcon,
  EditIcon,
  EmailIcon,
} from "@chakra-ui/icons";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import {
  List as VirtualizedList,
  AutoSizer,
  WindowScroller,
} from "react-virtualized";

import { Heading1, Heading3, MajorErrorMessage, usePageTitle } from "./util";
import HangerSpinner from "./components/HangerSpinner";
import MarkdownAndSafeHTML from "./components/MarkdownAndSafeHTML";
import ItemCard from "./components/ItemCard";
import useCurrentUser from "./components/useCurrentUser";
import useSupport from "./WardrobePage/support/useSupport";
import WIPCallout from "./components/WIPCallout";

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
      <ClosetList
        closetList={closetList}
        isCurrentUser={isCurrentUser}
        headingVariant="top-level"
      />
    </Box>
  );
}

export function ClosetList({
  closetList,
  isCurrentUser,
  headingVariant = "list-item",
  maxNumItemsToShow = null,
}) {
  const { isSupportUser, supportSecret } = useSupport();
  const toast = useToast();

  // When this mounts, scroll it into view if it matches the location hash.
  // This works around the fact that, while the browser tries to do this
  // natively on page load, the list might not be mounted yet!
  const anchorId = `list-${closetList.id}`;
  React.useEffect(() => {
    if (document.location.hash === "#" + anchorId) {
      document.getElementById(anchorId).scrollIntoView();
    }
  }, [anchorId]);

  const [
    sendSaveChangesMutation,
    { loading: loadingSaveChanges },
  ] = useMutation(
    gql`
      mutation ClosetList_Edit(
        $closetListId: ID!
        $name: String!
        $description: String!
        # Support users can edit any list, if they provide the secret. If you're
        # editing your own list, this will be empty, and that's okay.
        $supportSecret: String
      ) {
        editClosetList(
          closetListId: $closetListId
          name: $name
          description: $description
          supportSecret: $supportSecret
        ) {
          id
          name
          description
        }
      }
    `,
    { context: { sendAuth: true } }
  );

  const [isEditing, setIsEditing] = React.useState(false);
  const [editableName, setEditableName] = React.useState(closetList.name);
  const [editableDescription, setEditableDescription] = React.useState(
    closetList.description
  );
  const hasChanges =
    editableName !== closetList.name ||
    editableDescription !== closetList.description;
  const onSaveChanges = () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    sendSaveChangesMutation({
      variables: {
        closetListId: closetList.id,
        name: editableName,
        description: editableDescription,
        supportSecret,
      },
    })
      .then(() => {
        setIsEditing(false);
        toast({
          status: "success",
          title: "Changes saved!",
        });
      })
      .catch((err) => {
        console.error(err);
        toast({
          status: "error",
          title: "Sorry, we couldn't save this list 😖",
          description: "Check your connection and try again.",
        });
      });
  };

  const Heading = headingVariant === "top-level" ? Heading1 : Heading3;

  return (
    <Box id={anchorId}>
      <Flex align="center" wrap="wrap">
        {headingVariant !== "hidden" &&
          (isEditing ? (
            <Heading
              as={Input}
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              maxWidth="20ch"
              // Shift left by our own padding/border, for alignment with the
              // original title
              paddingX="0.75rem"
              marginLeft="calc(-0.75rem - 1px)"
              boxShadow="sm"
              lineHeight="1.2"
              // HACK: Idk, the height stuff is really getting away from me,
              //       this is close enough :/
              height="1.2em"
            />
          ) : (
            <Heading
              fontStyle={closetList.isDefaultList ? "italic" : "normal"}
              lineHeight="1.2" // to match Input
              paddingY="2px" // to account for Input border/padding
            >
              {closetList.isDefaultList || headingVariant === "top-level" ? (
                closetList.name
              ) : (
                <Box
                  as={Link}
                  to={buildClosetListPath(closetList)}
                  _hover={{ textDecoration: "underline" }}
                >
                  {closetList.name}
                </Box>
              )}
            </Heading>
          ))}
        <Box flex="1 0 auto" width="4" />
        {(isCurrentUser || isSupportUser) &&
          !closetList.isDefaultList &&
          (isEditing ? (
            <>
              <WIPCallout
                size="sm"
                details="To edit the items, head back to Classic DTI!"
                marginY="2"
              >
                WIP: Can only edit text for now!
              </WIPCallout>
              <Box width="4" />
              <HStack spacing="2" marginLeft="auto" marginY="1">
                <Button size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  display="flex"
                  align="center"
                  size="sm"
                  colorScheme="green"
                  onClick={onSaveChanges}
                  isLoading={loadingSaveChanges}
                >
                  <CheckIcon marginRight="1" />
                  Save changes
                </Button>
              </HStack>
            </>
          ) : (
            <Button
              display="flex"
              align="center"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <EditIcon marginRight="1" />
              Edit
            </Button>
          ))}
      </Flex>
      {headingVariant === "top-level" && (
        <Wrap spacing="2" opacity="0.7" marginBottom="2">
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
      )}
      <Box height="2" />
      {(closetList.description || isEditing) && (
        <Box marginBottom="2">
          {isEditing ? (
            <Textarea
              value={editableDescription}
              onChange={(e) => setEditableDescription(e.target.value)}
              placeholder="This is my list! I'm looking for…"
              // Shift left by our own padding/border, for alignment with the
              // original title
              paddingX="0.75rem"
              marginLeft="calc(-0.75rem - 1px)"
              boxShadow="sm"
            />
          ) : (
            <MarkdownAndSafeHTML>{closetList.description}</MarkdownAndSafeHTML>
          )}
        </Box>
      )}
      <ClosetListContents
        closetList={closetList}
        isCurrentUser={isCurrentUser}
        maxNumItemsToShow={maxNumItemsToShow}
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
        <ClosetItemList
          items={itemsToShow}
          tradeMatchingMode={tradeMatchingMode}
        />
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

// HACK: Measured by hand from <SquareItemCard />, plus 16px padding.
const ITEM_CARD_WIDTH = 112 + 16;
const ITEM_CARD_HEIGHT = 171 + 16;

function ClosetItemList({ items, tradeMatchingMode }) {
  const renderItem = (item) => (
    <ItemCard
      key={item.id}
      item={item}
      variant="grid"
      tradeMatchingMode={tradeMatchingMode}
    />
  );

  // For small lists, we don't bother to virtualize, because it slows down
  // scrolling! (This helps a lot on the lists index page.)
  if (items.length < 30) {
    return (
      <Wrap spacing="4" justify="center">
        {items.map((item) => (
          <WrapItem key={item.id}>{renderItem(item)}</WrapItem>
        ))}
      </Wrap>
    );
  }

  return (
    <WindowScroller>
      {({ height, isScrolling, onChildScroll, scrollTop, registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => {
            const numItemsPerRow = Math.floor(width / ITEM_CARD_WIDTH);
            const numRows = Math.ceil(items.length / numItemsPerRow);

            return (
              <div ref={registerChild}>
                <VirtualizedList
                  autoHeight
                  height={height}
                  width={width}
                  rowCount={numRows}
                  rowHeight={ITEM_CARD_HEIGHT}
                  rowRenderer={({ index: rowIndex, key, style }) => {
                    const firstItemIndex = rowIndex * numItemsPerRow;
                    const itemsForRow = items.slice(
                      firstItemIndex,
                      firstItemIndex + numItemsPerRow
                    );

                    return (
                      <HStack
                        key={key}
                        style={style}
                        spacing="4"
                        align="flex-top"
                        justify="center"
                        // We need to provide some extra space up top, so that
                        // the virtualized row (which has overflow: hidden)
                        // doesn't cut off overflowing effects like trade match
                        // shadows.
                        paddingTop="2"
                      >
                        {itemsForRow.map(renderItem)}
                      </HStack>
                    );
                  }}
                  isScrolling={isScrolling}
                  onScroll={onChildScroll}
                  scrollTop={scrollTop}
                />
              </div>
            );
          }}
        </AutoSizer>
      )}
    </WindowScroller>
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
