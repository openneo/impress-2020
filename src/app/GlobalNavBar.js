import React from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useBreakpointValue,
  useColorMode,
} from "@chakra-ui/core";
import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  ChevronLeftIcon,
  HamburgerIcon,
  MoonIcon,
  SunIcon,
} from "@chakra-ui/icons";

import useCurrentUser from "./components/useCurrentUser";

import HomeLinkIcon from "../images/home-link-icon.png";
import HomeLinkIcon2x from "../images/home-link-icon@2x.png";

function GlobalNavBar() {
  const navStyle = useBreakpointValue({ base: "menu", md: "buttons" });

  return (
    <Box display="flex" alignItems="center" flexWrap="wrap">
      <HStack alignItems="center" spacing="2" marginRight="4">
        <HomeLink />
        {navStyle === "menu" && <NavMenu />}
        {navStyle === "buttons" && <NavButtons />}
      </HStack>
      <Box marginLeft="auto">
        <UserNavBarSection />
      </Box>
    </Box>
  );
}

function HomeLink() {
  const { pathname } = useLocation();
  const isHomePage = pathname === "/";

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
    >
      <Box
        position="absolute"
        right="100%"
        opacity={isHomePage ? "0" : "1"}
        transform={isHomePage ? "translateX(3px)" : "none"}
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
          <NavButton
            as={Link}
            to={`/user/${id}/items`}
            size="sm"
            variant="outline"
          >
            Items
          </NavButton>
        )}
        <NavButton onClick={() => logout({ returnTo: window.location.origin })}>
          Log out
        </NavButton>
      </HStack>
    );
  } else {
    return <NavButton onClick={() => loginWithRedirect()}>Log in</NavButton>;
  }
}

function NavMenu() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Menu>
      <MenuButton as={NavButton} icon={<HamburgerIcon />} />
      <MenuList fontSize="sm">
        <MenuItem as={Link} to="/modeling">
          Modeling
        </MenuItem>
        <MenuItem onClick={toggleColorMode}>
          {colorMode === "light" ? (
            <Box display="flex" alignItems="center">
              <Box>Dark mode</Box>
              <MoonIcon marginLeft="2" />
            </Box>
          ) : (
            <Box display="flex" alignItems="center">
              <Box>Light mode</Box>
              <SunIcon marginLeft="2" />
            </Box>
          )}
        </MenuItem>
      </MenuList>
    </Menu>
  );
}

function NavButtons() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <>
      <NavButton as={Link} to="/modeling">
        Modeling
      </NavButton>
      <NavButton
        size="sm"
        variant="outline"
        aria-label={
          colorMode === "light" ? "Switch to dark mode" : "Switch to light mode"
        }
        icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
      />
    </>
  );
}

const NavButton = React.forwardRef(({ icon, ...props }, ref) => {
  const Component = icon ? IconButton : Button;

  // Opacity is in a separate Box, to avoid overriding the built-in Button
  // hover/focus states.
  return (
    <Box opacity="0.8" _hover={{ opacity: "1" }} _focus={{ opacity: "1" }}>
      <Component size="sm" variant="outline" icon={icon} ref={ref} {...props} />
    </Box>
  );
});

export default GlobalNavBar;
