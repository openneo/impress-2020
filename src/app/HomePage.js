import React from "react";
import { ClassNames } from "@emotion/react";
import gql from "graphql-tag";
import {
  Alert,
  Box,
  Button,
  Center,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link as ChakraLink,
  ListItem,
  Skeleton,
  Textarea,
  Tooltip,
  UnorderedList,
  useColorModeValue,
  useTheme,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ArrowForwardIcon, SearchIcon } from "@chakra-ui/icons";
import { Link, useHistory, useLocation } from "react-router-dom";
import { useLazyQuery, useQuery } from "@apollo/client";

import {
  Delay,
  ErrorMessage,
  Heading1,
  Heading2,
  TestErrorSender,
  useCommonStyles,
  useLocalStorage,
  usePageTitle,
} from "./util";
import OutfitPreview from "./components/OutfitPreview";
import SpeciesColorPicker from "./components/SpeciesColorPicker";
import SquareItemCard, {
  SquareItemCardSkeleton,
} from "./components/SquareItemCard";
import WIPCallout from "./components/WIPCallout";

import HomepageSplashImg from "./images/homepage-splash.png";
import HomepageSplashImg2x from "./images/homepage-splash@2x.png";
import FeedbackXweeImg from "./images/feedback-xwee.png";
import FeedbackXweeImg2x from "./images/feedback-xwee@2x.png";

function HomePage() {
  usePageTitle(null);
  useSupportSetup();

  const [previewState, setPreviewState] = React.useState(null);

  return (
    <Flex direction="column" align="center" textAlign="center" marginTop="8">
      <Alert status="warning" maxWidth="600px">
        <Box>
          <strong>
            The Neopets Metaverse team is no longer licensed to use this
            software.
          </strong>{" "}
          <Box
            as="a"
            href="https://twitter.com/NeopetsDTI/status/1460386400839168001?s=20"
            textDecoration="underline"
          >
            More information available here.
          </Box>{" "}
          Thanks for understanding!
        </Box>
      </Alert>
      <Box height="4" />
      <Box
        width="200px"
        height="200px"
        borderRadius="lg"
        boxShadow="md"
        overflow="hidden"
      >
        <OutfitPreview
          speciesId={previewState?.speciesId}
          colorId={previewState?.colorId}
          pose={previewState?.pose}
          wornItemIds={[]}
          loadingDelayMs={1500}
          placeholder={
            <Box
              as="img"
              src={HomepageSplashImg}
              srcSet={`${HomepageSplashImg} 1x, ${HomepageSplashImg2x} 2x`}
              alt=""
            />
          }
        />
      </Box>
      <Box height="4" />
      <Heading1>Dress to Impress</Heading1>
      <Box fontSize="lg" fontStyle="italic" opacity="0.85" role="doc-subtitle">
        Design and share your Neopets outfits!
      </Box>
      <Box height="8" />
      <StartOutfitForm onChange={setPreviewState} />
      <Box height="4" />
      <Box fontStyle="italic" fontSize="sm">
        or
      </Box>
      <Box height="4" />
      <SubmitPetForm />
      <Box height="16" />
      <NewItemsSection />
      <Box height="16" />
      <FeedbackFormSection />
      <Box height="16" />
      <WIPCallout details="We started building this last year, but, well… what a year 😅 Anyway, this will eventually become the main site, at impress.openneo.net!">
        Maybe we'll rename it to Impress 2021… or maybe not! 🤔
      </WIPCallout>
      <TestErrorSender />
    </Flex>
  );
}

