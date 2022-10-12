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
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { ChevronLeftIcon } from "@chakra-ui/icons";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

import useCurrentUser, {
  useAuthModeFeatureFlag,
  useLogout,
} from "./components/useCurrentUser";
import HomeLinkIcon from "./images/home-link-icon.png";
import { useAuth0 } from "@auth0/auth0-react";

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
  const { pathname } = useRouter();
  const isHomePage = pathname === "/";

  return (
    <Link href="/" passHref>
      <Box
        as="a"
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
          <Box height="32px" borderRadius="lg" boxShadow="md" overflow="hidden">
            <Image
              src={HomeLinkIcon}
              alt=""
              width={32}
              height={32}
              layout="fixed"
            />
          </Box>
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
    </Link>
  );
}

function UserNavBarSection() {
  const { isLoading, isLoggedIn, id, username } = useCurrentUser();

  if (isLoading) {
    return null;
  }

  if (isLoggedIn) {
    return (
      <HStack align="center" spacing="2">
        {username && (
          <Box fontSize="sm" textAlign="right">
            Hi, {username}!
          </Box>
        )}
        <NavLinksList>
          {id && (
            <Link href={`/user/${id}/lists`} passHref>
              <NavLinkItem as="a">Lists</NavLinkItem>
            </Link>
          )}
          <Link href={`/your-outfits`} passHref>
            <NavLinkItem as="a">Outfits</NavLinkItem>
          </Link>
          <LogoutButton />
        </NavLinksList>
      </HStack>
    );
  } else {
    return (
      <HStack align="center" spacing="2">
        <LoginButton />
      </HStack>
    );
  }
}

function LoginButton() {
  const [authMode] = useAuthModeFeatureFlag();
  const { loginWithRedirect } = useAuth0();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const onClick = () => {
    if (authMode === "auth0") {
      loginWithRedirect();
    } else if (authMode === "db") {
      onOpen();
    } else {
      throw new Error(`unexpected auth mode: ${JSON.stringify(authMode)}`);
    }
  };

  return (
    <>
      <NavButton onClick={onClick}>Log in</NavButton>
      {authMode === "db" && (
        <React.Suspense fallback="">
          <LoginModal isOpen={isOpen} onClose={onClose} />
        </React.Suspense>
      )}
    </>
  );
}

// I don't wanna load all these Chakra components as part of the bundle for
// every single page. Split it out!
const LoginModal = React.lazy(() => import("./components/LoginModal"));

function LogoutButton() {
  const toast = useToast();
  const [logout, { loading, error }] = useLogout();

  React.useEffect(() => {
    if (error != null) {
      console.error(error);
      toast({
        title: "Oops, there was an error logging you out.",
        description: "Reload the page and try again? Sorry about that!",
        status: "warning",
        duration: null,
        isClosable: true,
      });
    }
  }, [error, toast]);

  return (
    <NavLinkItem
      onClick={() => logout({ returnTo: window.location.origin })}
      // NOTE: The `isLoading` prop will only be relevant in the desktop case,
      //       where this renders as a NavButton. In the mobile case, the menu
      //       doesn't have a loading UI, and it closes when you click the
      //       button anyway. Not ideal, but fine for a simple quick action!
      isLoading={loading}
    >
      Log out
    </NavLinkItem>
  );
}

const NavLinkTypeContext = React.createContext("button");

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
            <NavLinkTypeContext.Provider value="menu">
              {children}
            </NavLinkTypeContext.Provider>
          </MenuList>
        </Menu>
      </Box>
      <HStack spacing="2" display={{ base: "none", md: "flex" }}>
        <NavLinkTypeContext.Provider value="button">
          {children}
        </NavLinkTypeContext.Provider>
      </HStack>
    </>
  );
}

function NavLinkItem(props) {
  const navLinkType = React.useContext(NavLinkTypeContext);
  if (navLinkType === "button") {
    return <NavButton {...props} />;
  } else if (navLinkType === "menu") {
    return <MenuItem {...props} />;
  } else {
    throw new Error(`unexpected navLinkType: ${JSON.stringify(navLinkType)}`);
  }
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
