import React from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ChevronLeftIcon } from "@chakra-ui/icons";

import useCurrentUser from "./components/useCurrentUser";

import HomeLinkIcon from "./images/home-link-icon.png";
import HomeLinkIcon2x from "./images/home-link-icon@2x.png";

function GlobalHeader() {
  return (
    <Box display="flex" alignItems="center" flexWrap="wrap">
      <HomeLink marginRight="2" />
      <Box marginLeft="auto">
        <UserNavBarSection />
      </Box>
    </Box>
  );
}

function HomeLink(props) {
  const { pathname } = useLocation();
  const isHomePage = pathname === "/";

  return (
    <Box
      as={Link}
      to="/"
      display="flex"
      alignItems="center"
      role="group"
      // HACK: When we're on the homepage, I want the title "Dress to Impress"
      //       to stay visible for transition, but I don't want it to be a
      //       click target. To do this, I constrain the size of the container,
      //       and also remove pointer events from the overflowing children.
      maxWidth={isHomePage ? "32px" : "none"}
      {...props}
    >
      <Box
        flex="0 0 auto"
        display="flex"
        alignItems="center"
        marginRight="2"
        position="relative"
        transition="all 0.2s"
        opacity="0.8"
        _groupHover={{ transform: "scale(1.1)", opacity: "1" }}
        _groupFocus={{ transform: "scale(1.1)", opacity: "1" }}
      >
        <Box
          position="absolute"
          right="100%"
          opacity={isHomePage ? "0" : "1"}
          pointerEvents={isHomePage ? "none" : "all"}
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
      <Box
        flex="0 0 auto"
        fontFamily="Delicious"
        fontWeight="600"
        fontSize="2xl"
        display={{ base: "none", sm: "block" }}
        opacity={isHomePage ? "0" : "1"}
        transition="all 0.2s"
        marginRight="2"
        pointerEvents={isHomePage ? "none" : "all"}
        _groupHover={{ fontWeight: "900" }}
        _groupFocus={{ fontWeight: "900" }}
      >
        Dress to Impress
      </Box>
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
        <NavLinksList>
          {id && (
            <NavLinkItem as={Link} to={`/user/${id}/items`}>
              Items
            </NavLinkItem>
          )}
          <NavLinkItem as={Link} to={`/your-outfits`}>
            Outfits
          </NavLinkItem>
          <NavLinkItem as={Link} to="/modeling">
            Modeling
          </NavLinkItem>
        </NavLinksList>
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

/**
 * Renders the given <NavLinkItem /> children as a dropdown menu or as a list
 * of buttons, depending on the screen size.
 *
 * It actually renders both, and shows/hides them by media query!
 */
function NavLinksList({ children }) {
  return (
    <>
      <Box display={{ base: "block", md: "none" }}>
        <Menu>
          <MenuButton>
            <NavButton icon={<HamburgerIcon />} />
          </MenuButton>
          <MenuList>
            {React.Children.map(children, (c) => (
              <MenuItem {...c.props} />
            ))}
          </MenuList>
        </Menu>
      </Box>
      <HStack spacing="2" display={{ base: "none", md: "flex" }}>
        {React.Children.map(children, (c) => (
          <NavButton {...c.props} />
        ))}
      </HStack>
    </>
  );
}

function NavLinkItem() {
  throw new Error(
    `NavLinkItem should only be rendered in a NavLinksList, which should ` +
      `render it as both a MenuItem or NavButton element. That way, we can ` +
      `show the best layout depending on a CSS media query!`
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

export default GlobalHeader;