function StartOutfitForm({ onChange }) {
  const history = useHistory();

  const idealPose = React.useMemo(
    () => (Math.random() > 0.5 ? "HAPPY_FEM" : "HAPPY_MASC"),
    []
  );

  const [speciesId, setSpeciesId] = React.useState("1");
  const [colorId, setColorId] = React.useState("8");
  const [isValid, setIsValid] = React.useState(true);
  const [closestPose, setClosestPose] = React.useState(idealPose);

  const onSubmit = (e) => {
    e.preventDefault();

    if (!isValid) {
      return;
    }

    const params = new URLSearchParams({
      species: speciesId,
      color: colorId,
      pose: closestPose,
    });

    history.push(`/outfits/new?${params}`);
  };

  const buttonBgColor = useColorModeValue("green.600", "green.300");
  const buttonBgColorHover = useColorModeValue("green.700", "green.200");

  return (
    <form onSubmit={onSubmit}>
      <Flex>
        <SpeciesColorPicker
          speciesId={speciesId}
          colorId={colorId}
          idealPose={idealPose}
          showPlaceholders
          colorPlaceholderText="Blue"
          speciesPlaceholderText="Acara"
          onChange={(species, color, isValid, closestPose) => {
            setSpeciesId(species.id);
            setColorId(color.id);
            setIsValid(isValid);
            setClosestPose(closestPose);

            if (isValid) {
              onChange({
                speciesId: species.id,
                colorId: color.id,
                pose: closestPose,
              });
            }
          }}
        />
        <Box width="4" />
        <Button
          type="submit"
          colorScheme="green"
          disabled={!isValid}
          backgroundColor={buttonBgColor}
          _hover={{ backgroundColor: buttonBgColorHover }}
        >
          Start
        </Button>
      </Flex>
    </form>
  );
}

function SubmitPetForm() {
  const history = useHistory();
  const theme = useTheme();
  const toast = useToast();
  const location = useLocation();

  const [petName, setPetName] = React.useState("");

  const [loadPetQuery, { loading }] = useLazyQuery(
    gql`
      query SubmitPetForm($petName: String!) {
        petOnNeopetsDotCom(petName: $petName) {
          color {
            id
          }
          species {
            id
          }
          pose
          items {
            id
          }
        }
      }
    `,
    {
      fetchPolicy: "network-only",
      onCompleted: (data) => {
        if (!data) return;

        const { species, color, pose, items } = data.petOnNeopetsDotCom;
        const params = new URLSearchParams({
          name: petName,
          species: species.id,
          color: color.id,
          pose,
        });
        for (const item of items) {
          params.append("objects[]", item.id);
        }
        history.push(`/outfits/new?${params}`);
      },
      onError: () => {
        toast({
          title: "We couldn't load that pet, sorry 😓",
          description: "Is it spelled correctly?",
          status: "error",
        });
      },
    }
  );

  const loadPet = React.useCallback(
    (petName) => {
      loadPetQuery({ variables: { petName } });

      // Start preloading the WardrobePage, too!
      // eslint-disable-next-line no-unused-expressions
      import("./WardrobePage").catch((e) => {
        // Let's just let this slide, because it's a preload error. Critical
        // failures will happen elsewhere, and trigger reloads!
        console.error(e);
      });
    },
    [loadPetQuery]
  );

  // If the ?loadPet= query param is provided, auto-load the pet immediately.
  // This isn't used in-app, but is a helpful hook for things like link-ins and
  // custom search engines. (I feel like a route or a different UX would be
  // better, but I don't really know enough to commit to one… let's just keep
  // this simple for now, I think. We might change this someday!)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const petName = params.get("loadPet");
    if (petName) {
      setPetName(petName);
      loadPet(petName);
    }
  }, [location, loadPet]);

  const { brightBackground } = useCommonStyles();
  const inputBorderColor = useColorModeValue("green.600", "green.500");
  const inputBorderColorHover = useColorModeValue("green.400", "green.300");
  const buttonBgColor = useColorModeValue("green.600", "green.300");
  const buttonBgColorHover = useColorModeValue("green.700", "green.200");

  return (
    <ClassNames>
      {({ css }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadPet(petName);
          }}
        >
          <Flex>
            <Input
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              isDisabled={loading}
              placeholder="Enter a pet's name"
              aria-label="Enter a pet's name"
              borderColor={inputBorderColor}
              _hover={{ borderColor: inputBorderColorHover }}
              background={brightBackground}
              boxShadow="md"
              width="14em"
              className={css`
                &::placeholder {
                  color: ${theme.colors.gray["500"]};
                }
              `}
            />
            <Box width="4" />
            <Button
              type="submit"
              colorScheme="green"
              isDisabled={!petName}
              isLoading={loading}
              backgroundColor={buttonBgColor} // for AA contrast
              _hover={{ backgroundColor: buttonBgColorHover }}
            >
              Start
            </Button>
          </Flex>
        </form>
      )}
    </ClassNames>
  );
}

function NewItemsSection() {
  return (
    <Box width="100%">
      <Flex align="center" wrap="wrap">
        <Heading2 flex="0 0 auto" marginRight="2" textAlign="left">
          Latest items
        </Heading2>
        <Box flex="0 0 auto" marginLeft="auto" width="48">
          <ItemsSearchField />
        </Box>
      </Flex>
      <NewItemsSectionContent />
    </Box>
  );
}

