import React from "react";
import { css } from "emotion";
import gql from "graphql-tag";
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  useColorMode,
  useColorModeValue,
  useTheme,
  useToast,
} from "@chakra-ui/core";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { useHistory, useLocation } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import { useAuth0 } from "@auth0/auth0-react";

import { Heading1, usePageTitle } from "./util";
import OutfitPreview from "./components/OutfitPreview";

import HomepageSplashImg from "../images/homepage-splash.png";
import HomepageSplashImg2x from "../images/homepage-splash@2x.png";
import SpeciesColorPicker from "./components/SpeciesColorPicker";

function HomePage() {
  usePageTitle("Dress to Impress");
  useSupportSetup();

  const [previewState, setPreviewState] = React.useState(null);

  return (
    <Flex direction="column" p="6" pt="3" align="center" textAlign="center">
      <Box width="100%" display="flex" alignItems="center">
        <ColorModeToggleButton />
        <Box flex="1 0 0" />
        <UserLoginLogout />
      </Box>
      <Box height="8" />
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
          loadingDelay="1.5s"
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
      <Box height="8" />
      <StartOutfitForm onChange={setPreviewState} />
      <Box height="4" />
      <Box fontStyle="italic" fontSize="sm">
        or
      </Box>
      <Box height="4" />
      <SubmitPetForm />
    </Flex>
  );
}

function UserLoginLogout() {
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();

  if (isAuthenticated) {
    // NOTE: Users created correctly should have these attributes... but I'm
    //       coding defensively, because third-party integrations are always a
    //       bit of a thing, and I don't want failures to crash us!
    const username = user["https://oauth.impress-2020.openneo.net/username"];
    const id = user.sub?.match(/^auth0\|impress-([0-9]+)$/)?.[1];

    return (
      <Box display="flex" alignItems="center">
        {username && <Box fontSize="sm">Hi, {username}!</Box>}
        {id && (
          <Button
            as="a"
            href={`https://impress.openneo.net/user/${id}-${username}/closet`}
            size="sm"
            variant="outline"
            marginLeft="2"
          >
            Items
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => logout({ returnTo: window.location.origin })}
          marginLeft="2"
        >
          Log out
        </Button>
      </Box>
    );
  } else {
    return (
      <Button size="sm" variant="outline" onClick={() => loginWithRedirect()}>
        Log in
      </Button>
    );
  }
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

function ColorModeToggleButton() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <IconButton
      aria-label={
        colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
      variant="ghost"
    />
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
