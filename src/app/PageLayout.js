import React from "react";
import { Box, Button, HStack, IconButton, useColorMode } from "@chakra-ui/core";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronLeftIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";

import useCurrentUser from "./components/useCurrentUser";

// TODO: Replace with lower-res version
import HomepageSplashImg from "../images/homepage-splash.png";

function PageLayout({ children, hideHomeLink }) {
  return (
    <Box padding="6" paddingTop="3" maxWidth="800px" margin="0 auto">
      <Box
        width="100%"
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        marginBottom="6"
      >
        {!hideHomeLink && <HomeLink />}
        <Box flex="1 0 0" />
        <UserLoginLogout />
      </Box>
      {children}
    </Box>
  );
}

function HomeLink() {
  return (
    <Box
      as={Link}
      to="/"
      display="flex"
      alignItems="center"
      position="relative"
      role="group"
      transition="transform 0.2s"
      _hover={{ transform: "scale(1.1)" }}
      _focus={{ outline: "0", transform: "scale(1.1)" }}
    >
      <Box position="absolute" right="100%">
        <ChevronLeftIcon />
      </Box>
      <Box
        as="img"
        src={HomepageSplashImg}
        alt=""
        height="2em"
        width="2em"
        borderRadius="lg"
        boxShadow="md"
      />
      <Box
        height="2em"
        width="2em"
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        borderRadius="lg"
        transition="border 0.2s"
        _groupFocus={{ border: "2px", borderColor: "green.400" }}
      />
    </Box>
  );
}

function UserLoginLogout() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { id, username } = useCurrentUser();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <HStack align="center" spacing="2">
        {username && <Box fontSize="sm">Hi, {username}!</Box>}
        <ColorModeToggleButton />
        {id && (
          <Button
            as={Link}
            to={`/user/${id}/items`}
            size="sm"
            variant="outline"
          >
            Items
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => logout({ returnTo: window.location.origin })}
        >
          Log out
        </Button>
      </HStack>
    );
  } else {
    return (
      <HStack align="center" spacing="2">
        <ColorModeToggleButton />
        <Button size="sm" variant="outline" onClick={() => loginWithRedirect()}>
          Log in
        </Button>
      </HStack>
    );
  }
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
      variant="outline"
      size="sm"
    />
  );
}

export default PageLayout;