function ItemsSearchField() {
  const [query, setQuery] = React.useState("");
  const { brightBackground } = useCommonStyles();
  const history = useHistory();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (query) {
          history.push(`/items/search/${encodeURIComponent(query)}`);
        }
      }}
    >
      <InputGroup size="sm">
        <InputLeftElement>
          <Box as={Link} to="/items/search" display="flex">
            <SearchIcon color="gray.400" />
          </Box>
        </InputLeftElement>
        <Input
          value={query}
          backgroundColor={query ? brightBackground : "transparent"}
          _focus={{ backgroundColor: brightBackground }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all items…"
          borderRadius="full"
        />
        <InputRightElement>
          <IconButton
            type="submit"
            variant="ghost"
            icon={<ArrowForwardIcon />}
            aria-label="Search"
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
    </form>
  );
}

function NewItemsSectionContent() {
  const { loading, error, data } = useQuery(
    gql`
      query NewItemsSection {
        newestItems {
          id
          name
          thumbnailUrl
          isNc
          isPb
          speciesThatNeedModels {
            id
            name
          }
          babySpeciesThatNeedModels: speciesThatNeedModels(colorId: "6") {
            id
            name
          }
          maraquanSpeciesThatNeedModels: speciesThatNeedModels(colorId: "44") {
            id
            name
          }
          mutantSpeciesThatNeedModels: speciesThatNeedModels(colorId: "46") {
            id
            name
          }
          compatibleBodiesAndTheirZones {
            body {
              id
              representsAllBodies
              species {
                id
                name
              }
              canonicalAppearance {
                id
                color {
                  id
                  name
                  isStandard
                }
              }
            }
          }
        }
      }
    `
  );

  const { data: userData } = useQuery(
    gql`
      query NewItemsSection_UserData {
        newestItems {
          id
          currentUserOwnsThis
          currentUserWantsThis
        }
      }
    `,
    {
      context: { sendAuth: true },
      onError: (e) =>
        console.error("Error loading NewItemsSection_UserData, skipping:", e),
    }
  );

  if (loading) {
    const footer = (
      <Center fontSize="xs" height="1.5em">
        <Skeleton height="4px" width="100%" />
      </Center>
    );
    return (
      <Delay>
        <ItemCardHStack>
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} minHeightNumLines={3} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
          <SquareItemCardSkeleton footer={footer} />
        </ItemCardHStack>
      </Delay>
    );
  }

  if (error) {
    return (
      <ErrorMessage>
        Couldn't load new items. Check your connection and try again!
      </ErrorMessage>
    );
  }

  // Merge in the results from the user data query, if available.
  const newestItems = data.newestItems.map((item) => {
    const itemUserData =
      (userData?.newestItems || []).find((i) => i.id === item.id) || {};
    return { ...item, ...itemUserData };
  });

  return (
    <ItemCardHStack>
      {newestItems.map((item) => (
        <SquareItemCard
          key={item.id}
          item={item}
          footer={<ItemModelingSummary item={item} />}
        />
      ))}
    </ItemCardHStack>
  );
}

