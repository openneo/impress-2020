import React from "react";
import { ClassNames } from "@emotion/react";
import {
  Badge,
  Box,
  Center,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Wrap,
  WrapItem,
  VStack,
  useToast,
  Button,
  Textarea,
  HStack,
} from "@chakra-ui/react";
import {
  ArrowForwardIcon,
  CheckIcon,
  EditIcon,
  EmailIcon,
  SearchIcon,
  StarIcon,
} from "@chakra-ui/icons";
import gql from "graphql-tag";
import { Link, useHistory, useParams } from "react-router-dom";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client";

import HangerSpinner from "./components/HangerSpinner";
import { Heading1, Heading2, Heading3, usePageTitle } from "./util";
import MarkdownAndSafeHTML from "./components/MarkdownAndSafeHTML";
import SupportOnly from "./WardrobePage/support/SupportOnly";
import useSupport from "./WardrobePage/support/useSupport";
import useCurrentUser from "./components/useCurrentUser";
import WIPCallout from "./components/WIPCallout";
import { ClosetListContents, buildClosetListPath } from "./UserItemListPage";

const BadgeButton = React.forwardRef((props, ref) => (
  <Badge as="button" ref={ref} {...props} />
));

function UserItemsPage() {
  const { userId } = useParams();
  const currentUser = useCurrentUser();
  const isCurrentUser = currentUser.id === userId;

  const { loading, error, data } = useQuery(
    gql`
      query UserItemsPage($userId: ID!) {
        user(id: $userId) {
          id
          username
          contactNeopetsUsername

          closetLists {
            id
            name
            description
            ownsOrWantsItems
            isDefaultList
            items {
              id
              isNc
              isPb
              name
              thumbnailUrl
              currentUserOwnsThis
              currentUserWantsThis
            }
            creator {
              id
            }
          }
        }
      }
    `,
    { variables: { userId }, context: { sendAuth: true } }
  );

  let pageTitleText;
  if (isCurrentUser) {
    pageTitleText = "Your lists";
  } else if (data?.user) {
    pageTitleText = `${data?.user?.username}'s lists`;
  } else {
    pageTitleText = null;
  }
  usePageTitle(pageTitleText);

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

  // TODO: I'm not sure why, but apparently `data` is `undefined` in the user
  //       not found case, even though the server is clearly returning
  //       `{data: {user: null}}`? That's... weird, right? :/
  if (data?.user == null) {
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
    <ClassNames>
      {({ css }) => (
        <Box>
          <Flex align="center" wrap="wrap-reverse">
            <Box>
              <Heading1>{pageTitleText}</Heading1>
              <Wrap spacing="2" opacity="0.7">
                {data.user.contactNeopetsUsername && (
                  <WrapItem>
                    <Badge
                      as="a"
                      href={`http://www.neopets.com/userlookup.phtml?user=${data.user.contactNeopetsUsername}`}
                      display="flex"
                      alignItems="center"
                    >
                      <NeopetsStarIcon marginRight="1" />
                      {data.user.contactNeopetsUsername}
                    </Badge>
                  </WrapItem>
                )}
                {data.user.contactNeopetsUsername && (
                  <WrapItem>
                    <Badge
                      as="a"
                      href={`http://www.neopets.com/neomessages.phtml?type=send&recipient=${data.user.contactNeopetsUsername}`}
                      display="flex"
                      alignItems="center"
                    >
                      <EmailIcon marginRight="1" />
                      Neomail
                    </Badge>
                  </WrapItem>
                )}
                <SupportOnly>
                  <WrapItem>
                    <UserSupportMenu user={data.user}>
                      <MenuButton
                        as={BadgeButton}
                        display="flex"
                        alignItems="center"
                      >
                        <EditIcon marginRight="1" />
                        Support
                      </MenuButton>
                    </UserSupportMenu>
                  </WrapItem>
                </SupportOnly>
                {/* Usually I put "Own" before "Want", but this matches the natural
                 * order on the page: the _matches_ for things you want are things
                 * _this user_ owns, so they come first. I think it's also probably a
                 * more natural train of thought: you come to someone's list _wanting_
                 * something, and _then_ thinking about what you can offer. */}
                {!isCurrentUser && numItemsTheyOwnThatYouWant > 0 && (
                  <WrapItem>
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
                  </WrapItem>
                )}
                {!isCurrentUser && numItemsTheyWantThatYouOwn > 0 && (
                  <WrapItem>
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
                  </WrapItem>
                )}
              </Wrap>
            </Box>
            <Box flex="1 0 auto" width="2" />
            <Box marginBottom="1">
              <UserSearchForm />
            </Box>
          </Flex>

          <Box marginTop="4">
            <Heading2 id="owned-items" marginBottom="2">
              {isCurrentUser
                ? "Items you own"
                : `Items ${data.user.username} owns`}
            </Heading2>
            <VStack
              spacing="8"
              alignItems="stretch"
              className={css`
                clear: both;
              `}
            >
              {listsOfOwnedItems.map((closetList) => (
                <ClosetList
                  key={closetList.id}
                  closetList={closetList}
                  isCurrentUser={isCurrentUser}
                  showHeading={listsOfOwnedItems.length > 1}
                />
              ))}
            </VStack>
          </Box>

          <Heading2 id="wanted-items" marginTop="10" marginBottom="2">
            {isCurrentUser
              ? "Items you want"
              : `Items ${data.user.username} wants`}
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
      )}
    </ClassNames>
  );
}

