import React from "react";
import { css } from "emotion";
import gql from "graphql-tag";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Textarea,
  useColorModeValue,
  useTheme,
  useToast,
} from "@chakra-ui/core";
import { CloseIcon } from "@chakra-ui/icons";
import { useHistory, useLocation } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";

import { Heading1, usePageTitle } from "./util";
import OutfitPreview from "./components/OutfitPreview";

import HomepageSplashImg from "../images/homepage-splash.png";
import HomepageSplashImg2x from "../images/homepage-splash@2x.png";
import SpeciesColorPicker from "./components/SpeciesColorPicker";

function HomePage() {
  usePageTitle(null);
  useSupportSetup();

  const [previewState, setPreviewState] = React.useState(null);

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
      <FeedbackFormSection />
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

  const inputBorderColor = useColorModeValue("green.600", "green.500");
  const inputBorderColorHover = useColorModeValue("green.400", "green.300");
  const buttonBgColor = useColorModeValue("green.600", "green.300");
  const buttonBgColorHover = useColorModeValue("green.700", "green.200");

  return (
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
  );
}

function FeedbackFormSection() {
  const [isOpen, setIsOpen] = React.useState(false);
  const borderColor = useColorModeValue("gray.300", "blue.400");

  const openButtonRef = React.useRef(null);
  const emailFieldRef = React.useRef(null);

  React.useLayoutEffect(() => {
    if (isOpen) {
      if (emailFieldRef.current) {
        emailFieldRef.current.focus();
      }
    } else {
      if (openButtonRef.current) {
        openButtonRef.current.focus();
      }
    }
  }, [isOpen]);

  return (
    <Flex
      as="section"
      position="relative"
      alignItems="center"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="lg"
      maxWidth="500px"
      paddingLeft="2"
      paddingRight="4"
      paddingY="2"
      cursor={!isOpen && "pointer"}
      onClick={!isOpen && (() => setIsOpen(true))}
    >
      <Box
        padding="2"
        background="white"
        borderRadius="lg"
        overflow="hidden"
        flex="0 0 auto"
      >
        <Box
          as="img"
          // TODO: Bundle this after we're done prototyping!
          src="http://images.neopets.com/new_shopkeepers/1524.gif"
          height="90px"
          width="90px"
          opacity="0.9"
        />
      </Box>
      <Box
        display="grid"
        gridTemplateAreas="the-single-area"
        alignItems="center"
        marginLeft="2"
      >
        <Box
          position="absolute"
          left="1"
          top="1"
          aria-hidden={!isOpen}
          isDisabled={!isOpen}
          opacity={isOpen ? "0.5" : "0"}
          pointerEvents={isOpen ? "all" : "none"}
          transition="opacity 0.25s"
        >
          <IconButton
            aria-label="Close"
            icon={<CloseIcon />}
            size="xs"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            isDisabled={!isOpen}
          />
        </Box>
        <Box
          gridArea="the-single-area"
          aria-hidden={isOpen}
          opacity={isOpen ? "0" : "1"}
          pointerEvents={isOpen ? "none" : "all"}
          transition="opacity 0.25s"
        >
          <FeedbackFormPitch
            isDisabled={isOpen}
            onClick={() => setIsOpen(true)}
            openButtonRef={openButtonRef}
          />
        </Box>
        <Box
          gridArea="the-single-area"
          aria-hidden={!isOpen}
          opacity={isOpen ? "1" : "0"}
          pointerEvents={isOpen ? "all" : "none"}
          transition="opacity 0.25s"
        >
          <FeedbackForm
            isDisabled={!isOpen}
            onClose={() => setIsOpen(false)}
            emailFieldRef={emailFieldRef}
          />
        </Box>
      </Box>
    </Flex>
  );
}

function FeedbackFormPitch({ isDisabled, onClick, openButtonRef }) {
  return (
    <Flex direction="column" textAlign="left" opacity="0.9">
      <Box as="header">Hi friends! Welcome to the beta!</Box>
      <Box as="p" fontSize="sm">
        This is the new Dress to Impress! It's ready for the future, and it even
        works great on mobile! More coming soon!
      </Box>
      <Box
        as="button"
        alignSelf="flex-end"
        fontSize="sm"
        marginTop="1"
        opacity="0.8"
        textDecoration="underline"
        disabled={isDisabled}
        onClick={onClick}
        ref={openButtonRef}
      >
        Tell us what you think →
      </Box>
    </Flex>
  );
}

function FeedbackForm({ isDisabled, onClose, emailFieldRef }) {
  const [content, setContent] = React.useState("");
  const toast = useToast();

  return (
    <Box
      as="form"
      // We use Grid here rather than our usual Flex, mainly so the fields will
      // tab in the correct order!
      display="grid"
      gridTemplateAreas={`"email send" "content content"`}
      gridTemplateColumns="1fr auto"
      gridGap="2"
      onSubmit={(e) => {
        e.preventDefault();
        toast({
          title: "Ah, well, this form isn't hooked up yet!",
          description:
            "That's coming soon! 😅 For now, please send an email to matchu@openneo.net. Sorry and thanks!",
          duration: null,
          isClosable: true,
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
          e.stopPropagation();
        }
      }}
    >
      <Input
        type="email"
        placeholder="Email address (optional)"
        size="sm"
        gridArea="email"
        ref={emailFieldRef}
        isDisabled={isDisabled}
      />
      <Textarea
        size="sm"
        placeholder={"I love…\nI wish…\nNext, you should add…"}
        gridArea="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        isDisabled={isDisabled}
      />
      <Button
        type="submit"
        size="sm"
        colorScheme="blue"
        gridArea="send"
        isDisabled={isDisabled || content.trim().length === 0}
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