function ItemModelingSummary({ item }) {
  // NOTE: To test this logic, I like to swap out `newestItems` in the query:
  //       `newestItems: items(ids: ["81546", "35082", "75149", "81797", "58741", "78953", "82427", "82727", "82726"])`

  const numModelsNeeded =
    item.speciesThatNeedModels.length +
    item.babySpeciesThatNeedModels.length +
    item.maraquanSpeciesThatNeedModels.length +
    item.mutantSpeciesThatNeedModels.length;

  if (numModelsNeeded > 0) {
    return (
      <Box fontSize="xs" fontStyle="italic" fontWeight="600" opacity="0.8">
        Need {numModelsNeeded} models
      </Box>
    );
  }

  const bodies = item.compatibleBodiesAndTheirZones.map((bz) => bz.body);

  const fitsAllPets = bodies.some((b) => b.representsAllBodies);
  if (fitsAllPets) {
    return (
      <Box fontSize="xs" fontStyle="italic" opacity="0.8">
        Fits all pets
      </Box>
    );
  }

  // HACK: The Maraquan Mynci and the Blue Mynci have the same body, so to test
  //       whether something is *meant* for standard colors, we check for more
  //       than
  const standardBodies = bodies.filter(
    (b) => b.canonicalAppearance.color.isStandard
  );
  const isMeantForStandardBodies = standardBodies.length >= 2;

  const colors = bodies.map((b) => b.canonicalAppearance.color);
  const specialColor = colors.find((c) => !c.isStandard);
  const hasSpecialColorOnly = !isMeantForStandardBodies && specialColor != null;

  if (hasSpecialColorOnly && bodies.length === 1) {
    return (
      <Box fontSize="xs" fontStyle="italic" opacity="0.8">
        {specialColor.name} {bodies[0].species.name} only
      </Box>
    );
  }

  if (bodies.length === 1) {
    return (
      <Box fontSize="xs" fontStyle="italic" opacity="0.8">
        {bodies[0].species.name} only
      </Box>
    );
  }

  if (hasSpecialColorOnly) {
    return (
      <Box fontSize="xs" fontStyle="italic" opacity="0.8">
        {specialColor.name} only
      </Box>
    );
  }

  return (
    <Box fontSize="xs" fontStyle="italic" opacity="0.8">
      Fits all{" "}
      <Tooltip
        label={
          <Box fontSize="xs" textAlign="center">
            Not special colors like Baby, Maraquan, or Mutant.
          </Box>
        }
      >
        <Box display="inline-block" borderBottom="1px dotted" tabIndex="0">
          basic
        </Box>
      </Tooltip>{" "}
      pets
    </Box>
  );
}

function ItemCardHStack({ children }) {
  return (
    // HACK: I wanted to just have an HStack with overflow:auto and internal
    //       paddingX, but the right-hand-side padding didn't seem to work
    //       during overflow. This was the best I could come up with...
    <Flex maxWidth="100%" overflow="auto" paddingY="4">
      <Box minWidth="2" />
      <HStack align="flex-start" spacing="4">
        {children}
      </HStack>
      <Box minWidth="2" />
    </Flex>
  );
}

function FeedbackFormSection() {
  const { brightBackground } = useCommonStyles();
  const pitchBorderColor = useColorModeValue("gray.300", "green.400");
  const formBorderColor = useColorModeValue("gray.300", "blue.400");

  return (
    <VStack spacing="4" alignItems="stretch">
      <FeedbackFormContainer
        background={brightBackground}
        borderColor={pitchBorderColor}
      >
        <Flex>
          <Box
            padding="2"
            borderRadius="lg"
            overflow="hidden"
            flex="0 0 auto"
            marginTop="4"
          >
            <Box
              as="img"
              src={FeedbackXweeImg}
              srcSet={`${FeedbackXweeImg} 1x, ${FeedbackXweeImg2x} 2x`}
              height="90px"
              width="90px"
              opacity="0.9"
              alt=""
            />
          </Box>
          <FeedbackFormPitch />
        </Flex>
      </FeedbackFormContainer>
      <FeedbackFormContainer
        borderColor={formBorderColor}
        image={
          <Box
            as="img"
            src={FeedbackXweeImg}
            srcSet={`${FeedbackXweeImg} 1x, ${FeedbackXweeImg2x} 2x`}
            height="90px"
            width="90px"
            opacity="0.9"
            alt=""
          />
        }
      >
        <FeedbackForm />
      </FeedbackFormContainer>
    </VStack>
  );
}

function FeedbackFormContainer({ background, borderColor, children }) {
  return (
    <Box
      as="section"
      background={background}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="lg"
      maxWidth="500px"
      paddingLeft="2"
      paddingRight="4"
      paddingY="2"
      transition="all 0.2s"
    >
      {children}
    </Box>
  );
}