function UserSearchForm() {
  const [query, setQuery] = React.useState("");

  const { isSupportUser, supportSecret } = useSupport();
  const history = useHistory();
  const toast = useToast();

  const [loadUserSearch, { loading: loading1 }] = useLazyQuery(
    gql`
      query UserSearchForm($name: String!) {
        userByName(name: $name) {
          id
          # Consider preloading UserItemsPage fields here, too?
        }
      }
    `,
    {
      onCompleted: (data) => {
        const user = data.userByName;
        if (!user) {
          toast({
            status: "warning",
            title: "We couldn't find that user!",
            description: "Check the spelling and try again?",
          });
          return;
        }

        history.push(`/user/${user.id}/lists`);
      },
      onError: (error) => {
        console.error(error);
        toast({
          status: "error",
          title: "Error loading user!",
          description: "Check your connection and try again?",
        });
      },
    }
  );

  const [loadUserByEmail, { loading: loading2 }] = useLazyQuery(
    gql`
      query UserSearchFormByEmail($email: String!, $supportSecret: String!) {
        userByEmail(email: $email, supportSecret: $supportSecret) {
          id
          # Consider preloading UserItemsPage fields here, too?
        }
      }
    `,
    {
      onCompleted: (data) => {
        const user = data.userByEmail;
        if (!user) {
          toast({
            status: "warning",
            title: "We couldn't find that email address!",
            description: "Check the spelling and try again?",
          });
          return;
        }

        history.push(`/user/${user.id}/items`);
      },
      onError: (error) => {
        console.error(error);
        toast({
          status: "error",
          title: "Error loading user by email!",
          description: "Check your connection and try again?",
        });
      },
    }
  );

  return (
    <Box
      as="form"
      onSubmit={(e) => {
        const isSupportOnlyEmailSearch =
          isSupportUser && query.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

        if (isSupportOnlyEmailSearch) {
          toast({
            status: "info",
            title: "Searching by email! (💖 Support-only)",
            description: "The email field is protected from most users.",
          });
          loadUserByEmail({ variables: { email: query, supportSecret } });
        } else {
          loadUserSearch({ variables: { name: query } });
        }

        e.preventDefault();
      }}
    >
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.400" />
        </InputLeftElement>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find another user…"
          borderRadius="full"
        />
        <InputRightElement>
          <IconButton
            type="submit"
            variant="ghost"
            icon={<ArrowForwardIcon />}
            aria-label="Search"
            isLoading={loading1 || loading2}
            minWidth="1.5rem"
            minHeight="1.5rem"
            width="1.5rem"
            height="1.5rem"
            borderRadius="full"
            opacity={query ? 1 : 0}
            transition="opacity 0.2s"
            aria-hidden={query ? "false" : "true"}
          />
        </InputRightElement>
      </InputGroup>
    </Box>
  );
}

