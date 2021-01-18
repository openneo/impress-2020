import React from "react";
import { ClassNames } from "@emotion/react";
import gql from "graphql-tag";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Textarea,
  useColorModeValue,
  useTheme,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useHistory, useLocation } from "react-router-dom";
import { useLazyQuery, useQuery } from "@apollo/client";

import {
  Delay,
  ErrorMessage,
  Heading1,
  Heading2,
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

  React.useEffect(() => {
    if (window.location.href.includes("send-test-error-for-sentry")) {
      throw new Error("Test error for Sentry");
    }
  });

  return (
    <Flex direction="column" align="center" textAlign="center" marginTop="8">
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

  const [petName, setPetName] = React.useState("");

  const [loadPet, { loading }] = useLazyQuery(
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

  const onSubmit = (e) => {
    e.preventDefault();

    loadPet({ variables: { petName } });

    // Start preloading the WardrobePage, too!
    // eslint-disable-next-line no-unused-expressions
    import("./WardrobePage");
  };

  const { brightBackground } = useCommonStyles();
  const inputBorderColor = useColorModeValue("green.600", "green.500");
  const inputBorderColorHover = useColorModeValue("green.400", "green.300");
  const buttonBgColor = useColorModeValue("green.600", "green.300");
  const buttonBgColorHover = useColorModeValue("green.700", "green.200");

  return (
    <ClassNames>
      {({ css }) => (
        <form onSubmit={onSubmit}>
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
      <Heading2 textAlign="left">Latest items</Heading2>
      <NewItemsSectionContent />
    </Box>
  );
}

function NewItemsSectionContent() {
  const { loading, error, data } = useQuery(gql`
    query NewItemsSection {
      newestItems {
        id
        name
        thumbnailUrl
      }
    }
  `);

  if (loading) {
    return (
      <Delay>
        <ItemCardHStack>
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton minHeightNumLines={3} />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
          <SquareItemCardSkeleton />
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

  return (
    <ItemCardHStack>
      {data.newestItems.map((item) => (
        <SquareItemCard key={item.id} item={item} />
      ))}
    </ItemCardHStack>
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
        <Flex position="relative" alignItems="center">
          <Box padding="2" borderRadius="lg" overflow="hidden" flex="0 0 auto">
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