function FeedbackFormPitch() {
  return (
    <Flex direction="column" textAlign="left" opacity="0.9">
      <Box as="header">Hi friends! Welcome to the beta!</Box>
      <Box as="p" fontSize="sm">
        This is the new Dress to Impress! It's ready for the future, and it even
        works great on mobile! More coming soon!
      </Box>
      <Flex direction={{ base: "column", sm: "row" }}>
        <Box
          as="section"
          fontSize="sm"
          marginY="2"
          flex={{ base: "0 0 auto", sm: "0 1 50%" }}
        >
          <Box as="h3" fontWeight="600">
            New updates (Sep 30)
          </Box>
          <UnorderedList>
            <ListItem>Search bar on item page</ListItem>
            <ListItem>Remove items from lists</ListItem>
            <ListItem>
              <ChakraLink
                href="https://twitter.com/NeopetsDTI"
                textDecoration="underline"
              >
                See more on Twitter!
              </ChakraLink>
            </ListItem>
          </UnorderedList>
        </Box>
        <Box width="2" />
        <Box
          as="section"
          fontSize="sm"
          marginY="2"
          flex={{ base: "0 0 auto", sm: "0 1 50%" }}
        >
          <Box as="h3" fontWeight="600">
            Coming soon
          </Box>
          <UnorderedList>
            <ListItem>Better outfit editing on large screens</ListItem>
            <ListItem>Item list editing</ListItem>
            <ListItem>
              …a lot of little things{" "}
              <span role="img" aria-label="Sweat smile emoji">
                😅
              </span>
            </ListItem>
          </UnorderedList>
        </Box>
      </Flex>
      <Box fontSize="sm" marginTop="1">
        ↓ Got ideas? Send them to us, please!{" "}
        <span role="img" aria-label="Sparkle heart emoji">
          💖
        </span>
      </Box>
    </Flex>
  );
}

function FeedbackForm() {
  const [content, setContent] = React.useState("");
  const [email, setEmail] = useLocalStorage("DTIFeedbackFormEmail", "");
  const [isSending, setIsSending] = React.useState(false);
  const toast = useToast();

  const onSubmit = React.useCallback(
    (e) => {
      e.preventDefault();

      fetch("/api/sendFeedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, email }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`/api/sendFeedback returned status ${res.status}`);
          }

          setIsSending(false);
          setContent("");
          toast({
            status: "success",
            title: "Got it! We'll take a look soon.",
            description:
              "Thanks for helping us get better! Best wishes to you and your " +
              "pets!!",
          });
        })
        .catch((e) => {
          setIsSending(false);
          console.error(e);
          toast({
            status: "warning",
            title: "Oops, we had an error sending this, sorry!",
            description:
              "We'd still love to hear from you! Please reach out to " +
              "matchu@openneo.net with whatever's on your mind. Thanks and " +
              "enjoy the site!",
            duration: null,
            isClosable: true,
          });
        });

      setIsSending(true);
    },
    [content, email, toast]
  );

  const { brightBackground } = useCommonStyles();

  return (
    <Box
      as="form"
      // We use Grid here rather than our usual Flex, mainly so the fields will
      // tab in the correct order!
      display="grid"
      gridTemplateAreas={`"email send" "content content"`}
      gridTemplateColumns="1fr auto"
      gridGap="2"
      onSubmit={onSubmit}
    >
      <Input
        type="email"
        placeholder="Email address (optional)"
        size="sm"
        gridArea="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        background={brightBackground}
      />
      <Textarea
        size="sm"
        placeholder={"I love…\nI wish…\nNext, you should add…"}
        gridArea="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        background={brightBackground}
      />
      <Button
        type="submit"
        size="sm"
        colorScheme="blue"
        gridArea="send"
        isDisabled={content.trim().length === 0}
        isLoading={isSending}
      >
        Send
      </Button>
    </Box>
  );
}

/**
 * useSupportSetup helps our support staff get set up with special access.
 * If you provide ?supportSecret=... in the URL, we'll save it in a cookie and
 * pop up a toast!
 *
 * This doesn't guarantee the secret is correct, of course! We don't bother to
 * check that here; the server will reject requests from bad support secrets.
 * And there's nothing especially secret in the support UI, so it's okay if
 * other people know about the tools and poke around a powerless interface!
 */
function useSupportSetup() {
  const location = useLocation();
  const toast = useToast();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const supportSecret = params.get("supportSecret");
    const existingSupportSecret = localStorage.getItem("supportSecret");

    if (supportSecret && supportSecret !== existingSupportSecret) {
      localStorage.setItem("supportSecret", supportSecret);

      toast({
        title: "Support secret saved!",
        description:
          `You should now see special Support UI across the site. ` +
          `Thanks for your help! 💖`,
        status: "success",
        duration: 10000,
        isClosable: true,
      });
    } else if (supportSecret === "") {
      localStorage.removeItem("supportSecret");

      toast({
        title: "Support secret deleted.",
        description: `The Support UI will now stop appearing on this device.`,
        status: "success",
        duration: 10000,
        isClosable: true,
      });
    }
  }, [location, toast]);
}

export default HomePage;