function ClosetList({ closetList, isCurrentUser, showHeading }) {
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

  return (
    <Box id={anchorId}>
      <Flex align="center" wrap="wrap" marginBottom="2">
        {showHeading &&
          (isEditing ? (
            <Heading3
              as={Input}
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              maxWidth="20ch"
              // Shift left by our own padding/border, for alignment with the
              // original title
              paddingX="0.75rem"
              marginLeft="calc(-0.75rem - 1px)"
              boxShadow="sm"
            />
          ) : (
            <Heading3
              fontStyle={closetList.isDefaultList ? "italic" : "normal"}
              lineHeight="1.2" // to match Input
              paddingY="2px" // to account for Input border/padding
            >
              {closetList.isDefaultList ? (
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
            </Heading3>
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
      {closetList.description && (
        <Box marginBottom="2">
          {isEditing ? (
            <Textarea
              value={editableDescription}
              onChange={(e) => setEditableDescription(e.target.value)}
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
        maxNumItemsToShow={14}
      />
    </Box>
  );
}

function UserSupportMenu({ children, user }) {
  const { supportSecret } = useSupport();
  const toast = useToast();

  const { loading, error, data } = useQuery(
    gql`
      query UserSupportMenu($userId: ID!, $supportSecret: String!) {
        user(id: $userId) {
          id
          emailForSupportUsers(supportSecret: $supportSecret)
        }
      }
    `,
    {
      variables: {
        userId: user.id,
        supportSecret,
        onError: (e) => console.error(e),
      },
    }
  );

  const [sendEditUsernameMutation] = useMutation(
    gql`
      mutation UserSupportMenuRename(
        $userId: ID!
        $newUsername: String!
        $supportSecret: String!
      ) {
        setUsername(
          userId: $userId
          newUsername: $newUsername
          supportSecret: $supportSecret
        ) {
          id
          username
        }
      }
    `,
    {
      onCompleted: (data) => {
        const updatedUser = data.setUsername;
        toast({
          status: "success",
          title: `Successfully renamed user ${updatedUser.id} to ${updatedUser.username}!`,
        });
      },
    }
  );

  const editUsername = React.useCallback(() => {
    const newUsername = prompt(
      "What should this user's username be?",
      user.username
    );
    if (!newUsername || newUsername === user.username) {
      toast({
        status: "info",
        title: "Got it, no change!",
        description: `User ${user.id}'s username will continue to be ${user.username}.`,
      });
      return;
    }

    sendEditUsernameMutation({
      variables: { userId: user.id, newUsername, supportSecret },
    }).catch((e) => {
      console.error(e);
      toast({
        status: "error",
        title: "Error renaming user.",
        description: "See error details in the console!",
      });
    });
  }, [sendEditUsernameMutation, user.id, user.username, supportSecret, toast]);

  return (
    <Menu>
      {children}
      <Portal>
        <MenuList>
          <MenuItem onClick={editUsername}>Edit username</MenuItem>
          <MenuItem
            as="a"
            href={
              data?.user?.emailForSupportUsers
                ? `mailto:${data.user.emailForSupportUsers}`
                : undefined
            }
            isDisabled={data?.user?.emailForSupportUsers == null}
            sx={{
              '&[aria-disabled="true"]': {
                cursor: loading ? "wait !important" : "not-allowed",
              },
            }}
          >
            Send email
            {error && <> (Error: {error.message})</>}
          </MenuItem>
        </MenuList>
      </Portal>
    </Menu>
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
