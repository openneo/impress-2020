import React from "react";
import { Box, Button, IconButton, useColorMode } from "@chakra-ui/core";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

import useCurrentUser from "./components/useCurrentUser";

function PageLayout({ children }) {
  return (
    <Box padding="6" paddingTop="3">
      <Box width="100%" display="flex" alignItems="center" marginBottom="6">
        <ColorModeToggleButton />
        <Box flex="1 0 0" />
        <UserLoginLogout />
      </Box>
      {children}
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
      <Box display="flex" alignItems="center">
        {username && <Box fontSize="sm">Hi, {username}!</Box>}
        {id && (
          <Button
            as={Link}
            to={`/user/${id}/items`}
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

export default PageLayout;
