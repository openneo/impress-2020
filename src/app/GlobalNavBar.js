import React from "react";
import { Box, Button, HStack, IconButton } from "@chakra-ui/core";
import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

import useCurrentUser from "./components/useCurrentUser";

import HomeLinkIcon from "../images/home-link-icon.png";
import HomeLinkIcon2x from "../images/home-link-icon@2x.png";

function GlobalNavBar() {
  const { pathname } = useLocation();
  const isHomePage = pathname === "/";

  return (
    <Box display="flex" alignItems="center" flexWrap="wrap">
      <HomeLink showArrow={!isHomePage} marginRight="2" />
      <Box
        display="flex"
        alignItems="center"
        opacity={isHomePage ? "0" : "1"}
        transition="0.2s opacity"
      >
        <DressToImpressTitle />
      </Box>
      <Box marginLeft="auto">
        <UserNavBarSection />
      </Box>
    </Box>
  );
}

function HomeLink({ showArrow, ...props }) {
  return (
    <Box
      as={Link}
      to="/"
      display="flex"
      alignItems="center"
      position="relative"
      role="group"
      transition="all 0.2s"
      opacity="0.8"
      _hover={{ transform: "scale(1.1)", opacity: "1" }}
      _focus={{ transform: "scale(1.1)", opacity: "1" }}
      {...props}
    >
      <Box
        position="absolute"
        right="100%"
        opacity={showArrow ? "1" : "0"}
        transform={showArrow ? "none" : "translateX(3px)"}
        transition="all 0.2s"
      >
        <ChevronLeftIcon />
      </Box>
      <Box
        as="img"
        src={HomeLinkIcon}
        srcSet={`${HomeLinkIcon} 1x, ${HomeLinkIcon2x} 2x`}
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
      />
    </Box>
  );
}

function UserNavBarSection() {
  const { isLoading, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { id, username } = useCurrentUser();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <HStack align="center" spacing="2">
        {username && (
          <Box fontSize="sm" textAlign="right">
            Hi, {username}!
          </Box>
        )}
        {id && (
          <NavButton as={Link} to={`/user/${id}/items`}>
            Items
          </NavButton>
        )}
        <NavButton as={Link} to="/modeling">
          Modeling
        </NavButton>
        <NavButton onClick={() => logout({ returnTo: window.location.origin })}>
          Log out
        </NavButton>
      </HStack>
    );
  } else {
    return (
      <HStack align="center" spacing="2">
        <NavButton as={Link} to="/modeling">
          Modeling
        </NavButton>
        <NavButton onClick={() => loginWithRedirect()}>Log in</NavButton>
      </HStack>
    );
  }
}

function DressToImpressTitle(props) {
  return (
    <Box
      fontFamily="Delicious"
      fontWeight="bold"
      fontSize="2xl"
      display={{ base: "none", sm: "block" }}
      {...props}
    >
      Dress to Impress
    </Box>
  );
}

const NavButton = React.forwardRef(({ icon, ...props }, ref) => {
  const Component = icon ? IconButton : Button;

  // Opacity is in a separate Box, to avoid overriding the built-in Button
  // hover/focus states.
  return (
    <Box
      opacity="0.8"
      _hover={{ opacity: "1" }}
      _focusWithin={{ opacity: "1" }}
    >
      <Component size="sm" variant="outline" icon={icon} ref={ref} {...props} />
    </Box>
  );
});

export default GlobalNavBar;
